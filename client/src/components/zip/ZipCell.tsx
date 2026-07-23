import type { PublicZipPuzzle, ZipCoord } from '@tango/shared';
import { BIBI_SRC, ingredientForWaypoint } from '../../config/zipCosmetics';

export function ZipCell({
  r,
  c,
  puzzle,
  path,
  pathIndex,
}: {
  r: number;
  c: number;
  puzzle: PublicZipPuzzle;
  path: ZipCoord[];
  pathIndex: number; // -1 if not on path
}) {
  const waypoint = puzzle.waypoints.find((w) => w.r === r && w.c === c);
  const isTip = pathIndex >= 0 && pathIndex === path.length - 1;
  const onPath = pathIndex >= 0;

  return (
    <div
      data-r={r}
      data-c={c}
      className={`relative flex aspect-square items-center justify-center select-none
        ${onPath ? 'bg-orange-400/80' : 'bg-orange-50 dark:bg-orange-950/40'}
        border border-orange-200/80 dark:border-orange-800/60`}
    >
      {isTip && (
        <img
          src={BIBI_SRC}
          alt="path tip"
          className="pointer-events-none absolute z-10 h-[70%] w-[70%] rounded-full border-2 border-orange-600 object-cover shadow"
          draggable={false}
        />
      )}
      {waypoint && (
        <span
          className={`pointer-events-none z-[5] text-[10px] font-bold leading-none sm:text-xs
            ${isTip ? 'opacity-0' : 'text-orange-900 dark:text-orange-100'}`}
        >
          {ingredientForWaypoint(waypoint.n).emoji}
          {waypoint.n}
        </span>
      )}
    </div>
  );
}
