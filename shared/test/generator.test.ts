import { describe, it, expect } from 'vitest';
import { generateSolution, generatePuzzle } from '../src/generator';
import { countSolutions, solve } from '../src/solver';
import { isValidSolution } from '../src/rules';
import { mulberry32 } from '../src/rng';
import type { Difficulty } from '../src/types';

describe('generator', () => {
  it('generateSolution produces a valid balanced grid with unique rows/cols', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const sol = generateSolution(mulberry32(seed));
      expect(isValidSolution(sol, [])).toBe(true);
    }
  });

  (['easy', 'medium', 'hard'] as Difficulty[]).forEach((difficulty) => {
    it(`generatePuzzle(${difficulty}) is uniquely solvable under full LinkedIn rules`, () => {
      for (const seed of [42, 7, 99, 1234]) {
        const puzzle = generatePuzzle(difficulty, mulberry32(seed));
        expect(countSolutions(puzzle, 2)).toBe(1);
        const solution = solve(puzzle);
        expect(solution).not.toBeNull();
        expect(isValidSolution(solution!, puzzle.constraints)).toBe(true);
      }
    });
  });

  it('easy puzzles keep at least as many clues as hard puzzles', () => {
    const countClues = (g: (string | null)[][]) =>
      g.flat().filter((c) => c !== null).length;
    const easy = generatePuzzle('easy', mulberry32(7));
    const hard = generatePuzzle('hard', mulberry32(7));
    expect(countClues(easy.clues)).toBeGreaterThanOrEqual(countClues(hard.clues));
  });
});
