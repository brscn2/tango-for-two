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
