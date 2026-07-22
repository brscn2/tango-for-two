interface Props { winnerName: string | null; timeMs: number; onClose(): void; }

export function WinCelebration({ winnerName, timeMs, onClose }: Props) {
  const s = Math.floor(timeMs / 1000);
  const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-plum/40 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-3xl bg-surface p-8 text-center shadow-glow">
        <div className="text-5xl">🎉🌸🐝</div>
        <h2 className="mt-3 text-2xl font-bold text-ink">
          {winnerName ? `${winnerName} wins!` : 'Solved together!'}
        </h2>
        <p className="mt-1 text-ink/70">Time: {time}</p>
        <button className="mt-4 rounded-full bg-petal px-5 py-2 font-semibold text-white" onClick={onClose}>
          Play again ✨
        </button>
      </div>
    </div>
  );
}
