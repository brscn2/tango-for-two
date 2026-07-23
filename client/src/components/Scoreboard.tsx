import type { PlayerInfo, RoomScores, ScoreEntry } from '@tango/shared';

function fmtBest(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function ScoreRow({
  label,
  players,
  scores,
}: {
  label: string;
  players: PlayerInfo[];
  scores: ScoreEntry[];
}) {
  const name = (slot: number) => players.find((p) => p.slot === slot)?.name ?? `P${slot + 1}`;
  const s0 = scores.find((s) => s.slot === 0);
  const s1 = scores.find((s) => s.slot === 1);
  return (
    <div>
      <div className="mb-0.5 text-center text-[10px] font-bold uppercase tracking-wide opacity-60">{label}</div>
      <div className="flex items-center justify-center gap-3 font-semibold">
        <span>🏵️ {name(0)} {s0?.wins ?? 0}</span>
        <span className="opacity-50">—</span>
        <span>{s1?.wins ?? 0} {name(1)} 🐝</span>
      </div>
      <div className="mt-1 flex justify-center gap-4 text-xs opacity-70">
        <span>🔥 {name(0)} streak {s0?.streak ?? 0} · best {fmtBest(s0?.bestTimeMs ?? null)}</span>
        <span>🔥 {name(1)} streak {s1?.streak ?? 0} · best {fmtBest(s1?.bestTimeMs ?? null)}</span>
      </div>
    </div>
  );
}

export function Scoreboard({ players, scores }: { players: PlayerInfo[]; scores: RoomScores }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface/70 px-4 py-2 text-sm text-ink shadow-glow">
      <ScoreRow label="Tango" players={players} scores={scores.tango} />
      <ScoreRow label="Zip" players={players} scores={scores.zip} />
    </div>
  );
}
