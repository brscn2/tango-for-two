import { useState } from 'react';
import type { Avatar } from '@tango/shared';
import { useStore } from '../lib/store';
import { personal, daysTogether, quoteOfNow } from '../config/personal';
import { SYMBOL_META } from '../icons/registry';
import { SymbolPicker } from '../components/SymbolPicker';
import { ThemeToggle } from '../components/ThemeToggle';

export function Landing() {
  const { connect, createRoom, joinRoom, symbols, setSymbols } = useStore();
  const [me, setMe] = useState<{ name: string; icon: Avatar } | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [photoOk, setPhotoOk] = useState(true);

  const requireMe = (): boolean => {
    if (!me) { setError('Tap who you are first 🌸'); return false; }
    return true;
  };

  const doCreate = async () => {
    if (!requireMe()) return;
    connect();
    await createRoom(me!.name, me!.icon);
  };

  const doJoin = async () => {
    if (!requireMe()) return;
    if (!joinCode.trim()) { setError('Enter a room code'); return; }
    connect();
    const res = await joinRoom(joinCode.trim().toUpperCase(), me!.name, me!.icon);
    if (!res.ok) setError(res.error ?? 'Could not join');
  };

  const days = daysTogether();
  const quote = quoteOfNow();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="relative w-full max-w-md rounded-3xl bg-surface/80 p-6 text-center shadow-glow">
        <span className="pointer-events-none absolute left-4 top-3 text-xl">🌷</span>
        <span className="pointer-events-none absolute right-4 top-3 text-xl">🐝</span>
        <ThemeToggle className="absolute left-1/2 top-2 -translate-x-1/2" />

        <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-blush shadow-glow">
          {photoOk
            ? <img src={personal.photoSrc} alt="us" className="h-full w-full object-cover" onError={() => setPhotoOk(false)} />
            : <span className="text-4xl">💞</span>}
        </div>

        <h1 className="mt-3 text-3xl font-bold text-ink">
          Welcome back, {personal.players[0].name} &amp; {personal.players[1].name}
        </h1>
        <p className="text-ink/70">Unlimited Tango, just us two 💛</p>

        <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-surface/70 px-4 py-1 font-bold text-ink">
          ❤️ {days.toLocaleString()} days together
        </div>
        {quote && <p className="mt-2 italic text-ink/70">&ldquo;{quote}&rdquo; 🎵</p>}

        <div className="mt-5 text-xs uppercase tracking-wide text-ink/60">Who's playing?</div>
        <div className="mt-2 flex justify-center gap-3">
          {personal.players.map((p) => (
            <button
              key={p.id}
              onClick={() => { setMe({ name: p.name, icon: p.icon }); setError(null); }}
              className={`flex flex-col items-center rounded-2xl px-5 py-3 shadow transition ${me?.name === p.name ? 'bg-petal/30 ring-2 ring-petal' : 'bg-surface hover:bg-surface/90'}`}
            >
              {SYMBOL_META[p.icon].render(30)}
              <span className="mt-1 font-bold text-ink">{p.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-5"><SymbolPicker value={symbols} onChange={setSymbols} /></div>

        <button className="mt-5 w-full rounded-full bg-plum py-2 font-bold text-white shadow-glow" onClick={doCreate}>
          Start a game ✨
        </button>

        <div className="my-3 text-center text-xs uppercase tracking-wide text-ink/50">or join</div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-full border border-lilac px-4 py-2 uppercase"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="ROOM CODE"
          />
          <button className="rounded-full bg-petal px-4 font-semibold text-white" onClick={doJoin}>Join</button>
        </div>
        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      </div>
    </div>
  );
}
