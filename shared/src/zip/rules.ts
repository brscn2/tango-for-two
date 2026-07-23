import { buildWallSet, cellKey, hasWallBetween, isOrthogonalStep, pathCoversGrid } from './path';
import type { ZipCoord, ZipPuzzle, ZipWaypoint } from './types';

export function canExtendPath(path: ZipCoord[], next: ZipCoord, puzzle: ZipPuzzle): boolean {
  if (path.length === 0) return true;
  const tip = path[path.length - 1];
  if (!isOrthogonalStep(tip, next)) return false;
  const wallSet = buildWallSet(puzzle.walls);
  if (hasWallBetween(wallSet, tip, next)) return false;
  const seen = new Set(path.map(cellKey));
  if (seen.has(cellKey(next))) return false;
  if (next.r < 0 || next.r >= puzzle.size || next.c < 0 || next.c >= puzzle.size) return false;
  return true;
}

export function waypointsRespected(path: ZipCoord[], waypoints: ZipWaypoint[]): boolean {
  const ordered = [...waypoints].sort((a, b) => a.n - b.n);
  let wi = 0;
  for (const cell of path) {
    if (wi >= ordered.length) break;
    const w = ordered[wi];
    if (cell.r === w.r && cell.c === w.c) wi += 1;
  }
  return wi === ordered.length;
}

export function pathRespectsWalls(path: ZipCoord[], puzzle: ZipPuzzle): boolean {
  const wallSet = buildWallSet(puzzle.walls);
  for (let i = 1; i < path.length; i++) {
    if (!isOrthogonalStep(path[i - 1], path[i])) return false;
    if (hasWallBetween(wallSet, path[i - 1], path[i])) return false;
  }
  return true;
}

export function isValidZipSolution(path: ZipCoord[], puzzle: ZipPuzzle): boolean {
  if (!pathCoversGrid(path, puzzle.size)) return false;
  if (!pathRespectsWalls(path, puzzle)) return false;
  if (!waypointsRespected(path, puzzle.waypoints)) return false;
  // Must start at waypoint 1 if present
  const start = puzzle.waypoints.find((w) => w.n === 1);
  if (start && (path[0].r !== start.r || path[0].c !== start.c)) return false;
  return true;
}
