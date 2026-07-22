import { useEffect, useState } from 'react';

export function Timer({ startedAt, stopped }: { startedAt: number; stopped: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (stopped) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [stopped]);
  const ms = Math.max(0, now - startedAt);
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <span className="rounded-full bg-surface/80 px-3 py-1 font-semibold text-ink">⏳ {mm}:{ss}</span>;
}
