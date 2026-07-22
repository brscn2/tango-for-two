import { describe, it, expect } from 'vitest';
import { solveLogic } from '../src/logicSolver';
import { emptyGrid } from '../src/rules';
import { generatePuzzle } from '../src/generator';
import { mulberry32 } from '../src/rng';
import type { Puzzle } from '../src/types';

const B = 'bee', F = 'flower';

describe('logicSolver', () => {
  it('propagates across = and x', () => {
    const clues = emptyGrid(4);
    clues[0][0] = B;
    const p: Puzzle = {
      id: 't',
      size: 4,
      clues,
      constraints: [
        { a: [0, 0], b: [0, 1], kind: '=' },
        { a: [0, 1], b: [0, 2], kind: 'x' },
      ],
      difficulty: 'easy',
    };
    const { grid } = solveLogic(p);
    expect(grid[0][1]).toBe(B);
    expect(grid[0][2]).toBe(F);
  });

  it('almost-full fills the rest of a row', () => {
    const clues = emptyGrid(4);
    clues[0][0] = B;
    clues[0][1] = B;
    clues[0][2] = null;
    clues[0][3] = null;
    const p: Puzzle = { id: 't', size: 4, clues, constraints: [], difficulty: 'easy' };
    const { grid } = solveLogic(p);
    expect(grid[0][2]).toBe(F);
    expect(grid[0][3]).toBe(F);
  });

  it('gap-fill forces the middle cell', () => {
    const clues = emptyGrid(4);
    clues[0][0] = B;
    clues[0][2] = B;
    const p: Puzzle = { id: 't', size: 4, clues, constraints: [], difficulty: 'easy' };
    const { grid } = solveLogic(p);
    expect(grid[0][1]).toBe(F);
  });

  it('completes generated easy 6×6 puzzles by logic', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const puzzle = generatePuzzle(6, 'easy', mulberry32(seed));
      const { complete } = solveLogic(puzzle);
      expect(complete).toBe(true);
    }
  });
});
