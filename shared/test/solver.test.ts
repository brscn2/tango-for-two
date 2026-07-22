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
