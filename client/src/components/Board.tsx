import { SIZE, type EdgeConstraint, type Grid, type SymbolPair } from '@tango/shared';
import { conflictSet, cycleSymbol, lockedSet } from '../lib/boardLogic';
import { Cell } from './Cell';
import { ConstraintMark } from './ConstraintMark';

interface Props {
  board: Grid;
  clues: Grid;
  constraints: EdgeConstraint[];
  symbols: SymbolPair;
  onCell(row: number, col: number, next: ReturnType<typeof cycleSymbol>): void;
  disabled?: boolean;
}

export function Board({ board, clues, constraints, symbols, onCell, disabled }: Props) {
  const locked = lockedSet(clues);
  const conflicts = conflictSet(board, constraints);

  // Index constraints by "between" position for overlay marks.
  const marks = constraints.map((c) => {
    const horizontal = c.a[0] === c.b[0];
    const row = c.a[0];
    const col = Math.min(c.a[1], c.b[1]);
    const rowB = Math.min(c.a[0], c.b[0]);
    return { kind: c.kind, horizontal, row, col, rowB };
  });

  return (
    <div className="relative">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
        {board.map((rowArr, r) =>
          rowArr.map((value, c) => (
            <Cell
              key={`${r},${c}`}
              value={value}
              symbols={symbols}
              locked={locked.has(`${r},${c}`) || !!disabled}
              conflict={conflicts.has(`${r},${c}`)}
              onClick={() => onCell(r, c, cycleSymbol(value))}
            />
          )),
        )}
      </div>
      {/* Constraint marks overlaid at midpoints. Positioned as a percentage of the grid. */}
      <div className="pointer-events-none absolute inset-0">
        {marks.map((m, i) => {
          const stepX = 100 / SIZE;
          const stepY = 100 / SIZE;
          const left = m.horizontal ? (m.col + 1) * stepX : (m.col + 0.5) * stepX;
          const top = m.horizontal ? (m.row + 0.5) * stepY : (m.rowB + 1) * stepY;
          return (
            <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
              <ConstraintMark kind={m.kind} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
