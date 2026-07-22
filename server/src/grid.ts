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
