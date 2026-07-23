import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { PublicZipPuzzle, ZipCoord } from '@tango/shared';
import { wallKey } from '@tango/shared';
import { clearPath, extendPathFromPaint } from '../../lib/zipPathLogic';
import { ZipCell } from './ZipCell';

function pathIndexAt(path: ZipCoord[], r: number, c: number): number {
  return path.findIndex((p) => p.r === r && p.c === c);
}

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
    <div className="rounded-2xl bg-gradient-to-b from-orange-50 to-amber-100 p-3 dark:from-orange-950/50 dark:to-amber-950/40">
      <div
        className="relative mx-auto touch-none"
        style={{ maxWidth: size * 48 }}
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
          className="grid gap-0 overflow-hidden rounded-lg bg-orange-800/80 p-0.5"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: size * size }, (_, i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            const borderRight = hasWallRight(r, c) ? 'border-r-[3px] border-r-[#7c2d12]' : '';
            const borderBottom = hasWallDown(r, c) ? 'border-b-[3px] border-b-[#7c2d12]' : '';
            return (
              <div key={`${r}-${c}`} className={`${borderRight} ${borderBottom}`}>
                <ZipCell
                  r={r}
                  c={c}
                  puzzle={puzzle}
                  path={path}
                  pathIndex={pathIndexAt(path, r, c)}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          className="rounded-full bg-orange-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          disabled={disabled || path.length === 0}
          onClick={() => onPathChange(clearPath())}
        >
          Clear path
        </button>
      </div>
    </div>
  );
}
