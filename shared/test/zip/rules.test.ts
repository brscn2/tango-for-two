import { describe, expect, it } from 'vitest';
import { canExtendPath, isValidZipSolution, waypointsRespected } from '../../src/zip/rules';
import type { ZipPuzzle } from '../../src/zip/types';

const puzzle: ZipPuzzle = {
  id: 't',
  size: 6,
  difficulty: 'easy',
  waypoints: [
    { n: 1, r: 0, c: 0 },
    { n: 2, r: 0, c: 2 },
  ],
  walls: [{ r1: 0, c1: 0, r2: 1, c2: 0 }],
};

describe('zip rules', () => {
  it('extends only orthogonally without walls or revisits', () => {
    const path = [{ r: 0, c: 0 }];
    expect(canExtendPath(path, { r: 0, c: 1 }, puzzle)).toBe(true);
    expect(canExtendPath(path, { r: 1, c: 0 }, puzzle)).toBe(false); // wall
    expect(canExtendPath(path, { r: 1, c: 1 }, puzzle)).toBe(false); // diagonal
    expect(canExtendPath([{ r: 0, c: 0 }, { r: 0, c: 1 }], { r: 0, c: 0 }, puzzle)).toBe(false);
  });

  it('requires waypoints in order along a full path', () => {
    expect(
      waypointsRespected(
        [
          { r: 0, c: 0 },
          { r: 0, c: 1 },
          { r: 0, c: 2 },
        ],
        puzzle.waypoints,
      ),
    ).toBe(true);
    expect(
      waypointsRespected(
        [
          { r: 0, c: 2 },
          { r: 0, c: 1 },
          { r: 0, c: 0 },
        ],
        puzzle.waypoints,
      ),
    ).toBe(false);
  });
});
