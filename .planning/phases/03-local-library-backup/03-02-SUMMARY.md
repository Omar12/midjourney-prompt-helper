---
phase: 03-local-library-backup
plan: "02"
subsystem: ui
tags: [react, zustand, dexie, shadcn, alertdialog, sheet, library, crud]
dependency_graph:
  requires:
    - LibraryEntrySchema (src/domain/library/schema.ts)
    - dexieAdapter + db singleton (src/persistence/db.ts)
    - entryToSession (src/domain/library/snapshot.ts)
    - LibraryDrawer component (src/ui/LibraryDrawer/LibraryDrawer.tsx)
  provides:
    - PromptEntryCard component (src/ui/LibraryDrawer/PromptEntryCard.tsx)
    - LibraryDrawer with reload-if-dirty gate (src/ui/LibraryDrawer/LibraryDrawer.tsx)
  affects:
    - src/ui/LibraryDrawer/LibraryDrawer.tsx
tech_stack:
  added: []
  patterns:
    - Controlled Sheet (open/onOpenChange) for programmatic close after state restore
    - Controlled AlertDialog (open={pendingEntry !== null}) without a trigger button
    - onReload callback lifted to LibraryDrawer — dirty-check logic owned there, not in card
    - Per-field Zustand selectors for hasContent dirty check (matches ClearDialog pattern)
    - useBuildSession.setState() static call for out-of-hook state restore
key_files:
  created:
    - src/ui/LibraryDrawer/PromptEntryCard.tsx
  modified:
    - src/ui/LibraryDrawer/LibraryDrawer.tsx
decisions:
  - "Reload confirm AlertDialog is controlled via pendingEntry state (not a trigger), rendered outside Sheet for correct portal stacking"
  - "Reload confirm uses non-destructive AlertDialogAction (default button styling) per D-05 — reload is a neutral replacement, not deletion"
  - "useBuildSession.setState() static method called directly (not via hook) to restore session from handleReload/handleConfirmReload functions"
metrics:
  duration: 10m
  completed: "2026-06-29"
  tasks_completed: 2
  files_changed: 2
---

# Phase 03 Plan 02: PromptEntryCard CRUD + Reload-If-Dirty Gate Summary

**One-liner:** PromptEntryCard with inline rename, delete confirmation, and lifted onReload callback; LibraryDrawer upgraded with controlled Sheet, per-field dirty check, and a non-destructive reload confirm AlertDialog.

## What Was Built

### `src/ui/LibraryDrawer/PromptEntryCard.tsx` (new)

Per-entry card component with three interaction surfaces:

- **Display/rename toggle:** clicking the name span activates a controlled `<Input>` with autoFocus. Enter or blur commits; Escape cancels and resets `draftName` to `entry.name`. Empty commit falls back to original name (D-03). Persisted via `dexieAdapter.renameEntry`.
- **Timestamp:** `"Saved {Mon D} at {H:MM}"` formatted via `toLocaleString('en-US', ...)` from `entry.createdAt`.
- **Action row (flex justify-between):** Reload button calls `onReload(entry)` — the dirty-check and confirm dialog live in `LibraryDrawer`, not here. Delete button wrapped in `AlertDialog`; `AlertDialogTrigger` uses `render={<Button />}` (Base UI polymorphism, no nested button violation). Delete confirm has destructive className; cancel says "Keep it".
- All text rendered as React children. `dangerouslySetInnerHTML` grep returns 0 (T-03-05 mitigated).

### `src/ui/LibraryDrawer/LibraryDrawer.tsx` (upgraded)

Major additions over the 03-01 plain-list implementation:

- **Controlled Sheet** (`open={isOpen} onOpenChange={setIsOpen}`) enables `setIsOpen(false)` after reload to close the drawer programmatically.
- **Per-field Zustand selectors** for `intent`, `chips`, `selectedVersionId`, `setFlags` — same discipline as `ClearDialog.tsx` lines 18–23. `hasContent` derives the dirty state.
- **`pendingEntry` state** (`LibraryEntry | null`) gates the reload confirm dialog. Set when `handleReload` is called on a non-empty builder; cleared on cancel or confirm.
- **`handleReload`:** if builder is empty, restore immediately via `useBuildSession.setState(entryToSession(entry))` and close drawer. If dirty, set `pendingEntry` to open confirm.
- **`handleConfirmReload`:** restores `pendingEntry`, clears state, closes drawer.
- **Reload confirm AlertDialog** rendered outside `<Sheet>` (sibling in a Fragment) for correct portal stacking. Controlled via `open={pendingEntry !== null}`. Confirm button uses **default (non-destructive) styling** per D-05 — "Load saved prompt". Cancel says "Keep current".
- **PromptEntryCard list** replaces plain `div` items. Each card receives `entry` and `onReload={handleReload}`.

## Tests

| File | Tests | Result |
|------|-------|--------|
| Full suite | 164 | All pass |

No new test files (UI interaction components; manual smoke test covers LIB-03/LIB-04). Existing adapter and snapshot tests continue to pass.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 321629d | Task 1 | feat(03-02): add PromptEntryCard with inline rename, delete confirm, and reload callback |
| 907f8c8 | Task 2 | feat(03-02): upgrade LibraryDrawer with PromptEntryCard list and reload-if-dirty gate |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

No new security surface beyond the plan's threat model.

- T-03-05 mitigated: `entry.name` rendered as React text children in card display, delete dialog description, inline rename input value, and `title` attribute. `grep -rn 'dangerouslySetInnerHTML' src/ui/LibraryDrawer/` returns zero results.
- T-03-07 mitigated: `hasContent` dirty-check gate active; AlertDialog confirm required before replacing builder state with reload.
- T-03-08 mitigated: `dexieAdapter.deleteEntry` called only inside `AlertDialogAction onClick` after user confirmation.

## Self-Check: PASSED

- src/ui/LibraryDrawer/PromptEntryCard.tsx — exists, exports PromptEntryCard
- src/ui/LibraryDrawer/LibraryDrawer.tsx — updated, exports LibraryDrawer with PromptEntryCard + reload gate
- Commits 321629d, 907f8c8 — verified in git log
- npx tsc --noEmit — clean (no output)
- npx vitest run — 164 tests, 15 files, all pass
- dangerouslySetInnerHTML grep on src/ui/LibraryDrawer/ — zero results
- "Load saved prompt" line — no bg-destructive present
