import type { ReactElement } from 'react';
import type { SymbolKey } from '@tango/shared';
import { Bee } from './Bee';
import { BlueFlower } from './BlueFlower';

function Emoji({ char, size = 28 }: { char: string; label: string; size?: number }) {
  return (
    <span aria-hidden="true" style={{ fontSize: Math.round(size * 0.9), lineHeight: 1 }}>
      {char}
    </span>
  );
}

export const SYMBOL_META: Record<SymbolKey, { label: string; render: (size?: number) => ReactElement }> = {
  bee: { label: 'bee', render: (s) => <Bee size={s} /> },
  blueFlower: { label: 'blue flower', render: (s) => <BlueFlower size={s} /> },
  shokupan: { label: 'shokupan', render: (s) => <Emoji char="🍞" label="shokupan" size={s} /> },
  saltBread: { label: 'salt bread', render: (s) => <Emoji char="🥐" label="salt bread" size={s} /> },
  matcha: { label: 'matcha', render: (s) => <Emoji char="🍵" label="matcha" size={s} /> },
  boba: { label: 'boba', render: (s) => <Emoji char="🧋" label="boba" size={s} /> },
  iceCream: { label: 'ice cream', render: (s) => <Emoji char="🍦" label="ice cream" size={s} /> },
  sun: { label: 'sun', render: (s) => <Emoji char="☀️" label="sun" size={s} /> },
  moon: { label: 'moon', render: (s) => <Emoji char="🌙" label="moon" size={s} /> },
};

export const PALETTE: SymbolKey[] = ['bee', 'blueFlower', 'shokupan', 'saltBread', 'matcha', 'boba', 'iceCream', 'sun', 'moon'];
