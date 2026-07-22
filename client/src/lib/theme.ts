const KEY = 'tango-theme';

export type Theme = 'light' | 'dark';

/** Saved choice wins; otherwise default to light (manual toggle, no OS follow). */
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage unavailable */
  }
  return 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore persistence errors */
  }
}
