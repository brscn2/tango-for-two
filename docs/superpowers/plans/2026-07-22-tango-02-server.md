# Realtime Server Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Node/Socket.IO server that manages rooms, runs Race/Co-op matches using the Tango engine, detects wins, broadcasts reactions and synced music control, and persists the per-room scoreboard in SQLite.

**Architecture:** A testable in-memory `RoomManager` holds live match state and returns plain result objects; a thin Socket.IO layer translates those into broadcasts. SQLite (`better-sqlite3`) stores only durable scoreboard data. A shared `protocol.ts` (added to the `@tango/shared` package) defines the client/server event contract so Plan 3 imports the same types.

**Tech Stack:** TypeScript, Express, Socket.IO, better-sqlite3, Vitest, tsx.

**Depends on:** Plan 1 (`@tango/shared`: `generatePuzzle`, `solve`, `isValidSolution`, `SIZE`, types).

---

## File Structure

```
shared/src/protocol.ts     # NEW: Slot, Mode, RoomState, MatchState, C2S/S2C event payloads, MusicControl
server/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    types.ts               # Room, Player, Match (server-internal, holds solution)
    db.ts                  # SQLite scoreboard: ensureRoom, getScores, recordResult
    rooms.ts               # RoomManager: create/join/startMatch/applyCell/getRoomState
    grid.ts               # gridsEqual, countFilled helpers
    socket.ts              # registerSocketHandlers(io, manager)
    index.ts               # http + express static + socket.io bootstrap
  test/
    db.test.ts
    rooms.test.ts
    socket.test.ts
```

---

## Task 1: Shared protocol types

**Files:**
- Create: `shared/src/protocol.ts`
- Modify: `shared/src/index.ts` (add export)

- [ ] **Step 1: Write `shared/src/protocol.ts`**

```ts
import type { Difficulty, EdgeConstraint, Grid, Sym } from './types';

export type Slot = 0 | 1;
export type Mode = 'race' | 'coop';

// All selectable symbol icons. The engine still uses logical 'bee'/'flower';
// a SymbolPair maps logical 'bee' -> a, logical 'flower' -> b for rendering.
export type SymbolKey = 'bee' | 'blueFlower' | 'shokupan' | 'saltBread' | 'matcha' | 'boba' | 'iceCream';
export interface SymbolPair { a: SymbolKey; b: SymbolKey; }
export const DEFAULT_SYMBOLS: SymbolPair = { a: 'bee', b: 'blueFlower' };

// A player's chosen identity icon can be any palette icon.
export type Avatar = SymbolKey;

export interface PlayerInfo {
  slot: Slot;
  name: string;
  avatar: Avatar;
  connected: boolean;
}

export interface PublicPuzzle {
  id: string;
  clues: Grid;
  constraints: EdgeConstraint[];
  difficulty: Difficulty;
}

export interface ScoreEntry {
  slot: Slot;
  wins: number;
  streak: number;
  bestTimeMs: number | null;
}

export interface MatchState {
  mode: Mode;
  difficulty: Difficulty;
  puzzle: PublicPuzzle;
  startedAt: number;
  status: 'playing' | 'won';
  winnerSlot: Slot | null;
}

export interface RoomState {
  code: string;
  players: PlayerInfo[];
  scores: ScoreEntry[];
  match: MatchState | null;
  symbols: SymbolPair; // the pair both players currently see
}

export interface MusicControl {
  action: 'load' | 'play' | 'pause' | 'seek';
  videoId?: string;      // for 'load'
  positionSec?: number;  // for 'play' | 'seek' | 'load'
}

// Client -> Server events
export interface C2S {
  createRoom: (p: { name: string; avatar: Avatar }, cb: (r: { code: string; slot: Slot }) => void) => void;
  joinRoom: (p: { code: string; name: string; avatar: Avatar }, cb: (r: { ok: boolean; slot?: Slot; error?: string }) => void) => void;
  startMatch: (p: { mode: Mode; difficulty: Difficulty }) => void;
  cellUpdate: (p: { row: number; col: number; value: Sym | null }) => void;
  reaction: (p: { kind: 'emoji' | 'gif'; content: string }) => void;
  musicControl: (p: MusicControl) => void;
  setSymbols: (p: SymbolPair) => void;
}

// Server -> Client events
export interface S2C {
  roomState: (s: RoomState) => void;
  matchStarted: (m: MatchState) => void;
  opponentProgress: (p: { slot: Slot; filled: number; total: number }) => void;
  coopCellUpdate: (p: { row: number; col: number; value: Sym | null; bySlot: Slot }) => void;
  matchWon: (p: { winnerSlot: Slot | null; timeMs: number; scores: ScoreEntry[] }) => void;
  reaction: (p: { fromSlot: Slot; kind: 'emoji' | 'gif'; content: string }) => void;
  musicSync: (p: MusicControl & { serverTime: number }) => void;
  partnerDisconnected: (p: { slot: Slot }) => void;
  errorMsg: (p: { message: string }) => void;
}
```

- [ ] **Step 2: Add export to `shared/src/index.ts`**

```ts
export * from './protocol';
```

(Append this line to the existing barrel from Plan 1.)

- [ ] **Step 3: Verify shared still builds/tests**

Run: `npm test -w @tango/shared`
Expected: PASS (unchanged engine tests).

- [ ] **Step 4: Commit**

```bash
git add shared/src/protocol.ts shared/src/index.ts
git commit -m "feat(shared): add client/server protocol types"
```

---

## Task 2: Server package scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`

- [ ] **Step 1: Write `server/package.json`**

```json
{
  "name": "@tango/server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@tango/shared": "*",
    "better-sqlite3": "^11.0.0",
    "express": "^4.19.0",
    "nanoid": "^5.0.0",
    "socket.io": "^4.7.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^4.17.0",
    "socket.io-client": "^4.7.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write `server/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'], hookTimeout: 20000, testTimeout: 20000 },
});
```

- [ ] **Step 4: Install**

Run: `npm install`
Expected: `better-sqlite3` compiles, no errors.

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/tsconfig.json server/vitest.config.ts package-lock.json
git commit -m "chore(server): scaffold server package"
```

---

## Task 3: SQLite scoreboard

**Files:**
- Create: `server/src/db.ts`
- Test: `server/test/db.test.ts`

- [ ] **Step 1: Write the failing test `server/test/db.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createDb } from '../src/db';

describe('db scoreboard', () => {
  it('initializes zeroed scores for a new room', () => {
    const db = createDb(':memory:');
    db.ensureRoom('ABCD');
    const scores = db.getScores('ABCD');
    expect(scores).toEqual([
      { slot: 0, wins: 0, streak: 0, bestTimeMs: null },
      { slot: 1, wins: 0, streak: 0, bestTimeMs: null },
    ]);
  });

  it('records a win: increments winner wins+streak, resets loser streak, tracks best time', () => {
    const db = createDb(':memory:');
    db.ensureRoom('ABCD');
    let scores = db.recordResult('ABCD', 0, 90000);
    scores = db.recordResult('ABCD', 0, 60000); // faster win
    scores = db.recordResult('ABCD', 1, 75000); // slot 1 wins, resets slot 0 streak

    const s0 = scores.find((s) => s.slot === 0)!;
    const s1 = scores.find((s) => s.slot === 1)!;
    expect(s0.wins).toBe(2);
    expect(s0.streak).toBe(0);
    expect(s0.bestTimeMs).toBe(60000);
    expect(s1.wins).toBe(1);
    expect(s1.streak).toBe(1);
    expect(s1.bestTimeMs).toBe(75000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @tango/server -- db`
Expected: FAIL - `Cannot find module '../src/db'`.

- [ ] **Step 3: Write `server/src/db.ts`**

```ts
import Database from 'better-sqlite3';
import type { ScoreEntry, Slot } from '@tango/shared';

export interface Db {
  ensureRoom(code: string): void;
  getScores(code: string): ScoreEntry[];
  recordResult(code: string, winnerSlot: Slot, timeMs: number): ScoreEntry[];
}

export function createDb(path = 'tango.sqlite'): Db {
  const sql = new Database(path);
  sql.pragma('journal_mode = WAL');
  sql.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scores (
      code TEXT NOT NULL,
      slot INTEGER NOT NULL,
      wins INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      best_time_ms INTEGER,
      PRIMARY KEY (code, slot)
    );
  `);

  const insertRoom = sql.prepare('INSERT OR IGNORE INTO rooms (code, created_at) VALUES (?, ?)');
  const insertScore = sql.prepare('INSERT OR IGNORE INTO scores (code, slot) VALUES (?, ?)');
  const selectScores = sql.prepare('SELECT slot, wins, streak, best_time_ms FROM scores WHERE code = ? ORDER BY slot');

  function ensureRoom(code: string): void {
    insertRoom.run(code, Date.now());
    insertScore.run(code, 0);
    insertScore.run(code, 1);
  }

  function getScores(code: string): ScoreEntry[] {
    return (selectScores.all(code) as any[]).map((r) => ({
      slot: r.slot as Slot,
      wins: r.wins,
      streak: r.streak,
      bestTimeMs: r.best_time_ms ?? null,
    }));
  }

  const winner = sql.prepare(
    `UPDATE scores SET wins = wins + 1, streak = streak + 1,
       best_time_ms = CASE WHEN best_time_ms IS NULL OR ? < best_time_ms THEN ? ELSE best_time_ms END
     WHERE code = ? AND slot = ?`,
  );
  const loser = sql.prepare('UPDATE scores SET streak = 0 WHERE code = ? AND slot = ?');

  function recordResult(code: string, winnerSlot: Slot, timeMs: number): ScoreEntry[] {
    ensureRoom(code);
    winner.run(timeMs, timeMs, code, winnerSlot);
    loser.run(code, winnerSlot === 0 ? 1 : 0);
    return getScores(code);
  }

  return { ensureRoom, getScores, recordResult };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @tango/server -- db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/db.ts server/test/db.test.ts
git commit -m "feat(server): SQLite scoreboard with win/streak/best-time tracking"
```

---

## Task 4: Grid helpers + server-internal types

**Files:**
- Create: `server/src/grid.ts`
- Create: `server/src/types.ts`

- [ ] **Step 1: Write `server/src/grid.ts`**

```ts
import type { Grid } from '@tango/shared';

export function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

export function countFilled(g: Grid): number {
  return g.reduce((n, row) => n + row.filter((c) => c !== null).length, 0);
}
```

- [ ] **Step 2: Write `server/src/types.ts`**

```ts
import type { Avatar, Difficulty, Grid, Mode, PublicPuzzle, Slot, SymbolPair } from '@tango/shared';

export interface Player {
  slot: Slot;
  name: string;
  avatar: Avatar;
  socketId: string | null;
  connected: boolean;
}

export interface Match {
  mode: Mode;
  difficulty: Difficulty;
  puzzle: PublicPuzzle;
  solution: Grid;        // server-only, never sent to clients
  boards: Grid[];        // boards[slot] for race; boards[0] shared for coop
  startedAt: number;
  status: 'playing' | 'won';
  winnerSlot: Slot | null;
}

export interface Room {
  code: string;
  players: (Player | null)[]; // index by slot
  match: Match | null;
  symbols: SymbolPair; // current shared symbol pair
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/grid.ts server/src/types.ts
git commit -m "feat(server): grid helpers and room/match types"
```

---

## Task 5: RoomManager (create/join/startMatch/applyCell)

**Files:**
- Create: `server/src/rooms.ts`
- Test: `server/test/rooms.test.ts`

- [ ] **Step 1: Write the failing test `server/test/rooms.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/rooms';
import { createDb } from '../src/db';
import { generatePuzzle, mulberry32, type Difficulty, type Mode } from '@tango/shared';

function manager() {
  // Deterministic generator for tests.
  const gen = (d: Difficulty) => generatePuzzle(d, mulberry32(123));
  return new RoomManager(createDb(':memory:'), gen);
}

describe('RoomManager', () => {
  it('creates a room as slot 0 and lets a second player join as slot 1', () => {
    const m = manager();
    const { code, slot } = m.createRoom('Rosie', 'flower');
    expect(slot).toBe(0);
    const join = m.joinRoom(code, 'Sam', 'bee');
    expect(join.ok).toBe(true);
    expect(join.slot).toBe(1);
  });

  it('rejects joining an unknown room', () => {
    const m = manager();
    expect(m.joinRoom('NOPE', 'X', 'bee')).toEqual({ ok: false, error: 'Room not found' });
  });

  it('rejects a third player', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'flower');
    expect(m.joinRoom(code, 'C', 'bee')).toEqual({ ok: false, error: 'Room is full' });
  });

  it('detects a race win when a player fills the correct solution', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'flower');
    const match = m.startMatch(code, 'race' as Mode, 'easy');
    const solution = m.getSolution(code)!; // test-only accessor

    // Fill slot 0's board to match the solution.
    let won: any = null;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (match.puzzle.clues[r][c] !== null) continue;
        const res = m.applyCell(code, 0, r, c, solution[r][c]);
        if (res.won) won = res.won;
      }
    }
    expect(won).not.toBeNull();
    expect(won.winnerSlot).toBe(0);
    expect(won.scores.find((s: any) => s.slot === 0).wins).toBe(1);
  });

  it('coop broadcasts cell updates and completes with no winner', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'flower');
    const match = m.startMatch(code, 'coop' as Mode, 'easy');
    const solution = m.getSolution(code)!;

    let done: any = null;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (match.puzzle.clues[r][c] !== null) continue;
        const res = m.applyCell(code, 0, r, c, solution[r][c]);
        expect(res.coop).toBeTruthy();
        if (res.won) done = res.won;
      }
    }
    expect(done.winnerSlot).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @tango/server -- rooms`
Expected: FAIL - `Cannot find module '../src/rooms'`.

- [ ] **Step 3: Write `server/src/rooms.ts`**

```ts
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
    if (room.players[1]) return { ok: false, error: 'Room is full' };
    room.players[1] = { slot: 1, name, avatar, socketId: null, connected: true };
    return { ok: true, slot: 1 };
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

```

Note: `solve` is imported at the top from `@tango/shared` (see the import block above) and used directly in `startMatch`. The generator guarantees a unique solution, so the null check is defensive.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @tango/server -- rooms`
Expected: PASS (create/join/full-room/race-win/coop-complete).

- [ ] **Step 5: Commit**

```bash
git add server/src/rooms.ts server/test/rooms.test.ts
git commit -m "feat(server): RoomManager with race/coop match logic and win detection"
```

---

## Task 6: Socket.IO handlers

**Files:**
- Create: `server/src/socket.ts`

- [ ] **Step 1: Write `server/src/socket.ts`**

```ts
import type { Server, Socket } from 'socket.io';
import type { Avatar, C2S, Difficulty, Mode, MusicControl, S2C, Slot, Sym, SymbolPair } from '@tango/shared';
import type { RoomManager } from './rooms';

interface Session { code: string; slot: Slot; }

export function registerSocketHandlers(io: Server<C2S, S2C>, manager: RoomManager): void {
  io.on('connection', (socket: Socket<C2S, S2C>) => {
    let session: Session | null = null;

    const broadcastRoomState = (code: string) => {
      const state = manager.getRoomState(code);
      if (state) io.to(code).emit('roomState', state);
    };

    socket.on('createRoom', ({ name, avatar }: { name: string; avatar: Avatar }, cb) => {
      const { code, slot } = manager.createRoom(name, avatar);
      session = { code, slot };
      manager.setConnected(code, slot, true, socket.id);
      socket.join(code);
      cb({ code, slot });
      broadcastRoomState(code);
    });

    socket.on('joinRoom', ({ code, name, avatar }: { code: string; name: string; avatar: Avatar }, cb) => {
      const res = manager.joinRoom(code, name, avatar);
      if (!res.ok || res.slot === undefined) { cb(res); return; }
      session = { code, slot: res.slot };
      manager.setConnected(code, res.slot, true, socket.id);
      socket.join(code);
      cb(res);
      broadcastRoomState(code);
    });

    socket.on('startMatch', ({ mode, difficulty }: { mode: Mode; difficulty: Difficulty }) => {
      if (!session) return;
      const match = manager.startMatch(session.code, mode, difficulty);
      io.to(session.code).emit('matchStarted', match);
    });

    socket.on('cellUpdate', ({ row, col, value }: { row: number; col: number; value: Sym | null }) => {
      if (!session) return;
      const res = manager.applyCell(session.code, session.slot, row, col, value);
      if (res.progress) socket.to(session.code).emit('opponentProgress', res.progress);
      if (res.coop) socket.to(session.code).emit('coopCellUpdate', res.coop);
      if (res.won) io.to(session.code).emit('matchWon', res.won);
    });

    socket.on('reaction', ({ kind, content }: { kind: 'emoji' | 'gif'; content: string }) => {
      if (!session) return;
      socket.to(session.code).emit('reaction', { fromSlot: session.slot, kind, content });
    });

    socket.on('musicControl', (ctrl: MusicControl) => {
      if (!session) return;
      // Broadcast to everyone (including sender) with a server timestamp for drift correction.
      io.to(session.code).emit('musicSync', { ...ctrl, serverTime: Date.now() });
    });

    socket.on('setSymbols', (symbols: SymbolPair) => {
      if (!session) return;
      manager.setSymbols(session.code, symbols);
      broadcastRoomState(session.code);
    });

    socket.on('disconnect', () => {
      if (!session) return;
      manager.setConnected(session.code, session.slot, false, null);
      socket.to(session.code).emit('partnerDisconnected', { slot: session.slot });
      broadcastRoomState(session.code);
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/socket.ts
git commit -m "feat(server): Socket.IO event handlers"
```

---

## Task 7: HTTP bootstrap + static hosting

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: Write `server/src/index.ts`**

```ts
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { C2S, S2C } from '@tango/shared';
import { createDb } from './db';
import { RoomManager } from './rooms';
import { registerSocketHandlers } from './socket';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);
const io = new Server<C2S, S2C>(server, {
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
});

const manager = new RoomManager(createDb(process.env.DB_PATH ?? 'tango.sqlite'));
registerSocketHandlers(io, manager);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(express.static(CLIENT_DIST));
app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));

server.listen(PORT, () => console.log(`Tango server on :${PORT}`));

export { app, server, io, manager };
```

- [ ] **Step 2: Smoke test the server starts**

Run: `npm run start -w @tango/server & sleep 2 && curl -s localhost:3001/health && kill %1`
Expected: `{"ok":true}` (the static 404 for missing client dist is fine at this stage).

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(server): express + socket.io bootstrap with static client hosting"
```

---

## Task 8: Socket integration test (full race flow)

**Files:**
- Test: `server/test/socket.test.ts`

- [ ] **Step 1: Write `server/test/socket.test.ts`**

```ts
import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as Client, type Socket } from 'socket.io-client';
import { createDb } from '../src/db';
import { RoomManager } from '../src/rooms';
import { registerSocketHandlers } from '../src/socket';
import { generatePuzzle, mulberry32, type Difficulty } from '@tango/shared';

let server: http.Server;
const clients: Socket[] = [];

function start() {
  server = http.createServer();
  const ioServer = new Server(server);
  const gen = (d: Difficulty) => generatePuzzle(d, mulberry32(999));
  const manager = new RoomManager(createDb(':memory:'), gen);
  registerSocketHandlers(ioServer, manager);
  return new Promise<{ url: string; manager: RoomManager }>((resolve) => {
    server.listen(() => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://localhost:${port}`, manager });
    });
  });
}

afterEach(() => {
  clients.forEach((c) => c.close());
  clients.length = 0;
  server?.close();
});

function connect(url: string) {
  const c = Client(url, { transports: ['websocket'] });
  clients.push(c);
  return c;
}

describe('socket race flow', () => {
  it('two players join, start a race, and one solving triggers matchWon', async () => {
    const { url, manager } = await start();
    const a = connect(url);
    const b = connect(url);

    const code: string = await new Promise((resolve) =>
      a.emit('createRoom', { name: 'A', avatar: 'bee' }, (r: any) => resolve(r.code)),
    );
    await new Promise((resolve) =>
      b.emit('joinRoom', { code, name: 'B', avatar: 'flower' }, () => resolve(null)),
    );

    const matchStarted = new Promise<any>((resolve) => a.on('matchStarted', resolve));
    a.emit('startMatch', { mode: 'race', difficulty: 'easy' });
    const match = await matchStarted;

    const solution = manager.getSolution(code)!;
    const won = new Promise<any>((resolve) => a.on('matchWon', resolve));

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (match.puzzle.clues[r][c] !== null) continue;
        a.emit('cellUpdate', { row: r, col: c, value: solution[r][c] });
      }
    }

    const result = await won;
    expect(result.winnerSlot).toBe(0);
    expect(result.scores.find((s: any) => s.slot === 0).wins).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -w @tango/server -- socket`
Expected: PASS.

- [ ] **Step 3: Run the full server suite**

Run: `npm test -w @tango/server`
Expected: PASS (db, rooms, socket).

- [ ] **Step 4: Commit**

```bash
git add server/test/socket.test.ts
git commit -m "test(server): end-to-end race socket flow"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Room creation/join by code (Task 5), Race + Co-op live sync and win detection (Task 5), scoreboard persistence with wins/streaks/best times (Task 3), reactions + synced music broadcast (Task 6), shared symbol-pair selection synced via `setSymbols` + `roomState` (Tasks 1, 5, 6), disconnect handling (Task 6), static hosting for the client (Task 7). Matches spec sections "Real-Time Data Flow", "Symbol selection", "Persistence", "Error Handling".
- **Placeholder scan:** No TBD/TODO. The one `require`-based note in Task 5 is explicitly replaced with a top-level `import { solve }` in the same task; final code uses the import.
- **Type consistency:** Server imports `Slot`, `Mode`, `Avatar`, `MatchState`, `RoomState`, `ScoreEntry`, `MusicControl`, `C2S`, `S2C` from `@tango/shared/protocol` (Task 1) and uses them uniformly in `db.ts`, `rooms.ts`, `socket.ts`. `ApplyResult` shape (progress/coop/won) produced by `RoomManager.applyCell` matches what `socket.ts` consumes.

**End of Plan 2.** Plan 3 (Client UI) imports `@tango/shared` types + protocol and connects to these Socket.IO events.
