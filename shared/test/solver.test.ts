import { describe, it, expect } from 'vitest';
import { countSolutions, solve } from '../src/solver';
import { isValidSolution } from '../src/rules';
import type { Grid, Puzzle } from '../src/types';

const B = 'bee', F = 'flower';
// LinkedIn-valid fixture (unique rows + columns).
const VALID: Grid = [
  [B, B, F, B, F, F],
  [F, F, B, F, B, B],
  [B, F, B, F, B, F],
  [F, B, F, B, F, B],
  [B, F, F, B, B, F],
  [F, B, B, F, F, B],
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

  it('rejects a fully-filled illegal board (imbalanced)', () => {
    // All bees in row 0 → imbalanced (and also > HALF bees).
    const illegal: Grid = [
      [B, B, B, B, B, B],
      [F, B, F, B, F, B],
      [B, F, B, F, B, F],
      [F, B, F, B, F, B],
      [B, F, B, F, B, F],
      [F, B, F, B, F, B],
    ];
    const p: Puzzle = { id: 'x', clues: fullClues(illegal), constraints: [], difficulty: 'easy' };
    expect(countSolutions(p, 2)).toBe(0);
    expect(solve(p)).toBeNull();
  });

  it('rejects a fully-filled illegal board (3-in-a-row)', () => {
    const illegal: Grid = fullClues(VALID);
    illegal[0][0] = B; illegal[0][1] = B; illegal[0][2] = B;
    // Keep balance by flipping the matching flowers later in the row.
    illegal[0][3] = F; illegal[0][4] = F; illegal[0][5] = F;
    const p: Puzzle = { id: 'x', clues: illegal, constraints: [], difficulty: 'easy' };
    expect(countSolutions(p, 2)).toBe(0);
    expect(solve(p)).toBeNull();
  });

  it('returns 0 solutions when constraints contradict', () => {
    // Same edge cannot be both '=' and 'x'.
    const p: Puzzle = {
      id: 'x',
      clues: fullClues(VALID),
      constraints: [
        { a: [0, 0], b: [0, 1], kind: '=' },
        { a: [0, 0], b: [0, 1], kind: 'x' },
      ],
      difficulty: 'easy',
    };
    expect(countSolutions(p, 2)).toBe(0);
    expect(solve(p)).toBeNull();
  });

  it('rejects a fully-filled board with duplicate rows', () => {
    const dups: Grid = [
      [B, F, B, F, B, F],
      [F, B, F, B, F, B],
      [B, F, B, F, B, F],
      [F, B, F, B, F, B],
      [B, F, B, F, B, F],
      [F, B, F, B, F, B],
    ];
    const p: Puzzle = { id: 'x', clues: fullClues(dups), constraints: [], difficulty: 'easy' };
    expect(countSolutions(p, 2)).toBe(0);
    expect(solve(p)).toBeNull();
  });
});
