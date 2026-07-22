import { describe, it, expect } from 'vitest';
import { generateSolution, generatePuzzle } from '../src/generator';
import { countSolutions, solve } from '../src/solver';
import { isValidSolution, gridsEqual } from '../src/rules';
import { solveLogic } from '../src/logicSolver';
import { mulberry32 } from '../src/rng';
import { BOARD_SIZES, type Difficulty } from '../src/types';

describe('generator', () => {
  it('generateSolution produces LinkedIn-valid grids for each size', () => {
    for (const size of BOARD_SIZES) {
      for (let seed = 1; seed <= 3; seed++) {
        const sol = generateSolution(size, mulberry32(seed * 17 + size));
        expect(sol.length).toBe(size);
        expect(isValidSolution(sol, [])).toBe(true);
      }
    }
  });

  for (const size of [4, 6] as const) {
    (['easy', 'medium', 'hard'] as Difficulty[]).forEach((difficulty) => {
      it(`generatePuzzle(${size}, ${difficulty}) is logic-solvable and unique`, () => {
        for (const seed of [42, 7]) {
          const puzzle = generatePuzzle(size, difficulty, mulberry32(seed));
          expect(puzzle.size).toBe(size);
          expect(countSolutions(puzzle, 2)).toBe(1);
          const logic = solveLogic(puzzle);
          expect(logic.complete).toBe(true);
          const solution = solve(puzzle);
          expect(solution).not.toBeNull();
          expect(gridsEqual(logic.grid, solution!)).toBe(true);
          expect(isValidSolution(solution!, puzzle.constraints)).toBe(true);
        }
      });
    });
  }

  it('8×8 and 10×10 easy puzzles generate and are unique', () => {
    for (const size of [8, 10] as const) {
      const puzzle = generatePuzzle(size, 'easy', mulberry32(99));
      expect(puzzle.size).toBe(size);
      expect(countSolutions(puzzle, 2)).toBe(1);
      expect(solveLogic(puzzle).complete).toBe(true);
    }
  }, 60_000);
});
