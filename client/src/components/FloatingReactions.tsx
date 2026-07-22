import { useEffect } from 'react';
import type { FloatingReaction } from '../lib/store';

export function FloatingReactions({ reactions, onDone }: { reactions: FloatingReaction[]; onDone(id: number): void }) {
  useEffect(() => {
    const timers = reactions.map((r) => setTimeout(() => onDone(r.id), 3500));
    return () => timers.forEach(clearTimeout);
  }, [reactions, onDone]);

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
