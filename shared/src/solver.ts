import { Coord, EdgeConstraint, Grid, HALF, Puzzle, SIZE, Sym } from './types';
import { cloneGrid, isValidSolution } from './rules';

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
  // LinkedIn uniqueness: a newly completed row/col must not match another complete one.
  if (g[r].every((cell) => cell !== null)) {
    const key = g[r].join(',');
    for (let rr = 0; rr < SIZE; rr++) {
      if (rr === r) continue;
      if (g[rr].every((cell) => cell !== null) && g[rr].join(',') === key) return false;
    }
  }
  if (g.every((row) => row[c] !== null)) {
    const key = g.map((row) => row[c]).join(',');
    for (let cc = 0; cc < SIZE; cc++) {
      if (cc === c) continue;
      if (g.every((row) => row[cc] !== null) && g.map((row) => row[cc]).join(',') === key) return false;
    }
  }
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
      // Full board: reject illegal pre-filled inputs and confirm a true solution.
      if (isValidSolution(g, puzzle.constraints)) count++;
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
    if (i === cells.length) return isValidSolution(g, puzzle.constraints);
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
