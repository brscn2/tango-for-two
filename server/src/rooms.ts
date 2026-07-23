import { customAlphabet } from 'nanoid';
import {
  cloneGrid, generatePuzzle, generateZipPuzzle, isValidSolution, isValidZipSolution,
  canExtendPath, solve, DEFAULT_SYMBOLS,
  type BoardSize, type Difficulty, type GameType, type Grid, type Mode, type Slot, type Sym,
  type Avatar, type MatchState, type RoomState, type RoomScores, type SymbolPair,
  type ZipCoord, type ZipGenerated, type ZipPuzzle, type ZipSize,
} from '@tango/shared';
import type { Db } from './db';
import type { Match, Player, Room } from './types';
import { countFilled, gridsEqual } from './grid';

const makeCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

export interface ApplyResult {
  progress?: { slot: Slot; filled: number; total: number };
  coop?: { row: number; col: number; value: Sym | null; bySlot: Slot };
  won?: { winnerSlot: Slot | null; timeMs: number; scores: RoomScores };
}

type Generator = (size: BoardSize, difficulty: Difficulty) => ReturnType<typeof generatePuzzle>;
type ZipGenerator = (size: ZipSize, difficulty: Difficulty) => ZipGenerated;

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(
    private db: Db,
    private gen: Generator = generatePuzzle,
    private zipGen: ZipGenerator = generateZipPuzzle,
  ) {}

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

  startMatch(
    code: string,
    mode: Mode,
    difficulty: Difficulty,
    size: number = 6,
    gameType: GameType = 'tango',
  ): MatchState {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');

    if (gameType === 'zip') {
      if (mode !== 'race') throw new Error('Zip only supports race mode');
      if (size !== 6 && size !== 7 && size !== 8) throw new Error('Invalid Zip size');
      const { puzzle, solutionPath } = this.zipGen(size, difficulty);
      const match: Match = {
        gameType: 'zip',
        mode: 'race',
        difficulty,
        zipPuzzle: {
          id: puzzle.id,
          size: puzzle.size,
          waypoints: puzzle.waypoints,
          walls: puzzle.walls,
          difficulty: puzzle.difficulty,
        },
        solutionPath,
        paths: [[], []],
        startedAt: Date.now(),
        status: 'playing',
        winnerSlot: null,
      };
      room.match = match;
      return toMatchState(match);
    }

    const puzzle = this.gen(size as BoardSize, difficulty);
    const solved = solve(puzzle);
    if (!solved) throw new Error('generated puzzle unexpectedly unsolvable');
    const match: Match = {
      gameType: 'tango',
      mode,
      difficulty,
      puzzle: {
        id: puzzle.id,
        size: puzzle.size,
        clues: puzzle.clues,
        constraints: puzzle.constraints,
        difficulty: puzzle.difficulty,
      },
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
    if (match.gameType !== 'tango' || !match.puzzle || !match.boards || !match.solution) return {};

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

    const board = match.boards[slot];
    board[row][col] = value;
    const result: ApplyResult = {
      progress: { slot, filled: countFilled(board), total: match.puzzle.size * match.puzzle.size },
    };
    if (isSolved(board, match)) {
      match.status = 'won';
      match.winnerSlot = slot;
      const timeMs = Date.now() - match.startedAt;
      const scores = this.db.recordResult(code, 'tango', slot, timeMs);
      result.won = { winnerSlot: slot, timeMs, scores };
    }
    return result;
  }

  applyZipPath(code: string, slot: Slot, path: ZipCoord[]): ApplyResult {
    const room = this.rooms.get(code);
    const match = room?.match;
    if (!match || match.status !== 'playing' || match.gameType !== 'zip' || !match.zipPuzzle || !match.paths) {
      return {};
    }
    const puzzle: ZipPuzzle = {
      id: match.zipPuzzle.id,
      size: match.zipPuzzle.size,
      waypoints: match.zipPuzzle.waypoints,
      walls: match.zipPuzzle.walls,
      difficulty: match.zipPuzzle.difficulty,
    };
    const total = puzzle.size * puzzle.size;
    const start = puzzle.waypoints.find((w) => w.n === 1);
    if (!start) return {};

    if (path.length === 0) {
      match.paths[slot] = [];
      return { progress: { slot, filled: 0, total } };
    }

    if (path[0].r !== start.r || path[0].c !== start.c) return {};
    const built: ZipCoord[] = [path[0]];
    for (let i = 1; i < path.length; i++) {
      if (!canExtendPath(built, path[i], puzzle)) return {};
      built.push(path[i]);
    }

    match.paths[slot] = built;
    const result: ApplyResult = {
      progress: { slot, filled: built.length, total },
    };
    if (isValidZipSolution(built, puzzle)) {
      match.status = 'won';
      match.winnerSlot = slot;
      const timeMs = Date.now() - match.startedAt;
      result.won = {
        winnerSlot: slot,
        timeMs,
        scores: this.db.recordResult(code, 'zip', slot, timeMs),
      };
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
    if (!match || match.status !== 'playing' || match.gameType !== 'tango' || !match.boards || !match.puzzle) {
      return null;
    }
    if (match.mode === 'coop') {
      return { board: match.boards[0], opponentFilled: countFilled(match.boards[0]) };
    }
    const otherSlot: Slot = slot === 0 ? 1 : 0;
    return {
      board: match.boards[slot],
      opponentFilled: countFilled(match.boards[otherSlot]),
    };
  }

  getZipPathState(code: string, slot: Slot): { path: ZipCoord[]; opponentFilled: number } | null {
    const room = this.rooms.get(code);
    const match = room?.match;
    if (!match || match.status !== 'playing' || match.gameType !== 'zip' || !match.paths || !match.zipPuzzle) {
      return null;
    }
    const otherSlot: Slot = slot === 0 ? 1 : 0;
    return {
      path: match.paths[slot],
      opponentFilled: match.paths[otherSlot].length,
    };
  }

  /** Test-only: read the hidden tango solution. */
  getSolution(code: string): Grid | null {
    return this.rooms.get(code)?.match?.solution ?? null;
  }

  /** Test-only: read the hidden zip solution path. */
  getZipSolution(code: string): ZipCoord[] | null {
    return this.rooms.get(code)?.match?.solutionPath ?? null;
  }
}

function isSolved(board: Grid, match: Match): boolean {
  if (!match.solution || !match.puzzle) return false;
  return gridsEqual(board, match.solution) && isValidSolution(board, match.puzzle.constraints);
}

function toMatchState(m: Match): MatchState {
  return {
    gameType: m.gameType,
    mode: m.mode,
    difficulty: m.difficulty,
    puzzle: m.puzzle,
    zipPuzzle: m.zipPuzzle,
    startedAt: m.startedAt,
    status: m.status,
    winnerSlot: m.winnerSlot,
  };
}
