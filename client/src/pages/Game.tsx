import { useState } from 'react';
import { useStore } from '../lib/store';
import { Board } from '../components/Board';
import { OpponentBoard } from '../components/OpponentBoard';
import { Timer } from '../components/Timer';
import { Scoreboard } from '../components/Scoreboard';
import { Controls } from '../components/Controls';
import { SymbolPicker } from '../components/SymbolPicker';
import { ReactionsBar } from '../components/ReactionsBar';
import { FloatingReactions } from '../components/FloatingReactions';
import { MusicPlayer } from '../components/MusicPlayer';
import { WinCelebration } from '../components/WinCelebration';
import { ThemeToggle } from '../components/ThemeToggle';

export function Game() {
  const {
    code, slot, players, scores, match, myBoard, opponentFilled, connected,
    reactions, music, symbols, startMatch, setCell, sendReaction, musicControl, setSymbols, dismissReaction,
  } = useStore();
  const [celebrated, setCelebrated] = useState<string | null>(null);

  const opponentSlot = slot === 0 ? 1 : 0;
  const partner = players.find((p) => p.slot === opponentSlot);
  const opponentName = partner?.name ?? 'Partner';
  const partnerOffline = !!partner && partner.connected === false;
  const won = match?.status === 'won';
  const winnerName = match?.winnerSlot === null || match?.winnerSlot === undefined
    ? null
    : players.find((p) => p.slot === match.winnerSlot)?.name ?? null;
  const showCelebration = won && celebrated !== match?.puzzle.id;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <FloatingReactions reactions={reactions} onDone={dismissReaction} />

      {!connected && (
        <div className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-center text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
          Reconnecting…
        </div>
      )}
      {connected && partnerOffline && (
        <div className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-center text-sm text-plum dark:bg-rose-900/40 dark:text-rose-100">
          Waiting for {opponentName} to reconnect…
        </div>
      )}

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-surface/80 px-3 py-1 font-semibold text-ink">Room {code}</span>
        {match && <Timer startedAt={match.startedAt} stopped={won} />}
        <MusicPlayer music={music} onControl={musicControl} />
        <ThemeToggle />
      </header>

      <Scoreboard players={players} scores={scores} />

      <div className="my-4"><Controls onStart={startMatch} disabled={players.length < 2} /></div>
      {(!match || match.status === 'won') && (
        <div className="mx-auto mb-4 max-w-md"><SymbolPicker value={symbols} onChange={setSymbols} /></div>
      )}
      {players.length < 2 && (
        <p className="text-center text-sm text-ink/70">Share room code <b>{code}</b> with your partner to begin 💌</p>
      )}

      {match && myBoard && (
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex-[1.4]">
            <div className="mb-1 text-xs uppercase tracking-wide opacity-70">Your board</div>
            <Board
              board={myBoard}
              clues={match.puzzle.clues}
              constraints={match.puzzle.constraints}
              symbols={symbols}
              onCell={setCell}
              disabled={won}
            />
          </div>
          {match.mode === 'race' && (
            <div className="flex-1"><OpponentBoard filled={opponentFilled} name={opponentName} /></div>
          )}
        </div>
      )}

      <div className="mt-6">
        <ReactionsBar
          onEmoji={(e) => sendReaction('emoji', e)}
          onGif={(url) => sendReaction('gif', url)}
        />
      </div>

      {showCelebration && match && (
        <WinCelebration
          winnerName={winnerName}
          timeMs={Date.now() - match.startedAt}
          onClose={() => setCelebrated(match.puzzle.id)}
        />
      )}
    </div>
  );
}
