import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { PublicZipPuzzle, ZipCoord } from '@tango/shared';
import { wallKey } from '@tango/shared';
import { clearPath, extendPathFromPaint } from '../../lib/zipPathLogic';
import { ZipCell } from './ZipCell';

function pathIndexAt(path: ZipCoord[], r: number, c: number): number {
  return path.findIndex((p) => p.r === r && p.c === c);
}

/** Cell pitch in CSS px — larger than before so waypoints & walls read clearly. */
const CELL = 56;
const GAP = 6;
const WALL = 6;

export function ZipBoard({
  puzzle,
  path,
  onPathChange,
  disabled = false,
}: {
  puzzle: PublicZipPuzzle;
  path: ZipCoord[];
  onPathChange: (path: ZipCoord[]) => void;
  disabled?: boolean;
}) {
  const painting = useRef(false);
  const pathRef = useRef(path);
  pathRef.current = path;
  const size = puzzle.size;
  const wallSet = new Set(puzzle.walls.map((w) => wallKey(w)));
  const boardPx = size * CELL + (size - 1) * GAP;

  const paintAt = (r: number, c: number) => {
    if (disabled) return;
    const next = extendPathFromPaint(pathRef.current, { r, c }, puzzle);
    pathRef.current = next;
    onPathChange(next);
  };

  const cellFromEvent = (e: ReactPointerEvent): { r: number; c: number } | null => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const cell = el?.closest?.('[data-r][data-c]') as HTMLElement | null;
    if (!cell) return null;
    return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
  };

  const hasWallRight = (r: number, c: number) =>
    c + 1 < size && wallSet.has(wallKey({ r1: r, c1: c, r2: r, c2: c + 1 }));
  const hasWallDown = (r: number, c: number) =>
    r + 1 < size && wallSet.has(wallKey({ r1: r, c1: c, r2: r + 1, c2: c }));

  return (
    <div className="rounded-2xl bg-gradient-to-b from-orange-100 to-amber-50 p-4 shadow-inner dark:from-stone-900 dark:to-orange-950/60">
      <div
        className="relative mx-auto touch-none"
        style={{ width: '100%', maxWidth: boardPx }}
        onPointerDown={(e) => {
          if (disabled) return;
          painting.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          const cell = cellFromEvent(e);
          if (cell) paintAt(cell.r, cell.c);
        }}
        onPointerMove={(e) => {
          if (!painting.current || disabled) return;
          const cell = cellFromEvent(e);
          if (cell) paintAt(cell.r, cell.c);
        }}
        onPointerUp={() => { painting.current = false; }}
        onPointerCancel={() => { painting.current = false; }}
      >
        <div
          className="relative rounded-xl bg-stone-800 p-2 dark:bg-stone-950"
          style={{ aspectRatio: '1 / 1' }}
        >
          <div
            className="grid h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gap: GAP,
            }}
          >
            {Array.from({ length: size * size }, (_, i) => {
              const r = Math.floor(i / size);
              const c = i % size;
              return (
                <div key={`${r}-${c}`} className="relative min-h-0 min-w-0">
                  <ZipCell
                    r={r}
                    c={c}
                    puzzle={puzzle}
                    path={path}
                    pathIndex={pathIndexAt(path, r, c)}
                  />
                  {hasWallRight(r, c) && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute top-[8%] z-20 rounded-full bg-stone-950 shadow-sm dark:bg-amber-100"
                      style={{
                        right: -(GAP / 2 + WALL / 2),
                        width: WALL,
                        height: '84%',
                      }}
                    />
                  )}
                  {hasWallDown(r, c) && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute left-[8%] z-20 rounded-full bg-stone-950 shadow-sm dark:bg-amber-100"
                      style={{
                        bottom: -(GAP / 2 + WALL / 2),
                        height: WALL,
                        width: '84%',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          className="rounded-full bg-orange-600 px-5 py-2 text-sm font-bold text-white shadow disabled:opacity-40"
          disabled={disabled || path.length === 0}
          onClick={() => onPathChange(clearPath())}
        >
          Clear path
        </button>
      </div>
    </div>
  );
}
