export function Bee({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="bee">
      <ellipse cx="16" cy="18" rx="8" ry="9" fill="#f2c744" />
      <rect x="8" y="13" width="16" height="3" fill="#3a2f2a" />
      <rect x="8" y="19" width="16" height="3" fill="#3a2f2a" />
      <ellipse cx="10" cy="11" rx="5" ry="3.5" fill="#dbeafe" opacity="0.85" transform="rotate(-25 10 11)" />
      <ellipse cx="22" cy="11" rx="5" ry="3.5" fill="#dbeafe" opacity="0.85" transform="rotate(25 22 11)" />
      <circle cx="13" cy="10" r="1.2" fill="#3a2f2a" />
      <circle cx="19" cy="10" r="1.2" fill="#3a2f2a" />
    </svg>
  );
}
