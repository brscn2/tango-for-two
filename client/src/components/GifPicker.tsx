import { useState } from 'react';
import { searchGifs, type Gif } from '../lib/giphy';

export function GifPicker({ onPick, onClose }: { onPick(url: string): void; onClose(): void }) {
  const [q, setQ] = useState('bruno mars');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setGifs(await searchGifs(q));
    setLoading(false);
  };

  return (
    <div className="absolute bottom-16 left-1/2 z-40 w-80 -translate-x-1/2 rounded-2xl bg-white p-3 shadow-glow">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-full border border-lilac px-3 py-1 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
          placeholder="Search GIFs…"
        />
        <button className="rounded-full bg-petal px-3 py-1 text-sm font-semibold text-white" onClick={run}>Go</button>
        <button className="text-plum/60" onClick={onClose}>✕</button>
      </div>
      <div className="mt-2 grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
        {loading && <div className="col-span-3 py-6 text-center text-sm opacity-60">Loading…</div>}
        {!loading && gifs.length === 0 && (
          <div className="col-span-3 py-6 text-center text-xs opacity-60">No GIFs (check VITE_GIPHY_KEY).</div>
        )}
        {gifs.map((g) => (
          <img
            key={g.id}
            src={g.preview}
            alt="gif"
            className="h-20 w-full cursor-pointer rounded object-cover hover:opacity-80"
            onClick={() => { onPick(g.url); onClose(); }}
          />
        ))}
      </div>
    </div>
  );
}
