# Tango Engine Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the framework-agnostic Tango engine (rules, solver, generator) as a shared TypeScript package, fully unit-tested, that produces uniquely-solvable 6x6 puzzles and validates completed boards.

**Architecture:** A standalone `shared/` package with pure functions and no I/O. The server (Plan 2) and client (Plan 3) both import it. Generation works by building a random valid solution, deriving `=`/`x` edge constraints, then removing clues while a backtracking solver confirms the puzzle stays uniquely solvable.

**Tech Stack:** TypeScript, Vitest, npm workspaces.

---

## File Structure

```
tango-multiplayer/
  package.json            # root, npm workspaces
  tsconfig.base.json      # shared TS config
  shared/
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      types.ts            # Sym, Cell, Grid, Coord, EdgeConstraint, Puzzle, Difficulty, SIZE, HALF
      rng.ts              # seeded PRNG (mulberry32) for deterministic generation/tests
      rules.ts            # opposite, emptyGrid, cloneGrid, isComplete, findConflicts, constraintsSatisfied, isValidSolution
      solver.ts           # countSolutions, solve
      generator.ts        # generateSolution, generatePuzzle
      index.ts            # public re-exports
    test/
      rules.test.ts
      solver.test.ts
      generator.test.ts
```

---

## Task 1: Workspace scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/vitest.config.ts`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "tango-multiplayer",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "test": "npm run test --workspaces --if-present"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 3: Create `shared/package.json`**

```json
{
  "name": "@tango/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 4: Create `shared/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `shared/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: workspaces linked, `node_modules` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.base.json shared/package.json shared/tsconfig.json shared/vitest.config.ts package-lock.json
git commit -m "chore: scaffold npm workspaces + shared engine package"
```

---

## Task 2: Core types

**Files:**
- Create: `shared/src/types.ts`

- [ ] **Step 1: Write `shared/src/types.ts`**

```ts
export const SIZE = 6;
export const HALF = 3;

export type Sym = 'bee' | 'flower';
export type Cell = Sym | null;
export type Grid = Cell[][]; // SIZE rows x SIZE cols
export type Coord = [number, number]; // [row, col]
export type ConstraintKind = '=' | 'x';

export interface EdgeConstraint {
  a: Coord;
  b: Coord; // must be orthogonally adjacent to a
  kind: ConstraintKind; // '=' same symbol, 'x' different symbol
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Puzzle {
  id: string;
  clues: Grid; // fixed given cells; unknown cells are null
  constraints: EdgeConstraint[];
  difficulty: Difficulty;
}
```

- [ ] **Step 2: Commit**

```bash
git add shared/src/types.ts
git commit -m "feat(engine): add core Tango types"
```

---

## Task 3: Seeded RNG

**Files:**
- Create: `shared/src/rng.ts`
- Test: `shared/test/rng` covered indirectly; add a focused test inline in generator tests.

- [ ] **Step 1: Write `shared/src/rng.ts`**

```ts
// Deterministic PRNG (mulberry32). Returns a function producing floats in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add shared/src/rng.ts
git commit -m "feat(engine): add seeded PRNG"
```

---

## Task 4: Rules (validation + conflict detection)

**Files:**
- Create: `shared/src/rules.ts`
- Test: `shared/test/rules.test.ts`

- [ ] **Step 1: Write the failing test `shared/test/rules.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  opposite, emptyGrid, cloneGrid, isComplete,
  findConflicts, constraintsSatisfied, isValidSolution,
} from '../src/rules';
import type { Grid } from '../src/types';

const B = 'bee', F = 'flower';

// A known-valid balanced 6x6 grid with no 3-in-a-row.
const VALID: Grid = [
  [B, F, B, F, B, F],
  [F, B, F, B, F, B],
  [B, F, B, F, B, F],
  [F, B, F, B, F, B],
  [B, F, B, F, B, F],
  [F, B, F, B, F, B],
];

describe('rules', () => {
  it('opposite flips the symbol', () => {
    expect(opposite('bee')).toBe('flower');
    expect(opposite('flower')).toBe('bee');
  });

  it('emptyGrid is 6x6 of nulls and not complete', () => {
    const g = emptyGrid();
    expect(g.length).toBe(6);
    expect(g[0].length).toBe(6);
    expect(isComplete(g)).toBe(false);
  });

  it('cloneGrid is a deep copy', () => {
    const g = cloneGrid(VALID);
    g[0][0] = F;
    expect(VALID[0][0]).toBe(B);
  });

  it('isValidSolution accepts a valid balanced grid with satisfied constraints', () => {
    expect(isValidSolution(VALID, [{ a: [0, 0], b: [0, 1], kind: 'x' }])).toBe(true);
  });

  it('isValidSolution rejects when a constraint is violated', () => {
    expect(isValidSolution(VALID, [{ a: [0, 0], b: [0, 1], kind: '=' }])).toBe(false);
  });

  it('findConflicts flags a horizontal 3-in-a-row', () => {
    const g = cloneGrid(VALID);
    g[0][0] = B; g[0][1] = B; g[0][2] = B;
    const conflicts = findConflicts(g, []);
    expect(conflicts).toEqual(
      expect.arrayContaining([[0, 0], [0, 1], [0, 2]]),
    );
  });

  it('findConflicts flags a broken constraint', () => {
    const conflicts = findConflicts(VALID, [{ a: [0, 0], b: [0, 1], kind: '=' }]);
    expect(conflicts).toEqual(expect.arrayContaining([[0, 0], [0, 1]]));
  });

  it('constraintsSatisfied is false when a cell is empty', () => {
    const g = cloneGrid(VALID); g[0][0] = null;
    expect(constraintsSatisfied(g, [{ a: [0, 0], b: [0, 1], kind: 'x' }])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @tango/shared -- rules`
Expected: FAIL - `Cannot find module '../src/rules'`.

- [ ] **Step 3: Write `shared/src/rules.ts`**

```ts
import { Cell, Coord, EdgeConstraint, Grid, HALF, SIZE, Sym } from './types';

export function opposite(s: Sym): Sym {
  return s === 'bee' ? 'flower' : 'bee';
}

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

export function isComplete(g: Grid): boolean {
  return g.every((row) => row.every((c) => c !== null));
}

function countInLine(cells: Cell[], s: Sym): number {
  return cells.reduce((n, c) => (c === s ? n + 1 : n), 0);
}

/** Coordinates involved in any rule or constraint violation (for live highlighting). */
export function findConflicts(g: Grid, constraints: EdgeConstraint[]): Coord[] {
  const set = new Set<string>();
  const mark = (r: number, c: number) => set.add(`${r},${c}`);

  // No 3 identical consecutive (rows + columns).
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = g[r][c];
      if (v === null) continue;
      if (c + 2 < SIZE && g[r][c + 1] === v && g[r][c + 2] === v) {
        mark(r, c); mark(r, c + 1); mark(r, c + 2);
      }
      if (r + 2 < SIZE && g[r + 1][c] === v && g[r + 2][c] === v) {
        mark(r, c); mark(r + 1, c); mark(r + 2, c);
      }
    }
  }

  // Too many of one symbol in a row/column (> HALF).
  for (let i = 0; i < SIZE; i++) {
    const row = g[i];
    const col = g.map((rr) => rr[i]);
    (['bee', 'flower'] as Sym[]).forEach((s) => {
      if (countInLine(row, s) > HALF) for (let c = 0; c < SIZE; c++) if (row[c] === s) mark(i, c);
      if (countInLine(col, s) > HALF) for (let r = 0; r < SIZE; r++) if (col[r] === s) mark(r, i);
    });
  }

  // Broken edge constraints (only when both cells are filled).
  for (const { a, b, kind } of constraints) {
    const va = g[a[0]][a[1]];
    const vb = g[b[0]][b[1]];
    if (va === null || vb === null) continue;
    const same = va === vb;
    if ((kind === '=' && !same) || (kind === 'x' && same)) {
      mark(a[0], a[1]); mark(b[0], b[1]);
    }
  }

  return [...set].map((k) => k.split(',').map(Number) as Coord);
}

export function constraintsSatisfied(g: Grid, constraints: EdgeConstraint[]): boolean {
  for (const { a, b, kind } of constraints) {
    const va = g[a[0]][a[1]];
    const vb = g[b[0]][b[1]];
    if (va === null || vb === null) return false;
    const same = va === vb;
    if (kind === '=' && !same) return false;
    if (kind === 'x' && same) return false;
  }
  return true;
}

export function isValidSolution(g: Grid, constraints: EdgeConstraint[]): boolean {
  if (!isComplete(g)) return false;
  for (let i = 0; i < SIZE; i++) {
    const row = g[i];
    const col = g.map((rr) => rr[i]);
    if (countInLine(row, 'bee') !== HALF || countInLine(col, 'bee') !== HALF) return false;
  }
  if (findConflicts(g, []).length > 0) return false;
  return constraintsSatisfied(g, constraints);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @tango/shared -- rules`
Expected: PASS (all rules tests green).

- [ ] **Step 5: Commit**

```bash
git add shared/src/rules.ts shared/test/rules.test.ts
git commit -m "feat(engine): rules, conflict detection, and solution validation"
```

---

## Task 5: Solver (uniqueness + solve)

**Files:**
- Create: `shared/src/solver.ts`
- Test: `shared/test/solver.test.ts`

- [ ] **Step 1: Write the failing test `shared/test/solver.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { countSolutions, solve } from '../src/solver';
import { isValidSolution } from '../src/rules';
import type { Grid, Puzzle } from '../src/types';

const B = 'bee', F = 'flower';
const VALID: Grid = [
  [B, F, B, F, B, F],
  [F, B, F, B, F, B],
  [B, F, B, F, B, F],
  [F, B, F, B, F, B],
  [B, F, B, F, B, F],
  [F, B, F, B, F, B],
];

function fullClues(g: Grid): Grid { return g.map((r) => r.slice()); }
function empty(): Grid { return Array.from({ length: 6 }, () => Array(6).fill(null)); }

describe('solver', () => {
  it('a fully-specified board has exactly one solution', () => {
    const p: Puzzle = { id: 'x', clues: fullClues(VALID), constraints: [], difficulty: 'easy' };
    expect(countSolutions(p, 2)).toBe(1);
  });

  it('an empty board has more than one solution (returns limit)', () => {
    const p: Puzzle = { id: 'x', clues: empty(), constraints: [], difficulty: 'easy' };
    expect(countSolutions(p, 2)).toBe(2);
  });

  it('solve returns a valid completed grid honoring constraints', () => {
    const p: Puzzle = {
      id: 'x',
      clues: empty(),
      constraints: [{ a: [0, 0], b: [0, 1], kind: 'x' }],
      difficulty: 'easy',
    };
    const result = solve(p);
    expect(result).not.toBeNull();
    expect(isValidSolution(result as Grid, p.constraints)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @tango/shared -- solver`
Expected: FAIL - `Cannot find module '../src/solver'`.

- [ ] **Step 3: Write `shared/src/solver.ts`**

```ts
import { Coord, EdgeConstraint, Grid, HALF, Puzzle, SIZE, Sym } from './types';
import { cloneGrid, constraintsSatisfied } from './rules';

const SYMS: Sym[] = ['bee', 'flower'];

/** Validity check limited to the impact of placing a symbol at (r, c). */
function partialValid(g: Grid, r: number, c: number, constraints: EdgeConstraint[]): boolean {
  const v = g[r][c];
  // No horizontal triple containing column c.
  for (let s = Math.max(0, c - 2); s <= Math.min(SIZE - 3, c); s++) {
    if (g[r][s] !== null && g[r][s] === g[r][s + 1] && g[r][s + 1] === g[r][s + 2]) return false;
  }
  // No vertical triple containing row r.
  for (let s = Math.max(0, r - 2); s <= Math.min(SIZE - 3, r); s++) {
    if (g[s][c] !== null && g[s][c] === g[s + 1][c] && g[s + 1][c] === g[s + 2][c]) return false;
  }
  // Row/column counts must not exceed HALF.
  let rc = 0, cc = 0;
  for (let k = 0; k < SIZE; k++) {
    if (g[r][k] === v) rc++;
    if (g[k][c] === v) cc++;
  }
  if (rc > HALF || cc > HALF) return false;
  // Constraints incident to (r, c) with both endpoints filled.
  for (const { a, b, kind } of constraints) {
    const touches = (a[0] === r && a[1] === c) || (b[0] === r && b[1] === c);
    if (!touches) continue;
    const va = g[a[0]][a[1]];
    const vb = g[b[0]][b[1]];
    if (va === null || vb === null) continue;
    const same = va === vb;
    if (kind === '=' && !same) return false;
    if (kind === 'x' && same) return false;
  }
  return true;
}

function emptyCells(g: Grid): Coord[] {
  const cells: Coord[] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (g[r][c] === null) cells.push([r, c]);
  return cells;
}

/** Counts solutions up to `limit` (default 2 - enough to test uniqueness). */
export function countSolutions(puzzle: Puzzle, limit = 2): number {
  const g = cloneGrid(puzzle.clues);
  const cells = emptyCells(g);
  let count = 0;
  const dfs = (i: number): void => {
    if (count >= limit) return;
    if (i === cells.length) {
      // Full board: verify all constraints (covers clue-to-clue edges).
      if (constraintsSatisfied(g, puzzle.constraints)) count++;
      return;
    }
    const [r, c] = cells[i];
    for (const s of SYMS) {
      g[r][c] = s;
      if (partialValid(g, r, c, puzzle.constraints)) dfs(i + 1);
      g[r][c] = null;
      if (count >= limit) return;
    }
  };
  dfs(0);
  return count;
}

/** Returns one valid completion, or null if unsolvable. */
export function solve(puzzle: Puzzle): Grid | null {
  const g = cloneGrid(puzzle.clues);
  const cells = emptyCells(g);
  const dfs = (i: number): boolean => {
    if (i === cells.length) return constraintsSatisfied(g, puzzle.constraints);
    const [r, c] = cells[i];
    for (const s of SYMS) {
      g[r][c] = s;
      if (partialValid(g, r, c, puzzle.constraints) && dfs(i + 1)) return true;
      g[r][c] = null;
    }
    return false;
  };
  return dfs(0) ? g : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @tango/shared -- solver`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/solver.ts shared/test/solver.test.ts
git commit -m "feat(engine): backtracking solver with uniqueness counting"
```

---

## Task 6: Generator (unlimited unique puzzles)

**Files:**
- Create: `shared/src/generator.ts`
- Test: `shared/test/generator.test.ts`

- [ ] **Step 1: Write the failing test `shared/test/generator.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { generateSolution, generatePuzzle } from '../src/generator';
import { countSolutions, solve } from '../src/solver';
import { isValidSolution } from '../src/rules';
import { mulberry32 } from '../src/rng';
import type { Difficulty } from '../src/types';

describe('generator', () => {
  it('generateSolution produces a valid balanced grid', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const sol = generateSolution(mulberry32(seed));
      expect(isValidSolution(sol, [])).toBe(true);
    }
  });

  (['easy', 'medium', 'hard'] as Difficulty[]).forEach((difficulty) => {
    it(`generatePuzzle(${difficulty}) is uniquely solvable`, () => {
      const puzzle = generatePuzzle(difficulty, mulberry32(42));
      expect(countSolutions(puzzle, 2)).toBe(1);
      const solution = solve(puzzle);
      expect(solution).not.toBeNull();
      expect(isValidSolution(solution!, puzzle.constraints)).toBe(true);
    });
  });

  it('easy puzzles keep at least as many clues as hard puzzles', () => {
    const countClues = (g: (string | null)[][]) =>
      g.flat().filter((c) => c !== null).length;
    const easy = generatePuzzle('easy', mulberry32(7));
    const hard = generatePuzzle('hard', mulberry32(7));
    expect(countClues(easy.clues)).toBeGreaterThanOrEqual(countClues(hard.clues));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @tango/shared -- generator`
Expected: FAIL - `Cannot find module '../src/generator'`.

- [ ] **Step 3: Write `shared/src/generator.ts`**

```ts
import { Coord, Difficulty, EdgeConstraint, Grid, HALF, Puzzle, SIZE, Sym } from './types';
import { cloneGrid, emptyGrid } from './rules';
import { countSolutions } from './solver';

const SYMS: Sym[] = ['bee', 'flower'];

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function allCoords(): Coord[] {
  const cells: Coord[] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) cells.push([r, c]);
  return cells;
}

function placementValid(g: Grid, r: number, c: number): boolean {
  const v = g[r][c];
  for (let s = Math.max(0, c - 2); s <= Math.min(SIZE - 3, c); s++) {
    if (g[r][s] !== null && g[r][s] === g[r][s + 1] && g[r][s + 1] === g[r][s + 2]) return false;
  }
  for (let s = Math.max(0, r - 2); s <= Math.min(SIZE - 3, r); s++) {
    if (g[s][c] !== null && g[s][c] === g[s + 1][c] && g[s + 1][c] === g[s + 2][c]) return false;
  }
  let rc = 0, cc = 0;
  for (let k = 0; k < SIZE; k++) {
    if (g[r][k] === v) rc++;
    if (g[k][c] === v) cc++;
  }
  return rc <= HALF && cc <= HALF;
}

/** Random valid, fully-filled grid via randomized backtracking. */
export function generateSolution(rnd: () => number = Math.random): Grid {
  const g = emptyGrid();
  const cells = allCoords();
  const dfs = (i: number): boolean => {
    if (i === cells.length) return true;
    const [r, c] = cells[i];
    for (const s of shuffle(SYMS, rnd)) {
      g[r][c] = s;
      if (placementValid(g, r, c) && dfs(i + 1)) return true;
      g[r][c] = null;
    }
    return false;
  };
  dfs(0);
  return g;
}

function deriveConstraints(sol: Grid, density: number, rnd: () => number): EdgeConstraint[] {
  const edges: EdgeConstraint[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (c + 1 < SIZE && rnd() < density) {
        edges.push({ a: [r, c], b: [r, c + 1], kind: sol[r][c] === sol[r][c + 1] ? '=' : 'x' });
      }
      if (r + 1 < SIZE && rnd() < density) {
        edges.push({ a: [r, c], b: [r + 1, c], kind: sol[r][c] === sol[r + 1][c] ? '=' : 'x' });
      }
    }
  }
  return edges;
}

const DIFFICULTY: Record<Difficulty, { density: number; minClues: number }> = {
  easy: { density: 0.30, minClues: 12 },
  medium: { density: 0.18, minClues: 6 },
  hard: { density: 0.10, minClues: 0 },
};

let seq = 0;

/**
 * Build a uniquely-solvable puzzle: derive constraints from a random solution,
 * then greedily remove clues while uniqueness is preserved.
 */
export function generatePuzzle(difficulty: Difficulty, rnd: () => number = Math.random): Puzzle {
  const sol = generateSolution(rnd);
  const { density, minClues } = DIFFICULTY[difficulty];
  const constraints = deriveConstraints(sol, density, rnd);
  const clues = cloneGrid(sol);

  let remaining = SIZE * SIZE;
  for (const [r, c] of shuffle(allCoords(), rnd)) {
    if (remaining <= minClues) break;
    const saved = clues[r][c];
    clues[r][c] = null;
    const stillUnique = countSolutions({ id: 't', clues, constraints, difficulty }, 2) === 1;
    if (stillUnique) {
      remaining--;
    } else {
      clues[r][c] = saved;
    }
  }

  return { id: `p${Date.now()}-${seq++}`, clues, constraints, difficulty };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @tango/shared -- generator`
Expected: PASS (all difficulties uniquely solvable).

- [ ] **Step 5: Commit**

```bash
git add shared/src/generator.ts shared/test/generator.test.ts
git commit -m "feat(engine): unique-solution puzzle generator with difficulty tuning"
```

---

## Task 7: Public API barrel

**Files:**
- Create: `shared/src/index.ts`

- [ ] **Step 1: Write `shared/src/index.ts`**

```ts
export * from './types';
export * from './rng';
export * from './rules';
export * from './solver';
export * from './generator';
```

- [ ] **Step 2: Run the full shared test suite**

Run: `npm test -w @tango/shared`
Expected: PASS - all rules, solver, and generator tests green.

- [ ] **Step 3: Commit**

```bash
git add shared/src/index.ts
git commit -m "feat(engine): public barrel export"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Rules (balance, no-3-in-a-row, `=`/`x`), solver (uniqueness + validation), generator (unlimited, unique, difficulty), and conflict detection for live highlighting are all implemented and tested. Matches spec sections "The Tango Engine" and "Testing Strategy" (engine portion).
- **Placeholder scan:** No TBD/TODO; every step has runnable code and commands.
- **Type consistency:** `Sym`, `Cell`, `Grid`, `Coord`, `EdgeConstraint`, `Puzzle`, `Difficulty`, `SIZE`, `HALF` defined in Task 2 and used consistently in Tasks 4-6. `findConflicts`/`constraintsSatisfied`/`isValidSolution`/`countSolutions`/`solve`/`generateSolution`/`generatePuzzle` signatures are consistent across tasks.

**End of Plan 1.** Plan 2 (Realtime Server) depends on `@tango/shared` exports defined here.
