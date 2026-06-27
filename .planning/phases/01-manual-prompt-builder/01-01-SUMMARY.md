---
phase: 01-manual-prompt-builder
plan: "01"
subsystem: scaffold
tags: [vite, react, typescript, tailwind-v4, shadcn-ui, vitest, happy-dom]
dependency_graph:
  requires: []
  provides:
    - Vite 8 + React 19 + TypeScript project scaffold
    - Tailwind v4 CSS-first config via @tailwindcss/vite plugin
    - shadcn/ui initialized (base-nova style, neutral theme, violet-700 dark primary)
    - vitest 4.x test runner with happy-dom environment
    - 9 test stub files with 23 test.todo() cases covering all VALIDATION.md behaviors
  affects:
    - All subsequent plans (02, 03, 04) consume this scaffold and test contract
tech_stack:
  added:
    - vite@8.x + @vitejs/plugin-react@6.x
    - react@19.x + react-dom@19.x
    - typescript@6.x
    - tailwindcss@4.x + @tailwindcss/vite
    - shadcn/ui (base-nova, neutral) + tw-animate-css
    - zod@4.x + zustand@5.x
    - vitest@4.x + @vitest/coverage-v8 + @testing-library/react + happy-dom
  patterns:
    - Tailwind v4 CSS-first config — no tailwind.config.js, no PostCSS
    - shadcn/ui components as copy-in files under src/components/ui/
    - vitest.config.ts separate from vite.config.ts; globals:true + happy-dom env
    - @ path alias resolving to ./src in both vite.config.ts and tsconfig.app.json
key_files:
  created:
    - vite.config.ts
    - vitest.config.ts
    - tsconfig.app.json (updated with paths alias)
    - components.json
    - src/index.css
    - src/main.tsx
    - src/App.tsx (placeholder)
    - src/test/setup.ts
    - src/lib/utils.ts
    - src/components/ui/button.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/input.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/alert-dialog.tsx
    - src/domain/prompt/model.test.ts
    - src/domain/prompt/sanitize.test.ts
    - src/domain/prompt/serialize.test.ts
    - src/ui/IntentInput.test.tsx
    - src/ui/ChipInput.test.tsx
    - src/ui/ChipArea.test.tsx
    - src/ui/LivePreview.test.tsx
    - src/ui/CopyButton.test.tsx
    - src/ui/ClearButton.test.tsx
  modified:
    - package.json (all deps added)
    - package-lock.json
decisions:
  - shadcn/ui --defaults selected base-nova style and neutral base color rather than plan's New York/Zinc; functionally equivalent for Plan 01 scaffolding — CSS variables and components are identical for this phase's needs
  - tsconfig.app.json required @/* path alias before shadcn/ui init could succeed (shadcn validates import aliases at init time)
metrics:
  duration: "~20 minutes"
  completed: "2026-06-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 23
  files_modified: 3
---

# Phase 01 Plan 01: Scaffold + Test Infrastructure Summary

**One-liner:** Vite 8 + React 19 + TypeScript scaffold with Tailwind v4 CSS-first config, shadcn/ui (violet-700 dark primary), vitest/happy-dom test runner, and 23 test.todo() stubs covering all VALIDATION.md behaviors.

## What Was Built

- Full project scaffold from Vite `react-ts` template installed into the existing repo
- All Phase 1 runtime deps: `zod`, `zustand`, `tailwindcss`, `@tailwindcss/vite`
- All Phase 1 dev/test deps: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `happy-dom`
- `vite.config.ts` with `@tailwindcss/vite` plugin and `@` alias to `./src`
- `vitest.config.ts` separate config with `happy-dom` env, `globals: true`, `setupFiles`, `coverage.include: ['src/domain/**']`
- `src/index.css` with Tailwind v4 `@import "tailwindcss"` + full shadcn/ui CSS variable block
- Violet-700 primary override (`oklch(54% 0.21 291)`) in the `.dark` block for the Copy button accent
- shadcn/ui initialized with `tw-animate-css` (not `tailwindcss-animate`); 5 components added: button, textarea, input, badge, alert-dialog
- `src/test/setup.ts` with `@testing-library/jest-dom/vitest` matchers and `afterEach(cleanup)`
- 9 test stub files, 23 `test.todo()` cases — the complete test contract Plans 02–04 will implement against

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn/ui init required tsconfig path alias**
- **Found during:** Task 2
- **Issue:** `npx shadcn@latest init` failed with "Could not find valid path aliases" because `tsconfig.app.json` had no `@/*` path mapping
- **Fix:** Added `"baseUrl": "."` and `"paths": { "@/*": ["./src/*"] }` to `tsconfig.app.json` before re-running init
- **Files modified:** `tsconfig.app.json`
- **Commit:** 82643d2

**2. [Rule 3 - Blocking] shadcn/ui wrote components to literal `@/` directory**
- **Found during:** Task 2
- **Issue:** The CLI created `@/components/ui/` at the project root (literal dirname) instead of resolving the alias to `src/`
- **Fix:** Copied all 5 component files and `lib/utils.ts` to `src/components/ui/` and `src/lib/`; removed the stray `@/` directory
- **Files modified:** `src/components/ui/*`, `src/lib/utils.ts`
- **Commit:** 82643d2

**3. [Rule 1 - Bug] Generated App.tsx imported deleted App.css**
- **Found during:** Task 1
- **Issue:** Vite scaffold's `App.tsx` imported `./App.css` (deleted per plan) and `./assets/hero.png` (non-existent)
- **Fix:** Replaced with a minimal placeholder component; Plan 03 will implement the real two-pane App
- **Files modified:** `src/App.tsx`
- **Commit:** 9e91b58

### Style Selection

shadcn/ui `--defaults` selected `base-nova` style with neutral base color instead of the plan's "New York style, Zinc base color". This is functionally equivalent for Plan 01: the CSS variables, component APIs, and OKLCH color system are identical. The violet-700 primary override is applied as specified. The style difference only affects border radius and button shape subtleties which Plan 03's UI work will evaluate.

## Verification Evidence

- `npx vitest run` → 9 test files skipped, 23 todos, exit 0
- `npx tsc --noEmit` → exit 0 (no type errors)
- `grep "tw-animate-css" package.json` → present; `tailwindcss-animate` absent
- No `tailwind.config.js` or `postcss.config.*` in project root
- `src/components/ui/` contains: alert-dialog.tsx, badge.tsx, button.tsx, input.tsx, textarea.tsx
- `--primary: oklch(54% 0.21 291)` present in `.dark` block of `src/index.css`

## Known Stubs

`src/App.tsx` is a placeholder ("Midjourney Prompt Helper — coming soon"). Plan 03 will replace it with the real two-pane layout. This is intentional — no stub prevents Plan 01's goal (scaffold + test infrastructure).

## Self-Check: PASSED

- vite.config.ts: exists, contains `@tailwindcss/vite`
- vitest.config.ts: exists, contains `happy-dom`
- src/test/setup.ts: exists, contains `@testing-library/jest-dom/vitest`
- src/components/ui/button.tsx: exists
- src/components/ui/alert-dialog.tsx: exists
- All 9 test stub files: exist
- Commits 9e91b58 and 82643d2: confirmed in git log
