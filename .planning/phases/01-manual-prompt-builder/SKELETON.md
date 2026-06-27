# Walking Skeleton — Midjourney Prompt Helper

**Phase:** 1
**Generated:** 2026-06-27

## Capability Proven End-to-End

A user types a plain-language image description, adds style keyword chips, sees a live Midjourney-formatted prompt string updating in real time, and copies it to the clipboard — all running from a local dev server with no backend.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vite 8 + React 19 SPA (react-ts template) | No SSR needed — local tool. One `dist/` folder serves web and will be loaded by Tauri (Phase 5) without modification. |
| Language | TypeScript 6.x | Zod-inferred types flow from domain core → Zustand store → UI components with no manual typing. |
| UI component system | shadcn/ui 4.12 (Radix primitives, copy-in) | Accessible AlertDialog (focus trap, keyboard Escape) without a dep; you own the code. Required for Tauri which blocks `window.confirm()`. |
| Styling | Tailwind CSS 4.3 (CSS-first `@theme`, `@tailwindcss/vite` plugin) | Zero config file; same `dist/` on web and desktop. No `tailwind.config.js` — v4 is configured via `@theme {}` in CSS. |
| Domain core | Pure TypeScript in `src/domain/prompt/` (no framework deps) | `model.ts`, `sanitize.ts`, `serialize.ts` are zero-I/O functions testable in Node. The stable seam every downstream phase consumes. |
| Session/UI state | Zustand 5 (curried `create<State>()()` form) | Holds in-progress `PromptDraft` state; live preview is always derived (never stored). No provider wrapper needed. |
| Schema / validation | Zod 4.x | `PromptDraftSchema` defines the canonical structured model that Phase 3 persists and Phase 4 extends. Single source of truth. |
| Data persistence | None in Phase 1 | Introduced in Phase 3 via Dexie (IndexedDB). The `PromptDraft` Zod schema is already shaped for persistence. |
| Auth / accounts | None | Local-only tool; no auth required in any phase. |
| Deployment target | Local dev server (`npm run dev`) | Phase 1 is not deployed to a host. The web target is proved locally. Phase 5 wraps with Tauri for desktop. |
| Directory layout | Feature-grouped under `src/` | `src/domain/` (pure core), `src/state/` (Zustand), `src/ui/` (components), `src/test/` (shared test setup) |
| Test framework | Vitest 4.x + @testing-library/react + happy-dom | Vite-native; domain pure-function tests run in < 2s. Coverage gate on `src/domain/**`. |

## Stack Touched in Phase 1

- [x] Project scaffold — Vite 8 react-ts template + TypeScript 6 + all Phase 1 deps installed
- [x] Routing — single-page app; no router needed (one view: the prompt builder)
- [ ] Database — deferred to Phase 3 (Dexie / IndexedDB)
- [x] UI — intent textarea + chip add/remove + live preview pre + copy button + clear dialog, all wired to Zustand store
- [x] Local dev run — `npm run dev` starts the Vite dev server; full user flow exercisable in browser

## Seams for Later Phases

| Seam | Location | Used By |
|---|---|---|
| `PromptDraft` Zod schema | `src/domain/prompt/model.ts` | Phase 3 (persistence), Phase 4 (palette chips extend `source` enum) |
| `serialize(draft)` pure function | `src/domain/prompt/serialize.ts` | Phase 2 (flags append at tail), Phase 4 (same serializer) |
| `sanitize(text)` chokepoint | `src/domain/prompt/sanitize.ts` | Phase 4 (AI-supplied chip labels route through here) |
| `useBuildSession` Zustand store | `src/state/buildSession.ts` | Phase 2 (adds flag state), Phase 3 (adds save action), Phase 4 (adds palette chips) |
| `flags: []` array in PromptDraft | `src/domain/prompt/model.ts` | Phase 2 populates without schema reshape |

## Out of Scope (Deferred to Later Slices)

- Midjourney flag controls (--ar, --v, --stylize, etc.) — Phase 2
- Saved prompt library / Dexie persistence — Phase 3
- AI-populated palettes + BYO LLM API key — Phase 4
- Tauri desktop wrapper / OS keychain storage — Phase 5
- Light/dark mode toggle — dark only in Phase 1
- Toast notifications — not needed in Phase 1
- Routing / multiple views — single view for v1 builder

## Subsequent Slice Plan

| Phase | Capability Added |
|---|---|
| Phase 2 | User sets Midjourney flags via UI controls; flags render into prompt tail |
| Phase 3 | User saves prompt to local library; reloads full builder state; JSON export/import |
| Phase 4 | User enters intent + LLM key; AI fills categorized palettes; user clicks chips to assemble |
| Phase 5 | Same codebase runs as Tauri desktop app with OS-native library storage |
