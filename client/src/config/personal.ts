import type { Avatar } from '@tango/shared';

export interface PersonalPlayer { id: string; name: string; icon: Avatar; }

export const personal: {
  players: [PersonalPlayer, PersonalPlayer];
  anniversary: string; // YYYY-MM-DD
  photoSrc: string;    // path under client/public
  quotes: string[];
} = {
  players: [
    { id: 'p1', name: 'Bibi', icon: 'blueFlower' },
    { id: 'p2', name: 'Tuktuk', icon: 'bee' },
  ],
  anniversary: '2026-06-30', // the day we started talking on Bumble
  photoSrc: '/couple.jpg',   // add the real photo here later
  quotes: [
    'I should have bought you flowers', // When I Was Your Man - Bruno Mars
    'Never doubt 2-1 ⚽',
    'Two fatasses who love to eat 🍜',
    'You are the first person to get me a flavor :)'
  ],
};

/** Whole days since the anniversary date. */
export function daysTogether(from: string = personal.anniversary, now: Date = new Date()): number {
  const start = new Date(from + 'T00:00:00');
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

/** Deterministic-ish daily quote so it feels intentional, not random on every render. */
export function quoteOfNow(quotes: string[] = personal.quotes, now: Date = new Date()): string {
  if (quotes.length === 0) return '';
  const dayIndex = Math.floor(now.getTime() / 86400000);
  return quotes[dayIndex % quotes.length];
}
