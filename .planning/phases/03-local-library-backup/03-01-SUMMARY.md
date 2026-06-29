---
phase: 03-local-library-backup
plan: "01"
subsystem: persistence
tags: [dexie, indexeddb, zustand, react, tdd, library, shadcn]
dependency_graph:
  requires: []
  provides:
    - LibraryEntrySchema (src/domain/library/schema.ts)
    - StorageAdapter interface (src/persistence/adapter.ts)
    - dexieAdapter + db singleton (src/persistence/db.ts)
    - sessionToEntry + entryToSession (src/domain/library/snapshot.ts)
    - SaveButton component (src/ui/LibraryDrawer/SaveButton.tsx)
    - LibraryDrawer component (src/ui/LibraryDrawer/LibraryDrawer.tsx)
  affects:
    - src/ui/App.tsx
tech_stack:
  added:
    - dexie 4.4.4 (IndexedDB singleton, already in package.json)
    - dexie-react-hooks 4.4.0 (useLiveQuery reactive hook)
    - fake-indexeddb 6.2.5 (in-memory IDB for Vitest)
  patterns:
    - TDD RED→GREEN for both adapter and snapshot tests
    - StorageAdapter interface as Phase 5 seam (no implementation lock-in)
    - Per-field Zustand selectors (avoid React 19 referential-instability)
    - useLiveQuery with defaultResult [] (never undefined on first render)
    - Base UI render= prop on SheetTrigger (no nested button HTML violation)
key_files:
  created:
    - src/domain/library/schema.ts
    - src/domain/library/snapshot.ts
    - src/domain/library/snapshot.test.ts
    - src/persistence/adapter.ts
    - src/persistence/db.ts
    - src/persistence/adapter.test.ts
    - src/ui/LibraryDrawer/SaveButton.tsx
    - src/ui/LibraryDrawer/LibraryDrawer.tsx
  modified:
    - src/ui/App.tsx
decisions:
  - "StorageAdapter interface placed in a separate file from db.ts — Phase 5 can swap Dexie for Tauri SQLite without touching UI"
  - "useLiveQuery called with defaultResult=[] (third arg) to prevent undefined on first render per RESEARCH.md Pitfall 1"
  - "SaveButton uses void navigator.storage?.persist() (single expression) to satisfy PLT-03 with one navigator.storage reference"
  - "LibraryDrawer is self-contained with own SheetTrigger — App.tsx manages no open/close state"
metrics:
  duration: 8m
  completed: "2026-06-29"
  tasks_completed: 3
  files_changed: 9
---

# Phase 03 Plan 01: Persistence Foundation + Save-and-List Vertical Slice Summary

**One-liner:** Dexie IndexedDB singleton behind a StorageAdapter seam, with LibraryEntrySchema, sessionToEntry/entryToSession snapshot helpers, and a wired SaveButton + LibraryDrawer delivering the first complete save-and-list flow.

## What Was Built

All persistence infrastructure for the prompt library is net-new:

- **`src/domain/library/schema.ts`** — `LibraryEntrySchema` extends `PromptDraftSchema` with `name: z.string().min(1)`. Used as both the Dexie `EntityTable` type and the import validation schema in Phase 3.
- **`src/persistence/adapter.ts`** — `StorageAdapter` interface (`saveEntry`, `getAllEntries`, `deleteEntry`, `renameEntry`). Interface-only file; the Phase 5 Tauri implementation will implement this contract.
- **`src/persistence/db.ts`** — `db` Dexie singleton (`'mj-prompt-library'`, schema `'id, createdAt'`) and `dexieAdapter` implementing `StorageAdapter`. `put()` for saves, `update()` for renames (avoids Dexie 4 cache mutation pitfall).
- **`src/domain/library/snapshot.ts`** — `sessionToEntry()` snapshots the 5 Zustand fields into a `LibraryEntry`; `entryToSession()` restores them. Pure functions, no side effects, no `serialize()` call (preview re-derived from state per D-06).
- **`src/ui/LibraryDrawer/SaveButton.tsx`** — Per-field Zustand selectors, auto-name (`intent.slice(0,40) + ' — ' + timestamp`), `dexieAdapter.saveEntry()`, PLT-03 durable storage request on first save, 2s `Saved!` transient feedback, disabled when builder is empty.
- **`src/ui/LibraryDrawer/LibraryDrawer.tsx`** — `useLiveQuery` with `defaultResult=[]`, shadcn Sheet slide-over (side=right, w-80), entry list with name+timestamp, empty state with BookOpen icon. All text as React children — no `dangerouslySetInnerHTML`.
- **`src/ui/App.tsx`** — Preview pane header wrapped in flex row with `LibraryDrawer` on right; `SaveButton` added below `CopyButton`.

## Tests

| File | Tests | Result |
|------|-------|--------|
| src/persistence/adapter.test.ts | 7 | All pass |
| src/domain/library/snapshot.test.ts | 12 | All pass |
| Full suite | 164 | All pass |

TDD discipline: tests written first (RED — module-not-found), then implementation (GREEN). Both test files follow `fake-indexeddb/auto` first-import rule and `beforeEach(db.entries.clear())` reset discipline.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| dfee609 | Task 1 | feat(03-01): add LibraryEntrySchema, StorageAdapter, and Dexie persistence layer |
| 6534c3b | Task 2 | feat(03-01): add sessionToEntry and entryToSession snapshot helpers |
| be1efd3 | Task 3 | feat(03-01): wire SaveButton + LibraryDrawer into App preview pane |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

No new security surface introduced beyond the plan's threat model. Entry names are rendered as React text children throughout; `dangerouslySetInnerHTML` grep on `src/ui/LibraryDrawer/` returns zero results (T-03-02 mitigated).

## Self-Check: PASSED

- src/domain/library/schema.ts — exists, exports LibraryEntrySchema + LibraryEntry (grep count: 2)
- src/persistence/adapter.ts — exists, exports StorageAdapter interface (grep count: 1)
- src/persistence/db.ts — exists, exports db + dexieAdapter (grep count: 2)
- src/domain/library/snapshot.ts — exists, exports sessionToEntry + entryToSession (grep count: 2)
- src/ui/LibraryDrawer/SaveButton.tsx — exists
- src/ui/LibraryDrawer/LibraryDrawer.tsx — exists
- src/ui/App.tsx — imports SaveButton + LibraryDrawer (grep count: 4)
- Commits dfee609, 6534c3b, be1efd3 — verified in git log
- npx vitest run — 164 tests, 15 files, all pass
- npx tsc --noEmit — clean
