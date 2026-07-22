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
