import { describe, expect, it } from 'vitest';
import { extendPathFromPaint, clearPath } from '../lib/zipPathLogic';
import type { PublicZipPuzzle } from '@tango/shared';

const puzzle: PublicZipPuzzle = {
  id: 'p',
  size: 6,
  difficulty: 'easy',
  waypoints: [{ n: 1, r: 0, c: 0 }],
  walls: [{ r1: 0, c1: 0, r2: 0, c2: 1 }],
};

describe('zipPathLogic', () => {
  it('starts only on waypoint 1', () => {
    expect(extendPathFromPaint([], { r: 1, c: 1 }, puzzle)).toEqual([]);
    expect(extendPathFromPaint([], { r: 0, c: 0 }, puzzle)).toEqual([{ r: 0, c: 0 }]);
  });

  it('does not cross walls', () => {
    const path = [{ r: 0, c: 0 }];
    expect(extendPathFromPaint(path, { r: 0, c: 1 }, puzzle)).toEqual(path);
    expect(extendPathFromPaint(path, { r: 1, c: 0 }, puzzle)).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 0 },
    ]);
  });

  it('clears', () => {
    expect(clearPath()).toEqual([]);
  });
});
