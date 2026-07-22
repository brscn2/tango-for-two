import type { SymbolKey, SymbolPair } from '@tango/shared';
import { PALETTE, SYMBOL_META } from '../icons/registry';

interface Props { value: SymbolPair; onChange(pair: SymbolPair): void; }

export function SymbolPicker({ value, onChange }: Props) {
  const setSlot = (slot: 'a' | 'b', key: SymbolKey) => {
    const next: SymbolPair = { ...value, [slot]: key };
    if (next.a === next.b) return; // the two symbols must differ
    onChange(next);
  };

  const Row = ({ slot }: { slot: 'a' | 'b' }) => (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs uppercase tracking-wide opacity-70">Symbol {slot.toUpperCase()}</span>
      <div className="flex flex-wrap gap-1">
        {PALETTE.map((key) => {
          const selected = value[slot] === key;
          const takenByOther = value[slot === 'a' ? 'b' : 'a'] === key;
          return (
            <button
              key={key}
              disabled={takenByOther}
              onClick={() => setSlot(slot, key)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${selected ? 'bg-petal/30 ring-2 ring-petal' : 'bg-white/70'} ${takenByOther ? 'opacity-25' : 'hover:bg-white'}`}
              aria-label={SYMBOL_META[key].label}
              title={SYMBOL_META[key].label}
            >
              {SYMBOL_META[key].render(22)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white/60 p-3">
      <div className="text-center text-xs uppercase tracking-wide opacity-70">Choose your symbols</div>
      <Row slot="a" />
      <Row slot="b" />
    </div>
  );
}
