import { describe, expect, it } from 'vitest';
import { countZipSolutions, findZipSolution } from '../../src/zip/solver';
import type { ZipPuzzle } from '../../src/zip/types';
import { isValidZipSolution } from '../../src/zip/rules';

function openSnakePuzzle(): { puzzle: ZipPuzzle; pathLen: number } {
  const puzzle: ZipPuzzle = {
    id: 'open',
    size: 6,
    difficulty: 'easy',
    waypoints: [
      { n: 1, r: 0, c: 0 },
      { n: 2, r: 5, c: 5 },
    ],
    walls: [],
  };
  return { puzzle, pathLen: 36 };
}

describe('zip solver', () => {
  it('finds at least one solution on an open corner-to-corner puzzle', () => {
    const { puzzle } = openSnakePuzzle();
    const sol = findZipSolution(puzzle);
    expect(sol).not.toBeNull();
    expect(isValidZipSolution(sol!, puzzle)).toBe(true);
  }, 15_000);

  it('counts more than one solution when under-constrained', () => {
    const { puzzle } = openSnakePuzzle();
    expect(countZipSolutions(puzzle, 3)).toBeGreaterThan(1);
  }, 15_000);

  it('returns 1 when path is forced by walls (generator will supply); smoke: limit 1 stops early', () => {
    const { puzzle } = openSnakePuzzle();
    expect(countZipSolutions(puzzle, 1)).toBe(1);
  }, 15_000);
});
