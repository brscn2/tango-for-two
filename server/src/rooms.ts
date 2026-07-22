import { customAlphabet } from 'nanoid';
import {
  cloneGrid, generatePuzzle, isValidSolution, solve, DEFAULT_SYMBOLS, SIZE,
  type Difficulty, type Grid, type Mode, type Slot, type Sym,
  type Avatar, type MatchState, type RoomState, type ScoreEntry, type SymbolPair,
} from '@tango/shared';
import type { Db } from './db';
import type { Match, Player, Room } from './types';
import { countFilled, gridsEqual } from './grid';

const makeCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

export interface ApplyResult {
  progress?: { slot: Slot; filled: number; total: number };
  coop?: { row: number; col: number; value: Sym | null; bySlot: Slot };
  won?: { winnerSlot: Slot | null; timeMs: number; scores: ScoreEntry[] };
}

type Generator = (difficulty: Difficulty) => ReturnType<typeof generatePuzzle>;

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private db: Db, private gen: Generator = generatePuzzle) {}

  createRoom(name: string, avatar: Avatar): { code: string; slot: Slot } {
    let code = makeCode();
    while (this.rooms.has(code)) code = makeCode();
    const player: Player = { slot: 0, name, avatar, socketId: null, connected: true };
    this.rooms.set(code, { code, players: [player, null], match: null, symbols: { ...DEFAULT_SYMBOLS } });
    this.db.ensureRoom(code);
    return { code, slot: 0 };
  }

  joinRoom(code: string, name: string, avatar: Avatar): { ok: boolean; slot?: Slot; error?: string } {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Room not found' };
    if (!room.players[1]) {
      room.players[1] = { slot: 1, name, avatar, socketId: null, connected: true };
      return { ok: true, slot: 1 };
    }

    const disconnected = ([0, 1] as const)
      .map((slot) => room.players[slot])
      .filter((p): p is Player => !!p && !p.connected);
    if (disconnected.length === 0) return { ok: false, error: 'Room is full' };

    const player = disconnected.find((p) => p.name === name) ?? disconnected[0];
    player.name = name;
    player.avatar = avatar;
    player.socketId = null;
    player.connected = true;
    return { ok: true, slot: player.slot };
  }

  setConnected(code: string, slot: Slot, connected: boolean, socketId: string | null): void {
    const p = this.rooms.get(code)?.players[slot];
    if (p) { p.connected = connected; p.socketId = socketId; }
  }

  setSymbols(code: string, symbols: SymbolPair): void {
    const room = this.rooms.get(code);
    if (room) room.symbols = symbols;
  }

  startMatch(code: string, mode: Mode, difficulty: Difficulty): MatchState {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    const puzzle = this.gen(difficulty);
    const solved = solve(puzzle);
    if (!solved) throw new Error('generated puzzle unexpectedly unsolvable');
    const match: Match = {
      mode,
      difficulty,
      puzzle,
      solution: solved,
      boards: mode === 'coop'
        ? [cloneGrid(puzzle.clues)]
        : [cloneGrid(puzzle.clues), cloneGrid(puzzle.clues)],
      startedAt: Date.now(),
      status: 'playing',
      winnerSlot: null,
    };
    room.match = match;
    return toMatchState(match);
  }

  applyCell(code: string, slot: Slot, row: number, col: number, value: Sym | null): ApplyResult {
    const room = this.rooms.get(code);
    if (!room || !room.match || room.match.status !== 'playing') return {};
    const match = room.match;

    if (match.mode === 'coop') {
      const board = match.boards[0];
      board[row][col] = value;
      const result: ApplyResult = { coop: { row, col, value, bySlot: slot } };
      if (isSolved(board, match)) {
        match.status = 'won';
        match.winnerSlot = null;
        result.won = { winnerSlot: null, timeMs: Date.now() - match.startedAt, scores: this.db.getScores(code) };
      }
      return result;
    }

    // Race: each player edits their own board.
    const board = match.boards[slot];
    board[row][col] = value;
    const result: ApplyResult = {
      progress: { slot, filled: countFilled(board), total: SIZE * SIZE },
    };
    if (isSolved(board, match)) {
      match.status = 'won';
      match.winnerSlot = slot;
      const timeMs = Date.now() - match.startedAt;
      const scores = this.db.recordResult(code, slot, timeMs);
      result.won = { winnerSlot: slot, timeMs, scores };
    }
    return result;
  }

  getRoomState(code: string): RoomState | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const players = room.players.filter((p): p is Player => !!p).map((p) => ({
      slot: p.slot, name: p.name, avatar: p.avatar, connected: p.connected,
    }));
    return {
      code,
      players,
      scores: this.db.getScores(code),
      match: room.match ? toMatchState(room.match) : null,
      symbols: room.symbols,
    };
  }

  /** Private board state for a rejoining player (never broadcast room-wide). */
  getBoardState(code: string, slot: Slot): { board: Grid; opponentFilled: number } | null {
    const room = this.rooms.get(code);
    const match = room?.match;
    if (!match || match.status !== 'playing') return null;
    if (match.mode === 'coop') {
      return { board: match.boards[0], opponentFilled: countFilled(match.boards[0]) };
    }
    const otherSlot: Slot = slot === 0 ? 1 : 0;
    return {
      board: match.boards[slot],
      opponentFilled: countFilled(match.boards[otherSlot]),
    };
  }

  /** Test-only: read the hidden solution. */
  getSolution(code: string): Grid | null {
    return this.rooms.get(code)?.match?.solution ?? null;
  }
}

function isSolved(board: Grid, match: Match): boolean {
  return gridsEqual(board, match.solution) && isValidSolution(board, match.puzzle.constraints);
}

function toMatchState(m: Match): MatchState {
  return {
    mode: m.mode,
    difficulty: m.difficulty,
    puzzle: m.puzzle,
    startedAt: m.startedAt,
    status: m.status,
    winnerSlot: m.winnerSlot,
  };
}
