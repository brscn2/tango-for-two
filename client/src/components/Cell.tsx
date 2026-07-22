import type { Cell as CellValue, SymbolPair } from '@tango/shared';
import { SYMBOL_META } from '../icons/registry';

interface Props {
  value: CellValue;
  symbols: SymbolPair;
  locked: boolean;
  conflict: boolean;
  onClick: () => void;
}

export function Cell({ value, symbols, locked, conflict, onClick }: Props) {
  const key = value === 'bee' ? symbols.a : value === 'flower' ? symbols.b : null;
  return (
    <button
      type="button"
      onClick={() => { if (!locked) onClick(); }}
      className={[
        'flex aspect-square items-center justify-center rounded-xl transition',
        'bg-surface/90 shadow-sm',
        locked ? 'ring-2 ring-lilac cursor-default' : 'hover:bg-surface cursor-pointer',
        conflict ? 'ring-2 ring-rose-400 bg-rose-50 dark:bg-rose-900/40' : '',
      ].join(' ')}
      aria-label={key ? SYMBOL_META[key].label : 'empty'}
    >
      {key && SYMBOL_META[key].render(40)}
    </button>
  );
}
