import { useState } from 'react';
import type { Difficulty, Mode } from '@tango/shared';

export function Controls({ onStart, disabled }: { onStart(mode: Mode, difficulty: Difficulty): void; disabled: boolean }) {
  const [mode, setMode] = useState<Mode>('race');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-semibold transition ${active ? 'bg-petal text-white' : 'bg-surface/70 text-ink'}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="flex gap-2">
        {(['race', 'coop'] as Mode[]).map((m) => (
          <button key={m} className={pill(mode === m)} onClick={() => setMode(m)}>
            {m === 'race' ? '🏁 Race' : '🤝 Co-op'}
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
        onClick={() => onStart(mode, difficulty)}
        disabled={disabled}
      >
        ✨ New puzzle
      </button>
    </div>
  );
}
