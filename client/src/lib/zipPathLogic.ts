import { canExtendPath, type PublicZipPuzzle, type ZipCoord, type ZipPuzzle } from '@tango/shared';

function asPuzzle(p: PublicZipPuzzle): ZipPuzzle {
  return {
    id: p.id,
    size: p.size,
    waypoints: p.waypoints,
    walls: p.walls,
    difficulty: p.difficulty,
  };
}

export function extendPathFromPaint(
  path: ZipCoord[],
  cell: ZipCoord,
  puzzle: PublicZipPuzzle,
): ZipCoord[] {
  if (path.length === 0) {
    const start = puzzle.waypoints.find((w) => w.n === 1);
    if (!start || start.r !== cell.r || start.c !== cell.c) return path;
    return [cell];
  }
  const prev = path[path.length - 2];
  if (prev && prev.r === cell.r && prev.c === cell.c) {
    return path.slice(0, -1);
  }
  if (!canExtendPath(path, cell, asPuzzle(puzzle))) return path;
  return [...path, cell];
}

export function clearPath(): ZipCoord[] {
  return [];
}
