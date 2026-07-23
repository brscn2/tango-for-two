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
  const ingredient = waypoint ? ingredientForWaypoint(waypoint.n) : null;

  return (
    <div
      data-r={r}
      data-c={c}
      className={`relative flex aspect-square items-center justify-center select-none rounded-md
        ${onPath
          ? 'bg-orange-500 shadow-inner dark:bg-orange-500/90'
          : 'bg-amber-50 dark:bg-stone-800'}
        ring-1 ring-inset ring-stone-300/80 dark:ring-stone-600`}
    >
      {isTip && (
        <img
          src={BIBI_SRC}
          alt="path tip"
          className="pointer-events-none absolute z-10 h-[72%] w-[72%] rounded-full border-[3px] border-white object-cover shadow-md"
          draggable={false}
        />
      )}
      {waypoint && ingredient && (
        <div
          className={`pointer-events-none z-[5] flex flex-col items-center justify-center gap-0.5
            ${isTip ? 'opacity-0' : ''}`}
        >
          <span className="text-2xl leading-none drop-shadow-sm sm:text-3xl" aria-hidden>
            {ingredient.emoji}
          </span>
          <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-sm font-black tabular-nums leading-none text-stone-900 shadow-sm dark:bg-stone-950/90 dark:text-amber-50 sm:text-base">
            {waypoint.n}
          </span>
        </div>
      )}
    </div>
  );
}
