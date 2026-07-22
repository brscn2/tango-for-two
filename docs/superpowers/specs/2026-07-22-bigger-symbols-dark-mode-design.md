# Bigger Grid Symbols + Dark Mode

**Date:** 2026-07-22  
**Status:** Approved for planning  
**Scope:** Client UI only (`@tango/client`)

## Goals

1. Make board symbols larger and easier to read (~40px).
2. Add a cozy dark mode with a manual moon/sun toggle that remembers the user's choice.

## Non-goals

- Syncing theme between players over the socket
- A three-way light / dark / system control
- Redesigning the Dreamy Pastel brand (dark mode is a night-garden variant of the same palette)
- Changing SymbolPicker / landing avatar sizes (board only)

## Decisions

| Topic | Choice |
|-------|--------|
| Symbol size on board | Fixed **40px** (up from 28px) via `SYMBOL_META[key].render(40)` in `Cell` |
| Theme control | Manual moon/sun toggle |
| Persistence | `localStorage` key `tango-theme` (`'light' \| 'dark'`) |
| First visit | **Light** (do not follow OS preference until the user has chosen) |
| Theming mechanism | Tailwind `darkMode: 'class'` + CSS variables on `:root` / `.dark` |
| Toggle placement | Landing page + Game header |

## Symbol sizing

- `client/src/components/Cell.tsx` passes `40` into `SYMBOL_META[key].render(size)`.
- Bee / BlueFlower SVGs and emoji foods already accept a size argument; no registry API change.
- Constraint marks and cell padding stay as-is; 40px still fits an aspect-square cell on mobile and desktop.

## Dark mode

### Tokens

Defined in `client/src/index.css`:

| Token | Light | Dark (night-garden) |
|-------|-------|---------------------|
| `--surface` | white cards/cells | deep soft plum card |
| `--ink` | plum text | soft lavender text |
| `--page-from` / `--page-to` | blush → lilac gradient | deep night → deep plum |

Tailwind maps `surface` and `ink` to these CSS variables (`client/tailwind.config.js`).

### Behavior

1. `getInitialTheme()`: if `tango-theme` is saved, use it; otherwise `'light'`.
2. `applyTheme(theme)`: toggles `document.documentElement.classList` (`dark`) and writes `localStorage`.
3. `main.tsx` calls `applyTheme(getInitialTheme())` before React mount to avoid a flash.
4. `ThemeToggle` flips light ↔ dark and updates local UI state.

### Component pass

Replace remaining hard-coded light-only surfaces (e.g. `bg-white`) with `bg-surface` / `text-ink` where needed so Landing, Game, board cells, pickers, scoreboard, banners, and overlays remain readable in both themes. Conflict / reconnect banners may use light-specific pastel tints with optional `dark:` variants for contrast.

## Files (expected)

| File | Role |
|------|------|
| `client/src/components/Cell.tsx` | Symbol size 40; surface/conflict dark-aware classes |
| `client/src/lib/theme.ts` | `getInitialTheme`, `applyTheme`, `Theme` type |
| `client/src/components/ThemeToggle.tsx` | Moon/sun button |
| `client/src/main.tsx` | Apply theme before paint |
| `client/src/index.css` | Light/dark CSS variables + body gradient/ink |
| `client/tailwind.config.js` | `darkMode: 'class'`, `surface` / `ink` colors |
| `client/src/pages/Landing.tsx`, `Game.tsx` | Mount `ThemeToggle`; theme-aware classes |
| Other UI components as needed | Swap hard-coded whites / fixed text colors |

## Testing

- Manual: toggle on Landing and Game; reload confirms persistence; first visit (cleared storage) is light.
- Manual: board symbols visibly larger than before for bee/flower and emoji foods.
- Existing Vitest suite (`Cell`, `boardLogic`) still passes; update Cell expectations only if size/aria assertions require it.
- `npm run build -w @tango/client` succeeds.

## Relationship to existing WIP

A local uncommitted draft already implements most of this (toggle, tokens, surface swaps, Cell at 40). Implementation should finish that draft and **change first-visit default from OS preference to light**, then commit.
