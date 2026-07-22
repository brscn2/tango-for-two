# Client UI Implementation Plan (Plan 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Dreamy Pastel React client: landing (create/join room), the Race/Co-op game screen with a bee/blue-flower board and live conflict highlighting, opponent progress, timer, scoreboard, floating emoji + GIF reactions, a shared synced YouTube jukebox, and a win celebration.

**Architecture:** React + Vite + TypeScript. A typed Socket.IO client feeds a zustand store that holds all room/match state; components subscribe to slices. Board logic (symbol cycling, conflict detection) is pure and unit-tested; the engine's `findConflicts` powers live highlighting. Music sync uses the server timestamp from `musicSync` to correct drift.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, zustand, socket.io-client, YouTube IFrame API, Tenor API, Vitest + Testing Library.

**Depends on:** Plan 1 (`@tango/shared` engine + types) and Plan 2 (server Socket.IO events, `C2S`/`S2C`).

---

## File Structure

```
client/
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  index.html
  .env.example                 # VITE_SERVER_URL, VITE_TENOR_KEY
  src/
    main.tsx
    App.tsx
    index.css                  # Tailwind layers + Dreamy Pastel base
    theme.ts                   # color tokens, gradients
    lib/
      socket.ts                # typed socket.io client + emit helpers
      store.ts                 # zustand store (state + actions)
      boardLogic.ts            # cycleSymbol, lockedSet, conflictSet (pure)
      tenor.ts                 # GIF search
      youtube.ts               # IFrame API loader + player controller
    icons/
      Bee.tsx
      BlueFlower.tsx
    components/
      Board.tsx
      Cell.tsx
      ConstraintMark.tsx
      OpponentBoard.tsx
      Timer.tsx
      Scoreboard.tsx
      Controls.tsx             # mode + difficulty + start
      ReactionsBar.tsx
      FloatingReactions.tsx
      GifPicker.tsx
      MusicPlayer.tsx
      WinCelebration.tsx
    pages/
      Landing.tsx
      Game.tsx
    test/
      boardLogic.test.ts
      Cell.test.tsx
```

---

## Task 1: Client scaffold (Vite + React + Tailwind)

**Files:**
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/tailwind.config.js`, `client/postcss.config.js`, `client/index.html`, `client/.env.example`, `client/src/main.tsx`, `client/src/App.tsx`, `client/src/index.css`

- [ ] **Step 1: Write `client/package.json`**

```json
{
  "name": "@tango/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@tango/shared": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.3.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write `client/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `client/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.{ts,tsx}'],
  },
} as any);
```

- [ ] **Step 4: Write `client/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: '#fce4f0',
        petal: '#f7a8c4',
        lilac: '#e8e0fb',
        periwinkle: '#8fb4e8',
        plum: '#4a4160',
      },
      fontFamily: { display: ['"Quicksand"', 'ui-rounded', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 8px 30px rgba(247,168,196,0.35)' },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Write `client/postcss.config.js`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: Write `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tango for Two</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `client/.env.example`**

```
VITE_SERVER_URL=http://localhost:3001
VITE_TENOR_KEY=your_tenor_api_key_here
```

- [ ] **Step 8: Write `client/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }

body {
  margin: 0;
  font-family: 'Quicksand', ui-rounded, system-ui, sans-serif;
  color: #4a4160;
  background: linear-gradient(135deg, #fce4f0 0%, #e8e0fb 100%);
  min-height: 100vh;
}
```

- [ ] **Step 9: Write `client/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 10: Write a placeholder `client/src/App.tsx`**

```tsx
export default function App() {
  return <div className="p-8 text-center text-plum">Tango for Two - loading…</div>;
}
```

- [ ] **Step 11: Write test setup `client/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 12: Install + verify dev server boots**

Run: `npm install && npm run dev -w @tango/client & sleep 3 && curl -s localhost:5173 | grep -q "Tango for Two" && echo OK && kill %1`
Expected: `OK`.

- [ ] **Step 13: Commit**

```bash
git add client/ package-lock.json
git commit -m "chore(client): scaffold Vite + React + Tailwind (Dreamy Pastel base)"
```

---

## Task 2: Symbol icons (bee + blue flower)

**Files:**
- Create: `client/src/icons/Bee.tsx`, `client/src/icons/BlueFlower.tsx`

- [ ] **Step 1: Write `client/src/icons/Bee.tsx`**

```tsx
export function Bee({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="bee">
      <ellipse cx="16" cy="18" rx="8" ry="9" fill="#f2c744" />
      <rect x="8" y="13" width="16" height="3" fill="#3a2f2a" />
      <rect x="8" y="19" width="16" height="3" fill="#3a2f2a" />
      <ellipse cx="10" cy="11" rx="5" ry="3.5" fill="#dbeafe" opacity="0.85" transform="rotate(-25 10 11)" />
      <ellipse cx="22" cy="11" rx="5" ry="3.5" fill="#dbeafe" opacity="0.85" transform="rotate(25 22 11)" />
      <circle cx="13" cy="10" r="1.2" fill="#3a2f2a" />
      <circle cx="19" cy="10" r="1.2" fill="#3a2f2a" />
    </svg>
  );
}
```

- [ ] **Step 2: Write `client/src/icons/BlueFlower.tsx`**

```tsx
export function BlueFlower({ size = 28 }: { size?: number }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="blue flower">
      {petals.map((deg) => (
        <ellipse key={deg} cx="16" cy="8" rx="4" ry="7" fill="#6ea8e6" transform={`rotate(${deg} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="4.5" fill="#fce38a" />
    </svg>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/icons/
git commit -m "feat(client): bee and blue-flower SVG icons"
```

---

## Task 3: Board logic (pure, TDD)

**Files:**
- Create: `client/src/lib/boardLogic.ts`
- Test: `client/src/test/boardLogic.test.ts`

- [ ] **Step 1: Write the failing test `client/src/test/boardLogic.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { cycleSymbol, lockedSet, conflictSet } from '../lib/boardLogic';
import type { Grid } from '@tango/shared';

describe('boardLogic', () => {
  it('cycles null -> bee -> flower -> null', () => {
    expect(cycleSymbol(null)).toBe('bee');
    expect(cycleSymbol('bee')).toBe('flower');
    expect(cycleSymbol('flower')).toBe(null);
  });

  it('lockedSet contains coordinates of non-null clue cells', () => {
    const clues: Grid = Array.from({ length: 6 }, () => Array(6).fill(null));
    clues[0][0] = 'bee';
    clues[2][3] = 'flower';
    const locked = lockedSet(clues);
    expect(locked.has('0,0')).toBe(true);
    expect(locked.has('2,3')).toBe(true);
    expect(locked.has('1,1')).toBe(false);
  });

  it('conflictSet flags a 3-in-a-row on the working board', () => {
    const board: Grid = Array.from({ length: 6 }, () => Array(6).fill(null));
    board[0][0] = 'bee'; board[0][1] = 'bee'; board[0][2] = 'bee';
    const conflicts = conflictSet(board, []);
    expect(conflicts.has('0,0')).toBe(true);
    expect(conflicts.has('0,2')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @tango/client -- boardLogic`
Expected: FAIL - `Cannot find module '../lib/boardLogic'`.

- [ ] **Step 3: Write `client/src/lib/boardLogic.ts`**

```ts
import { findConflicts, type Cell, type EdgeConstraint, type Grid, type Sym } from '@tango/shared';

export function cycleSymbol(current: Cell): Cell {
  if (current === null) return 'bee';
  if (current === 'bee') return 'flower';
  return null;
}

export function lockedSet(clues: Grid): Set<string> {
  const s = new Set<string>();
  clues.forEach((row, r) => row.forEach((c, ci) => { if (c !== null) s.add(`${r},${ci}`); }));
  return s;
}

export function conflictSet(board: Grid, constraints: EdgeConstraint[]): Set<string> {
  return new Set(findConflicts(board, constraints).map(([r, c]) => `${r},${c}`));
}

export type { Sym };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @tango/client -- boardLogic`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/boardLogic.ts client/src/test/boardLogic.test.ts
git commit -m "feat(client): pure board logic (cycle, locked, conflicts)"
```

---

## Task 4: Typed socket client + zustand store

**Files:**
- Create: `client/src/lib/socket.ts`, `client/src/lib/store.ts`

- [ ] **Step 1: Write `client/src/lib/socket.ts`**

```ts
import { io, type Socket } from 'socket.io-client';
import type { C2S, S2C } from '@tango/shared';

const URL = import.meta.env.VITE_SERVER_URL ?? '';

export type TangoSocket = Socket<S2C, C2S>;

export function createSocket(): TangoSocket {
  return io(URL, { transports: ['websocket'], autoConnect: true });
}
```

- [ ] **Step 2: Write `client/src/lib/store.ts`**

```ts
import { create } from 'zustand';
import { cloneGrid, type Avatar, type Difficulty, type Grid, type MatchState, type Mode, type PlayerInfo, type ScoreEntry, type Slot, type Sym } from '@tango/shared';
import { createSocket, type TangoSocket } from './socket';

export interface FloatingReaction { id: number; fromSlot: Slot; kind: 'emoji' | 'gif'; content: string; }

interface State {
  socket: TangoSocket | null;
  code: string | null;
  slot: Slot | null;
  players: PlayerInfo[];
  scores: ScoreEntry[];
  match: MatchState | null;
  myBoard: Grid | null;
  opponentFilled: number;
  reactions: FloatingReaction[];
  music: { videoId?: string; action?: string; positionSec?: number; serverTime?: number };
  error: string | null;

  connect(): void;
  createRoom(name: string, avatar: Avatar): Promise<void>;
  joinRoom(code: string, name: string, avatar: Avatar): Promise<{ ok: boolean; error?: string }>;
  startMatch(mode: Mode, difficulty: Difficulty): void;
  setCell(row: number, col: number, value: Sym | null): void;
  sendReaction(kind: 'emoji' | 'gif', content: string): void;
  musicControl(action: 'load' | 'play' | 'pause' | 'seek', videoId?: string, positionSec?: number): void;
  dismissReaction(id: number): void;
}

let reactionSeq = 0;

export const useStore = create<State>((set, get) => ({
  socket: null,
  code: null,
  slot: null,
  players: [],
  scores: [],
  match: null,
  myBoard: null,
  opponentFilled: 0,
  reactions: [],
  music: {},
  error: null,

  connect() {
    if (get().socket) return;
    const socket = createSocket();

    socket.on('roomState', (s) => set({ code: s.code, players: s.players, scores: s.scores, match: s.match }));
    socket.on('matchStarted', (m) => set({ match: m, myBoard: cloneGrid(m.puzzle.clues), opponentFilled: 0 }));
    socket.on('opponentProgress', (p) => { if (p.slot !== get().slot) set({ opponentFilled: p.filled }); });
    socket.on('coopCellUpdate', (p) => {
      const board = get().myBoard;
      if (!board || p.bySlot === get().slot) return;
      const next = cloneGrid(board);
      next[p.row][p.col] = p.value;
      set({ myBoard: next });
    });
    socket.on('matchWon', (p) => {
      set((st) => ({ scores: p.scores, match: st.match ? { ...st.match, status: 'won', winnerSlot: p.winnerSlot } : null }));
    });
    socket.on('reaction', (p) => {
      const id = ++reactionSeq;
      set((st) => ({ reactions: [...st.reactions, { id, ...p }] }));
    });
    socket.on('musicSync', (p) => set({ music: p }));
    socket.on('errorMsg', (p) => set({ error: p.message }));

    set({ socket });
  },

  createRoom(name, avatar) {
    return new Promise((resolve) => {
      const socket = get().socket!;
      socket.emit('createRoom', { name, avatar }, ({ code, slot }) => {
        set({ code, slot });
        resolve();
      });
    });
  },

  joinRoom(code, name, avatar) {
    return new Promise((resolve) => {
      const socket = get().socket!;
      socket.emit('joinRoom', { code, name, avatar }, (r) => {
        if (r.ok && r.slot !== undefined) set({ code, slot: r.slot });
        resolve({ ok: r.ok, error: r.error });
      });
    });
  },

  startMatch(mode, difficulty) { get().socket!.emit('startMatch', { mode, difficulty }); },

  setCell(row, col, value) {
    const board = get().myBoard;
    if (!board) return;
    const next = cloneGrid(board);
    next[row][col] = value;
    set({ myBoard: next });
    get().socket!.emit('cellUpdate', { row, col, value });
  },

  sendReaction(kind, content) {
    get().socket!.emit('reaction', { kind, content });
    // Show our own reaction locally too.
    const id = ++reactionSeq;
    const slot = get().slot ?? 0;
    set((st) => ({ reactions: [...st.reactions, { id, fromSlot: slot, kind, content }] }));
  },

  musicControl(action, videoId, positionSec) {
    get().socket!.emit('musicControl', { action, videoId, positionSec });
  },

  dismissReaction(id) { set((st) => ({ reactions: st.reactions.filter((r) => r.id !== id) })); },
}));
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/socket.ts client/src/lib/store.ts
git commit -m "feat(client): typed socket client and zustand game store"
```

---

## Task 5: Cell, ConstraintMark, Board (with live highlighting)

**Files:**
- Create: `client/src/components/Cell.tsx`, `client/src/components/ConstraintMark.tsx`, `client/src/components/Board.tsx`
- Test: `client/src/test/Cell.test.tsx`

- [ ] **Step 1: Write the failing test `client/src/test/Cell.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Cell } from '../components/Cell';

describe('Cell', () => {
  it('renders a bee and calls onClick when unlocked', () => {
    const onClick = vi.fn();
    render(<Cell value="bee" locked={false} conflict={false} onClick={onClick} />);
    expect(screen.getByLabelText('bee')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when locked', () => {
    const onClick = vi.fn();
    render(<Cell value="flower" locked conflict={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @tango/client -- Cell`
Expected: FAIL - `Cannot find module '../components/Cell'`.

- [ ] **Step 3: Write `client/src/components/Cell.tsx`**

```tsx
import type { Cell as CellValue } from '@tango/shared';
import { Bee } from '../icons/Bee';
import { BlueFlower } from '../icons/BlueFlower';

interface Props {
  value: CellValue;
  locked: boolean;
  conflict: boolean;
  onClick: () => void;
}

export function Cell({ value, locked, conflict, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => { if (!locked) onClick(); }}
      className={[
        'flex aspect-square items-center justify-center rounded-xl transition',
        'bg-white/90 shadow-sm',
        locked ? 'ring-2 ring-lilac cursor-default' : 'hover:bg-white cursor-pointer',
        conflict ? 'ring-2 ring-rose-400 bg-rose-50' : '',
      ].join(' ')}
      aria-label={value ?? 'empty'}
    >
      {value === 'bee' && <Bee />}
      {value === 'flower' && <BlueFlower />}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @tango/client -- Cell`
Expected: PASS.

- [ ] **Step 5: Write `client/src/components/ConstraintMark.tsx`**

```tsx
export function ConstraintMark({ kind }: { kind: '=' | 'x' }) {
  return (
    <span className="pointer-events-none absolute z-10 flex h-5 w-5 items-center justify-center rounded-full bg-plum text-xs font-bold text-white shadow">
      {kind === '=' ? '=' : '×'}
    </span>
  );
}
```

- [ ] **Step 6: Write `client/src/components/Board.tsx`**

```tsx
import { SIZE, type EdgeConstraint, type Grid } from '@tango/shared';
import { conflictSet, cycleSymbol, lockedSet } from '../lib/boardLogic';
import { Cell } from './Cell';
import { ConstraintMark } from './ConstraintMark';

interface Props {
  board: Grid;
  clues: Grid;
  constraints: EdgeConstraint[];
  onCell(row: number, col: number, next: ReturnType<typeof cycleSymbol>): void;
  disabled?: boolean;
}

export function Board({ board, clues, constraints, onCell, disabled }: Props) {
  const locked = lockedSet(clues);
  const conflicts = conflictSet(board, constraints);

  // Index constraints by "between" position for overlay marks.
  const marks = constraints.map((c) => {
    const horizontal = c.a[0] === c.b[0];
    const row = c.a[0];
    const col = Math.min(c.a[1], c.b[1]);
    const rowB = Math.min(c.a[0], c.b[0]);
    return { kind: c.kind, horizontal, row, col, rowB };
  });

  return (
    <div className="relative">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
        {board.map((rowArr, r) =>
          rowArr.map((value, c) => (
            <Cell
              key={`${r},${c}`}
              value={value}
              locked={locked.has(`${r},${c}`) || !!disabled}
              conflict={conflicts.has(`${r},${c}`)}
              onClick={() => onCell(r, c, cycleSymbol(value))}
            />
          )),
        )}
      </div>
      {/* Constraint marks overlaid at midpoints. Positioned as a percentage of the grid. */}
      <div className="pointer-events-none absolute inset-0">
        {marks.map((m, i) => {
          const stepX = 100 / SIZE;
          const stepY = 100 / SIZE;
          const left = m.horizontal ? (m.col + 1) * stepX : (m.col + 0.5) * stepX;
          const top = m.horizontal ? (m.row + 0.5) * stepY : (m.rowB + 1) * stepY;
          return (
            <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
              <ConstraintMark kind={m.kind} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Cell.tsx client/src/components/ConstraintMark.tsx client/src/components/Board.tsx client/src/test/Cell.test.tsx
git commit -m "feat(client): Board, Cell, ConstraintMark with live conflict highlighting"
```

---

## Task 6: Timer, Scoreboard, OpponentBoard, Controls

**Files:**
- Create: `client/src/components/Timer.tsx`, `client/src/components/Scoreboard.tsx`, `client/src/components/OpponentBoard.tsx`, `client/src/components/Controls.tsx`

- [ ] **Step 1: Write `client/src/components/Timer.tsx`**

```tsx
import { useEffect, useState } from 'react';

export function Timer({ startedAt, stopped }: { startedAt: number; stopped: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (stopped) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [stopped]);
  const ms = Math.max(0, now - startedAt);
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-plum">⏳ {mm}:{ss}</span>;
}
```

- [ ] **Step 2: Write `client/src/components/Scoreboard.tsx`**

```tsx
import type { PlayerInfo, ScoreEntry } from '@tango/shared';

function fmtBest(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Scoreboard({ players, scores }: { players: PlayerInfo[]; scores: ScoreEntry[] }) {
  const name = (slot: number) => players.find((p) => p.slot === slot)?.name ?? `P${slot + 1}`;
  const s0 = scores.find((s) => s.slot === 0);
  const s1 = scores.find((s) => s.slot === 1);
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-2 text-sm text-plum shadow-glow">
      <div className="flex items-center justify-center gap-3 font-semibold">
        <span>🏵️ {name(0)} {s0?.wins ?? 0}</span>
        <span className="opacity-50">—</span>
        <span>{s1?.wins ?? 0} {name(1)} 🐝</span>
      </div>
      <div className="mt-1 flex justify-center gap-4 text-xs opacity-70">
        <span>🔥 {name(0)} streak {s0?.streak ?? 0} · best {fmtBest(s0?.bestTimeMs ?? null)}</span>
        <span>🔥 {name(1)} streak {s1?.streak ?? 0} · best {fmtBest(s1?.bestTimeMs ?? null)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `client/src/components/OpponentBoard.tsx`**

```tsx
import { SIZE } from '@tango/shared';

/** Race mode: we only know how many cells the opponent has filled (progress %). */
export function OpponentBoard({ filled, name }: { filled: number; name: string }) {
  const total = SIZE * SIZE;
  const pct = Math.round((filled / total) * 100);
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide opacity-70">{name}'s progress</div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`aspect-square rounded-sm ${i < filled ? 'bg-petal' : 'bg-white/60'}`} />
        ))}
      </div>
      <div className="mt-1 text-xs opacity-70">{pct}% filled</div>
    </div>
  );
}
```

- [ ] **Step 4: Write `client/src/components/Controls.tsx`**

```tsx
import { useState } from 'react';
import type { Difficulty, Mode } from '@tango/shared';

export function Controls({ onStart, disabled }: { onStart(mode: Mode, difficulty: Difficulty): void; disabled: boolean }) {
  const [mode, setMode] = useState<Mode>('race');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-semibold transition ${active ? 'bg-petal text-white' : 'bg-white/70 text-plum'}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="flex gap-2">
        {(['race', 'coop'] as Mode[]).map((m) => (
          <button key={m} className={pill(mode === m)} onClick={() => setMode(m)}>
            {m === 'race' ? '🏁 Race' : '🤝 Co-op'}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <button key={d} className={pill(difficulty === d)} onClick={() => setDifficulty(d)}>
            {d[0].toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
      <button
        className="rounded-full bg-plum px-5 py-2 font-bold text-white shadow-glow disabled:opacity-40"
        onClick={() => onStart(mode, difficulty)}
        disabled={disabled}
      >
        ✨ New puzzle
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Timer.tsx client/src/components/Scoreboard.tsx client/src/components/OpponentBoard.tsx client/src/components/Controls.tsx
git commit -m "feat(client): timer, scoreboard, opponent progress, match controls"
```

---

## Task 7: Reactions (bar, floating overlay, GIF picker)

**Files:**
- Create: `client/src/lib/tenor.ts`, `client/src/components/ReactionsBar.tsx`, `client/src/components/FloatingReactions.tsx`, `client/src/components/GifPicker.tsx`

- [ ] **Step 1: Write `client/src/lib/tenor.ts`**

```ts
const KEY = import.meta.env.VITE_TENOR_KEY ?? '';

export interface Gif { id: string; url: string; preview: string; }

export async function searchGifs(query: string): Promise<Gif[]> {
  if (!KEY) return [];
  const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${KEY}&limit=12&media_filter=tinygif,gif`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    id: r.id,
    url: r.media_formats?.gif?.url ?? r.media_formats?.tinygif?.url,
    preview: r.media_formats?.tinygif?.url ?? r.media_formats?.gif?.url,
  }));
}
```

- [ ] **Step 2: Write `client/src/components/FloatingReactions.tsx`**

```tsx
import { useEffect } from 'react';
import type { FloatingReaction } from '../lib/store';

export function FloatingReactions({ reactions, onDone }: { reactions: FloatingReaction[]; onDone(id: number): void }) {
  useEffect(() => {
    const timers = reactions.map((r) => setTimeout(() => onDone(r.id), 3500));
    return () => timers.forEach(clearTimeout);
  }, [reactions, onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute animate-[floatUp_3.5s_ease-out_forwards]"
          style={{ left: `${20 + (r.id % 6) * 12}%`, bottom: '10%' }}
        >
          {r.kind === 'emoji'
            ? <span className="text-5xl drop-shadow">{r.content}</span>
            : <img src={r.content} alt="reaction" className="h-28 rounded-xl shadow-glow" />}
        </div>
      ))}
      <style>{`@keyframes floatUp { 0%{transform:translateY(0) scale(0.6);opacity:0} 15%{opacity:1;transform:translateY(-20px) scale(1)} 100%{transform:translateY(-60vh) scale(1.1);opacity:0} }`}</style>
    </div>
  );
}
```

- [ ] **Step 3: Write `client/src/components/GifPicker.tsx`**

```tsx
import { useState } from 'react';
import { searchGifs, type Gif } from '../lib/tenor';

export function GifPicker({ onPick, onClose }: { onPick(url: string): void; onClose(): void }) {
  const [q, setQ] = useState('bruno mars');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setGifs(await searchGifs(q));
    setLoading(false);
  };

  return (
    <div className="absolute bottom-16 left-1/2 z-40 w-80 -translate-x-1/2 rounded-2xl bg-white p-3 shadow-glow">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-full border border-lilac px-3 py-1 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
          placeholder="Search GIFs…"
        />
        <button className="rounded-full bg-petal px-3 py-1 text-sm font-semibold text-white" onClick={run}>Go</button>
        <button className="text-plum/60" onClick={onClose}>✕</button>
      </div>
      <div className="mt-2 grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
        {loading && <div className="col-span-3 py-6 text-center text-sm opacity-60">Loading…</div>}
        {!loading && gifs.length === 0 && (
          <div className="col-span-3 py-6 text-center text-xs opacity-60">No GIFs (check VITE_TENOR_KEY).</div>
        )}
        {gifs.map((g) => (
          <img
            key={g.id}
            src={g.preview}
            alt="gif"
            className="h-20 w-full cursor-pointer rounded object-cover hover:opacity-80"
            onClick={() => { onPick(g.url); onClose(); }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `client/src/components/ReactionsBar.tsx`**

```tsx
import { useState } from 'react';
import { GifPicker } from './GifPicker';

const EMOJIS = ['😘', '🌸', '🔥', '😂', '💜', '🎵', '🐝', '🏵️'];

export function ReactionsBar({ onEmoji, onGif }: { onEmoji(e: string): void; onGif(url: string): void }) {
  const [showGif, setShowGif] = useState(false);
  return (
    <div className="relative flex justify-center">
      <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow">
        {EMOJIS.map((e) => (
          <button key={e} className="text-2xl transition hover:scale-125" onClick={() => onEmoji(e)}>{e}</button>
        ))}
        <button className="rounded-full bg-lilac px-3 py-1 text-sm font-semibold text-plum" onClick={() => setShowGif((v) => !v)}>
          GIF
        </button>
      </div>
      {showGif && <GifPicker onPick={onGif} onClose={() => setShowGif(false)} />}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/tenor.ts client/src/components/ReactionsBar.tsx client/src/components/FloatingReactions.tsx client/src/components/GifPicker.tsx
git commit -m "feat(client): emoji + Tenor GIF reactions with floating overlay"
```

---

## Task 8: Shared synced music jukebox

**Files:**
- Create: `client/src/lib/youtube.ts`, `client/src/components/MusicPlayer.tsx`

- [ ] **Step 1: Write `client/src/lib/youtube.ts`**

```ts
// Minimal loader for the YouTube IFrame Player API.
let apiPromise: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if ((window as any).YT?.Player) { resolve(); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    (window as any).onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function parseVideoId(input: string): string | null {
  // Accept raw IDs, youtu.be links, and youtube.com/watch?v= links.
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1) || null;
    return url.searchParams.get('v');
  } catch {
    return null;
  }
}

/** Default Bruno Mars playlist seed (a well-known Bruno Mars video id). */
export const DEFAULT_VIDEO_ID = 'PMivT7MJ41M'; // "Treasure"
```

- [ ] **Step 2: Write `client/src/components/MusicPlayer.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_VIDEO_ID, loadYouTubeApi, parseVideoId } from '../lib/youtube';

interface MusicState { videoId?: string; action?: string; positionSec?: number; serverTime?: number; }

interface Props {
  music: MusicState;
  onControl(action: 'load' | 'play' | 'pause' | 'seek', videoId?: string, positionSec?: number): void;
}

export function MusicPlayer({ music, onControl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        height: '80',
        width: '140',
        videoId: DEFAULT_VIDEO_ID,
        playerVars: { controls: 1 },
        events: { onReady: () => setReady(true) },
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Apply incoming sync events from the other player.
  useEffect(() => {
    const p = playerRef.current;
    if (!ready || !p || !music.action) return;
    const drift = music.serverTime ? (Date.now() - music.serverTime) / 1000 : 0;
    const targetPos = (music.positionSec ?? 0) + drift;
    if (music.action === 'load' && music.videoId) {
      p.loadVideoById(music.videoId, targetPos);
    } else if (music.action === 'play') {
      p.seekTo(targetPos, true);
      p.playVideo();
    } else if (music.action === 'pause') {
      p.pauseVideo();
    } else if (music.action === 'seek') {
      p.seekTo(targetPos, true);
    }
  }, [music, ready]);

  const pos = () => (playerRef.current?.getCurrentTime?.() ?? 0);

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-plum px-3 py-2 text-cream text-white">
      <div ref={containerRef} className="overflow-hidden rounded" />
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <button className="rounded bg-white/20 px-2 text-xs" onClick={() => onControl('play', undefined, pos())}>▶</button>
          <button className="rounded bg-white/20 px-2 text-xs" onClick={() => onControl('pause')}>❚❚</button>
        </div>
        <div className="flex gap-1">
          <input
            className="w-24 rounded px-1 text-xs text-plum"
            placeholder="paste link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button
            className="rounded bg-petal px-2 text-xs font-semibold"
            onClick={() => { const id = parseVideoId(link); if (id) onControl('load', id, 0); }}
          >Set</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/youtube.ts client/src/components/MusicPlayer.tsx
git commit -m "feat(client): shared synced YouTube jukebox"
```

---

## Task 9: Win celebration

**Files:**
- Create: `client/src/components/WinCelebration.tsx`

- [ ] **Step 1: Write `client/src/components/WinCelebration.tsx`**

```tsx
interface Props { winnerName: string | null; timeMs: number; onClose(): void; }

export function WinCelebration({ winnerName, timeMs, onClose }: Props) {
  const s = Math.floor(timeMs / 1000);
  const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-plum/40 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-3xl bg-white p-8 text-center shadow-glow">
        <div className="text-5xl">🎉🌸🐝</div>
        <h2 className="mt-3 text-2xl font-bold text-plum">
          {winnerName ? `${winnerName} wins!` : 'Solved together!'}
        </h2>
        <p className="mt-1 text-plum/70">Time: {time}</p>
        <button className="mt-4 rounded-full bg-petal px-5 py-2 font-semibold text-white" onClick={onClose}>
          Play again ✨
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/WinCelebration.tsx
git commit -m "feat(client): win celebration overlay"
```

---

## Task 10: Landing page

**Files:**
- Create: `client/src/pages/Landing.tsx`

- [ ] **Step 1: Write `client/src/pages/Landing.tsx`**

```tsx
import { useState } from 'react';
import type { Avatar } from '@tango/shared';
import { useStore } from '../lib/store';
import { Bee } from '../icons/Bee';
import { BlueFlower } from '../icons/BlueFlower';

export function Landing() {
  const { connect, createRoom, joinRoom } = useStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<Avatar>('flower');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ensure = () => { connect(); };

  const doCreate = async () => {
    if (!name.trim()) { setError('Enter a name first 🌸'); return; }
    ensure();
    await createRoom(name.trim(), avatar);
  };

  const doJoin = async () => {
    if (!name.trim() || !joinCode.trim()) { setError('Name and room code, please'); return; }
    ensure();
    const res = await joinRoom(joinCode.trim().toUpperCase(), name.trim(), avatar);
    if (!res.ok) setError(res.error ?? 'Could not join');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-6xl">🌸🐝</div>
        <h1 className="mt-2 text-4xl font-bold text-plum">Tango for Two</h1>
        <p className="text-plum/70">Unlimited puzzles, just us two 💜</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-white/80 p-6 shadow-glow">
        <label className="mb-1 block text-sm font-semibold text-plum">Your name</label>
        <input
          className="mb-4 w-full rounded-full border border-lilac px-4 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rosie"
        />
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm font-semibold text-plum">Your icon:</span>
          <button className={`rounded-full p-2 ${avatar === 'flower' ? 'bg-lilac' : ''}`} onClick={() => setAvatar('flower')}><BlueFlower /></button>
          <button className={`rounded-full p-2 ${avatar === 'bee' ? 'bg-lilac' : ''}`} onClick={() => setAvatar('bee')}><Bee /></button>
        </div>

        <button className="mb-4 w-full rounded-full bg-plum py-2 font-bold text-white shadow-glow" onClick={doCreate}>
          Create a room
        </button>

        <div className="mb-2 text-center text-xs uppercase tracking-wide text-plum/50">or join</div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-full border border-lilac px-4 py-2 uppercase"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="ROOM CODE"
          />
          <button className="rounded-full bg-petal px-4 font-semibold text-white" onClick={doJoin}>Join</button>
        </div>
        {error && <p className="mt-3 text-center text-sm text-rose-500">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Landing.tsx
git commit -m "feat(client): landing page (create/join room, name, avatar)"
```

---

## Task 11: Game screen assembly

**Files:**
- Create: `client/src/pages/Game.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Write `client/src/pages/Game.tsx`**

```tsx
import { useState } from 'react';
import { useStore } from '../lib/store';
import { Board } from '../components/Board';
import { OpponentBoard } from '../components/OpponentBoard';
import { Timer } from '../components/Timer';
import { Scoreboard } from '../components/Scoreboard';
import { Controls } from '../components/Controls';
import { ReactionsBar } from '../components/ReactionsBar';
import { FloatingReactions } from '../components/FloatingReactions';
import { MusicPlayer } from '../components/MusicPlayer';
import { WinCelebration } from '../components/WinCelebration';

export function Game() {
  const {
    code, slot, players, scores, match, myBoard, opponentFilled,
    reactions, music, startMatch, setCell, sendReaction, musicControl, dismissReaction,
  } = useStore();
  const [celebrated, setCelebrated] = useState<string | null>(null);

  const opponentSlot = slot === 0 ? 1 : 0;
  const opponentName = players.find((p) => p.slot === opponentSlot)?.name ?? 'Partner';
  const won = match?.status === 'won';
  const winnerName = match?.winnerSlot === null || match?.winnerSlot === undefined
    ? null
    : players.find((p) => p.slot === match.winnerSlot)?.name ?? null;
  const showCelebration = won && celebrated !== match?.puzzle.id;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <FloatingReactions reactions={reactions} onDone={dismissReaction} />

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-plum">Room {code}</span>
        {match && <Timer startedAt={match.startedAt} stopped={won} />}
        <MusicPlayer music={music} onControl={musicControl} />
      </header>

      <Scoreboard players={players} scores={scores} />

      <div className="my-4"><Controls onStart={startMatch} disabled={players.length < 2} /></div>
      {players.length < 2 && (
        <p className="text-center text-sm text-plum/70">Share room code <b>{code}</b> with your partner to begin 💌</p>
      )}

      {match && myBoard && (
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex-[1.4]">
            <div className="mb-1 text-xs uppercase tracking-wide opacity-70">Your board</div>
            <Board
              board={myBoard}
              clues={match.puzzle.clues}
              constraints={match.puzzle.constraints}
              onCell={setCell}
              disabled={won}
            />
          </div>
          {match.mode === 'race' && (
            <div className="flex-1"><OpponentBoard filled={opponentFilled} name={opponentName} /></div>
          )}
        </div>
      )}

      <div className="mt-6">
        <ReactionsBar
          onEmoji={(e) => sendReaction('emoji', e)}
          onGif={(url) => sendReaction('gif', url)}
        />
      </div>

      {showCelebration && match && (
        <WinCelebration
          winnerName={winnerName}
          timeMs={Date.now() - match.startedAt}
          onClose={() => setCelebrated(match.puzzle.id)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `client/src/App.tsx`**

```tsx
import { useEffect } from 'react';
import { useStore } from './lib/store';
import { Landing } from './pages/Landing';
import { Game } from './pages/Game';

export default function App() {
  const { connect, code } = useStore();
  useEffect(() => { connect(); }, [connect]);
  return code ? <Game /> : <Landing />;
}
```

- [ ] **Step 3: Type-check + build the client**

Run: `npm run build -w @tango/client`
Expected: `tsc -b` passes and Vite produces `client/dist`.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Game.tsx client/src/App.tsx
git commit -m "feat(client): assemble game screen and app routing"
```

---

## Task 12: Full local run + manual verification

**Files:** none (verification task)

- [ ] **Step 1: Run all automated tests across workspaces**

Run: `npm test`
Expected: shared + server + client suites all PASS.

- [ ] **Step 2: Start server and client together**

Run (terminal 1): `npm run dev -w @tango/server`
Run (terminal 2): `npm run dev -w @tango/client`

- [ ] **Step 3: Manual smoke test**

Open two browser windows at `http://localhost:5173`:
- Window 1: enter a name, pick an icon, Create a room. Note the room code.
- Window 2: enter a name, paste the code, Join.
- In Window 1: pick Race + Medium, click "New puzzle". Both boards appear.
- Fill cells in Window 1; confirm Window 2's opponent-progress bar advances.
- Complete the puzzle correctly in one window; confirm the win celebration and scoreboard increment in both.
- Send an emoji and a GIF; confirm both appear floating in both windows.
- Press play on the music; confirm both players hear the same track roughly in sync; paste a YouTube link and confirm it loads for both.

Expected: all behaviors work; no console errors.

- [ ] **Step 4: Commit any fixes discovered**

```bash
git add -A
git commit -m "fix(client): address issues found during manual smoke test"
```

(Only if fixes were needed.)

---

## Task 13: Deployment

**Files:**
- Create: `render.yaml` (or platform equivalent)
- Modify: root `package.json` (add build/start scripts)

- [ ] **Step 1: Add root build/start scripts to `package.json`**

```json
{
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "build": "npm run build -w @tango/client",
    "start": "npm run start -w @tango/server"
  }
}
```

- [ ] **Step 2: Write `render.yaml`**

```yaml
services:
  - type: web
    name: tango-for-two
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_VERSION
        value: 20.11.0
      - key: DB_PATH
        value: /var/data/tango.sqlite
      - key: CORS_ORIGIN
        value: "*"
    disk:
      name: tango-data
      mountPath: /var/data
      sizeGB: 1
```

Notes: the server serves the built client from `client/dist` (Plan 2, Task 7), so a single web service hosts both. The client's `VITE_SERVER_URL` should be empty in production (same origin) - set it only for local dev in `client/.env`.

- [ ] **Step 3: Commit**

```bash
git add render.yaml package.json
git commit -m "chore: single-service deployment config (Render)"
```

- [ ] **Step 4: Deploy**

Push to GitHub, connect the repo on Render (or Railway/Fly), set the `VITE_TENOR_KEY` build env var, and deploy. Verify the public URL loads and two devices can play.

---

## Self-Review (completed by plan author)

- **Spec coverage:** Dreamy Pastel theme (Task 1), bee/blue-flower icons (Task 2), board with live conflict highlighting + constraint marks (Tasks 3, 5), Race opponent progress + Co-op shared board (Tasks 4, 6, 11), timer + persistent scoreboard display (Task 6), difficulty + mode selection (Task 6), emoji + GIF floating reactions via Tenor (Task 7), shared synced YouTube jukebox (Task 8), win celebration (Task 9), room create/join by link (Task 10), single-service deploy (Task 13). Covers the spec's UI Components, Real-Time Data Flow, and External Dependencies sections.
- **Placeholder scan:** No TBD/TODO. Every component has complete code; verification tasks list concrete steps and expected results.
- **Type consistency:** Client imports `Avatar`, `Difficulty`, `Mode`, `MatchState`, `PlayerInfo`, `ScoreEntry`, `Slot`, `Grid`, `Cell`, `EdgeConstraint`, `C2S`, `S2C` from `@tango/shared`. Store action signatures (`setCell`, `startMatch`, `sendReaction`, `musicControl`) match how `Game.tsx`, `Board.tsx`, `Controls.tsx`, `ReactionsBar.tsx`, and `MusicPlayer.tsx` call them. `FloatingReaction` type is defined in `store.ts` and consumed by `FloatingReactions.tsx`. Socket event names match Plan 2's `S2C`/`C2S`.

**End of Plan 3.** With Plans 1-3 complete, the app is fully built, tested, and deployable.
