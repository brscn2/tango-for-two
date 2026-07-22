export function ConstraintMark({ kind }: { kind: '=' | 'x' }) {
  return (
    <span className="pointer-events-none absolute z-10 flex h-5 w-5 items-center justify-center rounded-full bg-plum text-xs font-bold text-white shadow">
      {kind === '=' ? '=' : '×'}
    </span>
  );
}
