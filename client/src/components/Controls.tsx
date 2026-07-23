import { useState } from 'react';
import type { BoardSize, Difficulty, GameType, Mode, ZipSize } from '@tango/shared';
import { BOARD_SIZES, ZIP_SIZES } from '@tango/shared';

export function Controls({
  onStart,
  disabled,
}: {
  onStart(mode: Mode, difficulty: Difficulty, size: BoardSize | ZipSize, gameType: GameType): void;
  disabled: boolean;
}) {
  const [gameType, setGameType] = useState<GameType>('tango');
  const [mode, setMode] = useState<Mode>('race');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [size, setSize] = useState<number>(6);
  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-semibold transition ${active ? 'bg-petal text-white' : 'bg-surface/70 text-ink'}`;

  const sizes = gameType === 'zip' ? ZIP_SIZES : BOARD_SIZES;
  const effectiveMode = gameType === 'zip' ? 'race' : mode;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="flex gap-2">
        {(['tango', 'zip'] as GameType[]).map((g) => (
          <button
            key={g}
            className={pill(gameType === g)}
            onClick={() => {
              setGameType(g);
              if (g === 'zip') {
                setMode('race');
                if (![6, 7, 8].includes(size)) setSize(6);
              }
            }}
          >
            {g === 'tango' ? '🌞 Tango' : '🍜 Zip'}
          </button>
        ))}
      </div>
      {gameType === 'tango' && (
        <div className="flex gap-2">
          {(['race', 'coop'] as Mode[]).map((m) => (
            <button key={m} className={pill(mode === m)} onClick={() => setMode(m)}>
              {m === 'race' ? '🏁 Race' : '🤝 Co-op'}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {sizes.map((s) => (
          <button key={s} className={pill(size === s)} onClick={() => setSize(s)}>
            {s}×{s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <button key={d} className={pill(difficulty === d)} onClick={() => setDifficulty(d)}>
            {d[0].toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
      <button
        className="rounded-full bg-plum px-5 py-2 font-bold text-white shadow-glow disabled:opacity-40"
        onClick={() => onStart(effectiveMode, difficulty, size as BoardSize | ZipSize, gameType)}
        disabled={disabled}
      >
        ✨ New puzzle
      </button>
    </div>
  );
}
