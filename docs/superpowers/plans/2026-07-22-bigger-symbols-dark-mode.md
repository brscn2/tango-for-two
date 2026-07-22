# Bigger Symbols + Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Board symbols at 40px and a manual dark-mode toggle that persists, defaulting to light on first visit.

**Architecture:** Tailwind `darkMode: 'class'` + CSS variables (`surface`/`ink`/page gradient). `ThemeToggle` flips `html.dark` and saves to `localStorage`. Cell renders symbols at size 40. Finish existing local WIP; fix first-visit default to light.

**Tech Stack:** React, Vite, Tailwind, Vitest, localStorage

**Spec:** `docs/superpowers/specs/2026-07-22-bigger-symbols-dark-mode-design.md`

---

### Task 1: Theme helpers default to light

**Files:**
- Create: `client/src/lib/theme.ts` (if missing)
- Create: `client/src/test/theme.test.ts`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Write failing test** for `getInitialTheme` — no saved key ⇒ `'light'` (mock `localStorage` empty; do not require OS dark).

```ts
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
  });
});
```

- [ ] **Step 2: Run test — expect fail** if `getInitialTheme` still follows OS.

```bash
npm test -w @tango/client -- src/test/theme.test.ts
```

- [ ] **Step 3: Implement `theme.ts`** — saved wins; else `'light'`. `applyTheme` toggles class + saves.

- [ ] **Step 4: Ensure `main.tsx`** calls `applyTheme(getInitialTheme())` before render.

- [ ] **Step 5: Run tests — pass. Commit.**

```bash
git add client/src/lib/theme.ts client/src/test/theme.test.ts client/src/main.tsx
git commit -m "feat(client): theme helpers with light default and persistence"
```

### Task 2: ThemeToggle + wire into pages

**Files:**
- Create: `client/src/components/ThemeToggle.tsx`
- Modify: `client/src/pages/Landing.tsx`, `client/src/pages/Game.tsx`

- [ ] **Step 1: Implement ThemeToggle** (moon when light, sun when dark; `aria-label` for switch).

- [ ] **Step 2: Mount on Landing** (top center) and **Game** header.

- [ ] **Step 3: Commit.**

### Task 3: CSS tokens + Tailwind + component surface pass

**Files:**
- Modify: `client/src/index.css`, `client/tailwind.config.js`
- Modify: UI components already in WIP (`Cell`, `Controls`, `GifPicker`, `MusicPlayer`, `OpponentBoard`, `ReactionsBar`, `Scoreboard`, `SymbolPicker`, `Timer`, `WinCelebration`, Landing, Game)

- [ ] **Step 1: Confirm CSS vars** for light/dark and Tailwind `surface`/`ink` + `darkMode: 'class'`.

- [ ] **Step 2: Dark-aware banners** in Game:

```tsx
// reconnecting
'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
// partner offline
'bg-rose-100 text-plum dark:bg-rose-900/40 dark:text-rose-100'
```

- [ ] **Step 3: Commit.**

### Task 4: Bigger board symbols (40px)

**Files:**
- Modify: `client/src/components/Cell.tsx`

- [ ] **Step 1: Set** `SYMBOL_META[key].render(40)`.

- [ ] **Step 2: Run** `npm test -w @tango/client` and `npm run build -w @tango/client`.

- [ ] **Step 3: Commit** all remaining theme/symbol work if not already committed:

```bash
git commit -m "feat(client): 40px board symbols and dark mode UI"
```
