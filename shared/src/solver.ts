import { Coord, EdgeConstraint, Grid, Puzzle, Sym, half } from './types';
import { cloneGrid, isValidSolution } from './rules';

const SYMS: Sym[] = ['bee', 'flower'];

function partialValid(g: Grid, r: number, c: number, constraints: EdgeConstraint[]): boolean {
  const n = g.length;
  const h = half(n);
  const v = g[r][c];
  for (let s = Math.max(0, c - 2); s <= Math.min(n - 3, c); s++) {
    if (g[r][s] !== null && g[r][s] === g[r][s + 1] && g[r][s + 1] === g[r][s + 2]) return false;
  }
  for (let s = Math.max(0, r - 2); s <= Math.min(n - 3, r); s++) {
    if (g[s][c] !== null && g[s][c] === g[s + 1][c] && g[s + 1][c] === g[s + 2][c]) return false;
  }
  let rc = 0, cc = 0;
  for (let k = 0; k < n; k++) {
    if (g[r][k] === v) rc++;
    if (g[k][c] === v) cc++;
  }
  if (rc > h || cc > h) return false;
  if (g[r].every((cell) => cell !== null)) {
    const key = g[r].join(',');
    for (let rr = 0; rr < n; rr++) {
      if (rr === r) continue;
      if (g[rr].every((cell) => cell !== null) && g[rr].join(',') === key) return false;
    }
  }
  if (g.every((row) => row[c] !== null)) {
    const key = g.map((row) => row[c]).join(',');
    for (let cc2 = 0; cc2 < n; cc2++) {
      if (cc2 === c) continue;
      if (g.every((row) => row[cc2] !== null) && g.map((row) => row[cc2]).join(',') === key) return false;
    }
  }
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
  const n = g.length;
  const cells: Coord[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g[r][c] === null) cells.push([r, c]);
  return cells;
}

export function countSolutions(puzzle: Puzzle, limit = 2): number {
  const g = cloneGrid(puzzle.clues);
  const cells = emptyCells(g);
  let count = 0;
  const dfs = (i: number): void => {
    if (count >= limit) return;
    if (i === cells.length) {
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
