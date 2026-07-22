import { SIZE } from '@tango/shared';

/** Race mode: we only know how many cells the opponent has filled (progress %). */
export function OpponentBoard({ filled, name }: { filled: number; name: string }) {
  const total = SIZE * SIZE;
  const pct = Math.round((filled / total) * 100);
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide opacity-70">{name}'s progress</div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`aspect-square rounded-sm ${i < filled ? 'bg-petal' : 'bg-surface/60'}`} />
        ))}
      </div>
      <div className="mt-1 text-xs opacity-70">{pct}% filled</div>
    </div>
  );
}
