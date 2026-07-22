import { useEffect, useRef } from 'react';
import type { FloatingReaction } from '../lib/store';

export function FloatingReactions({ reactions, onDone }: { reactions: FloatingReaction[]; onDone(id: number): void }) {
  const scheduled = useRef(new Set<number>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    for (const r of reactions) {
      if (scheduled.current.has(r.id)) continue;
      scheduled.current.add(r.id);
      const timer = setTimeout(() => {
        timers.current.delete(r.id);
        scheduled.current.delete(r.id);
        onDone(r.id);
      }, 3500);
      timers.current.set(r.id, timer);
    }
  }, [reactions, onDone]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    scheduled.current.clear();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute animate-[floatUp_3.5s_ease-out_forwards]"
          style={{ left: `${20 + (r.id % 6) * 12}%`, bottom: '10%' }}
        >
          {r.kind === 'emoji'
            ? <span className="text-5xl drop-shadow">{r.content}</span>
            : <img src={r.content} alt="reaction" className="h-28 rounded-xl shadow-glow" />}
        </div>
      ))}
      <style>{`@keyframes floatUp { 0%{transform:translateY(0) scale(0.6);opacity:0} 15%{opacity:1;transform:translateY(-20px) scale(1)} 100%{transform:translateY(-60vh) scale(1.1);opacity:0} }`}</style>
    </div>
  );
}
