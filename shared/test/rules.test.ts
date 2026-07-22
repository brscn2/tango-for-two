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

  it('isValidSolution rejects an imbalanced complete grid', () => {
    const g = cloneGrid(VALID);
    g[0][0] = B; g[0][1] = B; g[0][2] = B;
    g[0][3] = B; g[0][4] = F; g[0][5] = F; // 4 bees, 2 flowers in row 0
    expect(isValidSolution(g, [])).toBe(false);
  });

  it('isValidSolution rejects a vertical 3-in-a-row', () => {
    const g = cloneGrid(VALID);
    g[0][0] = B; g[1][0] = B; g[2][0] = B;
    expect(isValidSolution(g, [])).toBe(false);
  });

  it('findConflicts flags a horizontal 3-in-a-row', () => {
    const g = cloneGrid(VALID);
    g[0][0] = B; g[0][1] = B; g[0][2] = B;
    const conflicts = findConflicts(g, []);
    expect(conflicts).toEqual(
      expect.arrayContaining([[0, 0], [0, 1], [0, 2]]),
    );
  });

  it('findConflicts flags a vertical 3-in-a-row', () => {
    const g = cloneGrid(VALID);
    g[0][0] = B; g[1][0] = B; g[2][0] = B;
    const conflicts = findConflicts(g, []);
    expect(conflicts).toEqual(
      expect.arrayContaining([[0, 0], [1, 0], [2, 0]]),
    );
  });

  it('findConflicts flags > HALF of one symbol in a row', () => {
    const g = cloneGrid(VALID);
    g[0][0] = B; g[0][1] = B; g[0][2] = B;
    g[0][3] = B; g[0][4] = F; g[0][5] = F; // 4 bees > HALF
    const conflicts = findConflicts(g, []);
    expect(conflicts).toEqual(
      expect.arrayContaining([[0, 0], [0, 1], [0, 2], [0, 3]]),
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
