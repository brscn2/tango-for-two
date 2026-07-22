export function BlueFlower({ size = 28 }: { size?: number }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {petals.map((deg) => (
        <ellipse key={deg} cx="16" cy="8" rx="4" ry="7" fill="#6ea8e6" transform={`rotate(${deg} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="4.5" fill="#fce38a" />
    </svg>
  );
}
