import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/rng';
import { generateZipPuzzle, generateHamiltonPath } from '../../src/zip/generator';
import { countZipSolutions } from '../../src/zip/solver';
import { isValidZipSolution } from '../../src/zip/rules';
import { pathCoversGrid } from '../../src/zip/path';

describe('generateHamiltonPath', () => {
  it('covers every cell on 6x6', () => {
    const path = generateHamiltonPath(6, mulberry32(3));
    expect(pathCoversGrid(path, 6)).toBe(true);
  });
});

describe('generateZipPuzzle', () => {
  it('returns a unique solvable 6x6 puzzle for each difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const { puzzle, solutionPath } = generateZipPuzzle(6, difficulty, mulberry32(42 + difficulty.length));
      expect(isValidZipSolution(solutionPath, puzzle)).toBe(true);
      expect(countZipSolutions(puzzle, 2)).toBe(1);
      expect(puzzle.waypoints[0].n).toBe(1);
    }
  }, 30_000);

  it('returns unique solvable puzzles for 7 and 8 (medium)', () => {
    for (const size of [7, 8] as const) {
      const { puzzle, solutionPath } = generateZipPuzzle(size, 'medium', mulberry32(size * 10));
      expect(isValidZipSolution(solutionPath, puzzle)).toBe(true);
      expect(countZipSolutions(puzzle, 2)).toBe(1);
    }
  }, 60_000);

  it('hard has more waypoints than easy on 6x6', () => {
    const easy = generateZipPuzzle(6, 'easy', mulberry32(1));
    const hard = generateZipPuzzle(6, 'hard', mulberry32(2));
    expect(hard.puzzle.waypoints.length).toBeGreaterThan(easy.puzzle.waypoints.length);
  }, 30_000);

  it('includes walls on a typical hard 6x6 puzzle', () => {
    const hard = generateZipPuzzle(6, 'hard', mulberry32(9));
    // Forced fallback has 0 walls; normal hard band should keep some.
    expect(hard.puzzle.walls.length).toBeGreaterThan(0);
  }, 30_000);
});
