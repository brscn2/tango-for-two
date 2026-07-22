import { Cell, Coord, EdgeConstraint, Grid, SIZE, Sym, half } from './types';

export function opposite(s: Sym): Sym {
  return s === 'bee' ? 'flower' : 'bee';
}

export function emptyGrid(size: number = SIZE): Grid {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
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
  const n = g.length;
  const h = half(n);
  const set = new Set<string>();
  const mark = (r: number, c: number) => set.add(`${r},${c}`);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = g[r][c];
      if (v === null) continue;
      if (c + 2 < n && g[r][c + 1] === v && g[r][c + 2] === v) {
        mark(r, c); mark(r, c + 1); mark(r, c + 2);
      }
      if (r + 2 < n && g[r + 1][c] === v && g[r + 2][c] === v) {
        mark(r, c); mark(r + 1, c); mark(r + 2, c);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const row = g[i];
    const col = g.map((rr) => rr[i]);
    (['bee', 'flower'] as Sym[]).forEach((s) => {
      if (countInLine(row, s) > h) for (let c = 0; c < n; c++) if (row[c] === s) mark(i, c);
      if (countInLine(col, s) > h) for (let r = 0; r < n; r++) if (col[r] === s) mark(r, i);
    });
  }

  for (const { a, b, kind } of constraints) {
    const va = g[a[0]][a[1]];
    const vb = g[b[0]][b[1]];
    if (va === null || vb === null) continue;
    const same = va === vb;
    if ((kind === '=' && !same) || (kind === 'x' && same)) {
      mark(a[0], a[1]); mark(b[0], b[1]);
    }
  }

  const rowGroups = new Map<string, number[]>();
  const colGroups = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const row = g[i];
    if (row.every((c) => c !== null)) {
      const key = row.join(',');
      const list = rowGroups.get(key) ?? [];
      list.push(i);
      rowGroups.set(key, list);
    }
    const col = g.map((rr) => rr[i]);
    if (col.every((c) => c !== null)) {
      const key = col.join(',');
      const list = colGroups.get(key) ?? [];
      list.push(i);
      colGroups.set(key, list);
    }
  }
  for (const rows of rowGroups.values()) {
    if (rows.length < 2) continue;
    for (const r of rows) for (let c = 0; c < n; c++) mark(r, c);
  }
  for (const cols of colGroups.values()) {
    if (cols.length < 2) continue;
    for (const c of cols) for (let r = 0; r < n; r++) mark(r, c);
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
  const n = g.length;
  const h = half(n);
  for (let i = 0; i < n; i++) {
    const row = g[i];
    const col = g.map((rr) => rr[i]);
    if (countInLine(row, 'bee') !== h || countInLine(col, 'bee') !== h) return false;
  }
  if (findConflicts(g, []).length > 0) return false;
  return constraintsSatisfied(g, constraints);
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}
