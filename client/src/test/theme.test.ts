import { describe, it, expect, beforeEach } from 'vitest';
import { getInitialTheme, applyTheme } from '../lib/theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light when nothing is saved', () => {
    expect(getInitialTheme()).toBe('light');
  });

  it('returns saved dark preference', () => {
    localStorage.setItem('tango-theme', 'dark');
    expect(getInitialTheme()).toBe('dark');
  });

  it('applyTheme toggles the dark class and persists', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('tango-theme')).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('tango-theme')).toBe('light');
  });
});
