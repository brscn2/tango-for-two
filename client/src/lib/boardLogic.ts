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
