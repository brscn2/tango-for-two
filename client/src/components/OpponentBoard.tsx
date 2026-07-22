/** Race mode: we only know how many cells the opponent has filled (progress %). */
export function OpponentBoard({ filled, name, size = 6 }: { filled: number; name: string; size?: number }) {
  const total = size * size;
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide opacity-70">{name}&apos;s progress</div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`aspect-square rounded-sm ${i < filled ? 'bg-petal' : 'bg-surface/60'}`} />
        ))}
      </div>
      <div className="mt-1 text-xs opacity-70">{pct}% filled</div>
    </div>
  );
}
