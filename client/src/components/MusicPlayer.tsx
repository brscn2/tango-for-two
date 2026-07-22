import { useEffect, useRef, useState } from 'react';
import { DEFAULT_VIDEO_ID, loadYouTubeApi, parseVideoId } from '../lib/youtube';

interface MusicState { videoId?: string; action?: string; positionSec?: number; serverTime?: number; }

interface Props {
  music: MusicState;
  onControl(action: 'load' | 'play' | 'pause' | 'seek', videoId?: string, positionSec?: number): void;
}

export function MusicPlayer({ music, onControl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        height: '80',
        width: '140',
        videoId: DEFAULT_VIDEO_ID,
        playerVars: { controls: 1 },
        events: { onReady: () => setReady(true) },
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Apply incoming sync events from the other player.
  useEffect(() => {
    const p = playerRef.current;
    if (!ready || !p || !music.action) return;
    const drift = music.serverTime ? (Date.now() - music.serverTime) / 1000 : 0;
    const targetPos = (music.positionSec ?? 0) + drift;
    if (music.action === 'load' && music.videoId) {
      p.loadVideoById(music.videoId, targetPos);
    } else if (music.action === 'play') {
      p.seekTo(targetPos, true);
      p.playVideo();
    } else if (music.action === 'pause') {
      p.pauseVideo();
    } else if (music.action === 'seek') {
      p.seekTo(targetPos, true);
    }
  }, [music, ready]);

  const pos = () => (playerRef.current?.getCurrentTime?.() ?? 0);

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-plum px-3 py-2 text-cream text-white">
      <div ref={containerRef} className="overflow-hidden rounded" />
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <button className="rounded bg-white/20 px-2 text-xs" onClick={() => onControl('play', undefined, pos())}>▶</button>
          <button className="rounded bg-white/20 px-2 text-xs" onClick={() => onControl('pause')}>❚❚</button>
        </div>
        <div className="flex gap-1">
          <input
            className="w-24 rounded px-1 text-xs text-plum"
            placeholder="paste link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button
            className="rounded bg-petal px-2 text-xs font-semibold"
            onClick={() => { const id = parseVideoId(link); if (id) onControl('load', id, 0); }}
          >Set</button>
        </div>
      </div>
    </div>
  );
}
