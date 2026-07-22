import { useState } from 'react';
import { GifPicker } from './GifPicker';

const EMOJIS = ['😘', '🌸', '🔥', '😂', '💜', '🎵', '🐝', '🏵️'];

export function ReactionsBar({ onEmoji, onGif }: { onEmoji(e: string): void; onGif(url: string): void }) {
  const [showGif, setShowGif] = useState(false);
  return (
    <div className="relative flex justify-center">
      <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow">
        {EMOJIS.map((e) => (
          <button key={e} className="text-2xl transition hover:scale-125" onClick={() => onEmoji(e)}>{e}</button>
        ))}
        <button className="rounded-full bg-lilac px-3 py-1 text-sm font-semibold text-plum" onClick={() => setShowGif((v) => !v)}>
          GIF
        </button>
      </div>
      {showGif && <GifPicker onPick={onGif} onClose={() => setShowGif(false)} />}
    </div>
  );
}
