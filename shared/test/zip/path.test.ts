import { describe, expect, it } from 'vitest';
import {
  canonicalizeWall,
  wallKey,
  parseWallKey,
  orthogonalNeighbors,
  isOrthogonalStep,
  buildWallSet,
  hasWallBetween,
} from '../../src/zip/path';

describe('zip path helpers', () => {
  it('canonicalizes wall endpoints', () => {
    expect(canonicalizeWall({ r1: 1, c1: 0, r2: 0, c2: 0 })).toEqual({
      r1: 0, c1: 0, r2: 1, c2: 0,
    });
  });

  it('round-trips wallKey', () => {
    const w = canonicalizeWall({ r1: 0, c1: 0, r2: 0, c2: 1 });
    expect(parseWallKey(wallKey(w))).toEqual(w);
  });

  it('lists orthogonal neighbors inside bounds', () => {
    expect(orthogonalNeighbors(0, 0, 6)).toEqual([
      { r: 0, c: 1 },
      { r: 1, c: 0 },
    ]);
  });

  it('detects orthogonal steps and walls', () => {
    expect(isOrthogonalStep({ r: 0, c: 0 }, { r: 0, c: 1 })).toBe(true);
    expect(isOrthogonalStep({ r: 0, c: 0 }, { r: 1, c: 1 })).toBe(false);
    const set = buildWallSet([{ r1: 0, c1: 0, r2: 0, c2: 1 }]);
    expect(hasWallBetween(set, { r: 0, c: 0 }, { r: 0, c: 1 })).toBe(true);
    expect(hasWallBetween(set, { r: 0, c: 0 }, { r: 1, c: 0 })).toBe(false);
  });
});
