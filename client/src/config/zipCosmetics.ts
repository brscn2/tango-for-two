/** Index 0 → waypoint n=1; cycles if K > length. */
export const MALATANG_INGREDIENTS = [
  { emoji: '🌶️', label: 'chili' },
  { emoji: '🥩', label: 'meatball' },
  { emoji: '🧊', label: 'tofu' },
  { emoji: '🥬', label: 'greens' },
  { emoji: '🐟', label: 'fishball' },
  { emoji: '🥔', label: 'potato' },
  { emoji: '🫧', label: 'lotus root' },
  { emoji: '🍜', label: 'noodle' },
] as const;

/** Swap to `/bibi.jpg` when you drop a photo in `client/public/`. */
export const BIBI_SRC = '/bibi.svg';

export function ingredientForWaypoint(n: number) {
  return MALATANG_INGREDIENTS[(n - 1) % MALATANG_INGREDIENTS.length];
}
