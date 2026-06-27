---
phase: 01-manual-prompt-builder
plan: "04"
subsystem: ui-interactions
tags: [clipboard, alert-dialog, base-ui, tdd, zustand, sanitize-gate]
dependency_graph:
  requires:
    - 01-03 (store, App layout, IntentInput, ChipInput, ChipArea, LivePreview)
    - 01-02 (sanitize utility — now wired into addChip)
  provides:
    - CopyButton (clipboard.writeText + Copied! feedback per D-10)
    - ClearButton/ClearDialog (Base UI AlertDialog confirmation per D-11)
    - sanitize() chokepoint active in addChip (D-08 / T-04-02 mitigated)
    - Complete Phase 1 walking skeleton — all user interactions implemented
  affects:
    - Phase 4 (addChip sanitize gate inherited by AI-supplied palette chips)
    - Phase 5 (Tauri hardening; CopyButton catch block noted for native HTTP fallback)
tech_stack:
  added: []
  patterns:
    - Base UI AlertDialog with render prop for polymorphism (not asChild — Base UI uses render, not Radix)
    - Separate per-field Zustand selectors in ClearButton (consistent with Plan 03 pattern)
    - vi.spyOn(navigator.clipboard, 'writeText') after userEvent.setup() — avoids non-configurable property conflict
    - fireEvent.click for fake-timer test — avoids userEvent+fake-timer+clipboard-spy deadlock
    - sanitize() called in addChip before dedup and storage — single D-08 chokepoint now fully active
key_files:
  created:
    - src/ui/PreviewPane/CopyButton.tsx
    - src/ui/ClearDialog.tsx
  modified:
    - src/ui/App.tsx (wired CopyButton and ClearButton, removed TODO placeholders)
    - src/state/buildSession.ts (sanitize import + call in addChip)
    - src/ui/CopyButton.test.tsx (test.todo stubs → 4 real assertions)
    - src/ui/ClearButton.test.tsx (test.todo stubs → 3 real assertions)
decisions:
  - Use Base UI render prop (not asChild) for AlertDialogTrigger — installed shadcn/ui uses @base-ui/react, not @radix-ui; asChild causes nested button HTML violation
  - Spy on clipboard after userEvent.setup() (not Object.defineProperty in beforeEach) — userEvent v14 stubs clipboard on setup; pre-stubbing without configurable:true causes TypeError
  - fireEvent.click for fake-timer revert test — avoids userEvent+fake-timer+clipboard deadlock while correctly testing the 2s revert behavior
  - Separate per-field Zustand selectors in ClearDialog (consistent with Plan 03 deviation fix)
metrics:
  duration: "~6 minutes"
  completed: "2026-06-27"
  tasks_completed: 1
  tasks_total: 1
  files_created: 2
  files_modified: 4
---

# Phase 01 Plan 04: CopyButton + ClearDialog + Walking Skeleton Summary

**One-liner:** CopyButton (clipboard + 2s Copied! feedback) and ClearButton (Base UI AlertDialog confirmation) complete the Phase 1 walking skeleton — user can go from blank to copyable Midjourney prompt with all 9 test files green and domain at 100% branch coverage.

## What Was Built

### src/ui/PreviewPane/CopyButton.tsx

Copy button implementing D-10 and BLD-07:

- Props: `{ text: string }`
- `handleCopy`: async click handler — calls `navigator.clipboard.writeText(text)` synchronously inside the click handler (user gesture requirement for Clipboard API in Firefox/Safari)
- `copied` state: flips to `true` after successful write; `setTimeout(() => setCopied(false), 2000)` reverts label
- `try/catch`: silent fallback for non-secure contexts or permission denied (T-04-01 accepted)
- `disabled={!text}`: button is disabled and unclickable when preview is empty
- Labels: "Copy prompt" / "Copied!" per UI-SPEC §"Copywriting Contract" (D-10)
- `variant="default"` (accent fill) per UI-SPEC §"Interaction Contract — CopyButton"

### src/ui/ClearDialog.tsx

Clear button + confirmation dialog implementing D-11 and BLD-06:

- `ClearButton` named export (not default)
- Three separate Zustand selectors: `intent`, `chips`, `clearAll` — avoids React 19 referential-instability infinite loop (established pattern from Plan 03)
- `hasContent = intent.trim() !== '' || chips.length > 0`
- Empty state: renders `<Button variant="ghost" disabled>Clear all</Button>` with no dialog
- Content state: renders `<AlertDialog>` with Base UI's `render` prop on `AlertDialogTrigger` (see Deviations — no `asChild`)
- Exact copy strings per UI-SPEC §"Copywriting Contract": "Clear all", "Start over?", "This will clear your intent and all chips. This action cannot be undone.", "Keep editing", "Clear everything"
- Never uses `window.confirm()` — blocked in Tauri webviews (RESEARCH.md §"Don't Hand-Roll", T-04-03 mitigated)

### src/state/buildSession.ts — sanitize chokepoint activated

- Added `import { sanitize } from '../domain/prompt/sanitize'`
- `addChip` now calls `sanitize(trimmed)` before dedup and storage
- Guard: if `sanitize(trimmed)` returns empty string, early return (e.g. input was only commas)
- Dedup now compares sanitized labels — ensures "a--b" and "a-b" don't both exist
- T-04-02 mitigated: Phase 4 AI-supplied labels route through `addChip` and inherit the sanitize gate

### src/ui/App.tsx — TODO placeholders removed

- Replaced `{/* TODO-CopyButton */}` with `<CopyButton text={preview} />`
- Replaced `{/* TODO-ClearButton */}` with `<ClearButton />`
- Added imports for both components

## Test Results

- `CopyButton.test.tsx`: 4 assertions — writeText called with text, Copied! shown, reverts after 2s, disabled when empty
- `ClearButton.test.tsx`: 3 assertions — dialog opens with content, clearAll on confirm, disabled when empty
- **Full suite: 9 files, 53 tests, 0 todos, exit 0**
- Domain coverage: `npx vitest run --coverage` → 100% statements, branches, functions, lines

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Base UI AlertDialogTrigger uses render prop, not asChild**
- **Found during:** Task 1 GREEN run (ClearButton tests failed with nested `<button>` HTML violation)
- **Issue:** The plan specified `<AlertDialogTrigger asChild><Button /></AlertDialogTrigger>`. The installed `alert-dialog.tsx` uses `@base-ui/react/alert-dialog` (not `@radix-ui/react-alert-dialog`). Base UI's Trigger renders its own `<button>` element; `asChild` is not a recognized prop, so it was passed as an HTML attribute and the inner Button rendered inside the Trigger's button — nested buttons, invalid HTML.
- **Fix:** Used Base UI's `render` prop pattern (same as `AlertDialogCancel` uses in the installed component): `<AlertDialogTrigger render={<Button variant="ghost" />}>Clear all</AlertDialogTrigger>`
- **Files modified:** `src/ui/ClearDialog.tsx`
- **Commit:** 2363890

**2. [Rule 1 - Bug] navigator.clipboard non-configurable conflict with userEvent.setup()**
- **Found during:** Task 1 RED→GREEN run (CopyButton tests failed with "Cannot redefine property: clipboard")
- **Issue:** RESEARCH.md Pitfall 5 pattern uses `Object.defineProperty(navigator, 'clipboard', ...)` in `beforeEach` without `configurable: true`. In `@testing-library/user-event` v14, `userEvent.setup()` also calls `Object.defineProperty` on `navigator.clipboard` (to attach its own clipboard stub). Because our property was set without `configurable: true`, this threw a TypeError.
- **Fix:** Removed the `beforeEach` clipboard mock entirely. In each test, call `userEvent.setup()` first (which sets a configurable clipboard stub), then use `vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)` to override just the `writeText` method.
- **Files modified:** `src/ui/CopyButton.test.tsx`
- **Commit:** 2363890

**3. [Rule 1 - Bug] userEvent+fake-timer+clipboard deadlock in revert test**
- **Found during:** Task 1 GREEN run (revert test timed out at 5000ms)
- **Issue:** Combining `vi.useFakeTimers()`, `userEvent.setup({ advanceTimers })`, and `vi.spyOn(navigator.clipboard, 'writeText')` caused the `user.click()` call to never resolve — userEvent's internal timer-driven machinery deadlocked with the fake timer + re-spied clipboard.
- **Fix:** Switched to `fireEvent.click` (synchronous) + `await act(async () => {})` to flush the async `handleCopy` microtask. This correctly tests the `setCopied(true)` → 2s revert path without the deadlock.
- **Files modified:** `src/ui/CopyButton.test.tsx`
- **Commit:** 2363890

## Human Checkpoint Required

**Task 2 is a `checkpoint:human-verify`** — the automated tests cannot verify the visual two-pane layout, real clipboard round-trip, or responsive behavior. The human verifier must complete all 15 items below.

### How to Run

```bash
npm run dev
```

Open `http://localhost:5173` in a browser.

### Verification Checklist (15 items)

1. **LAYOUT wide** — Wide viewport (> 768px): controls pane left (flex-1), preview pane right (sticky w-96). Preview pane stays visible while controls scroll.

2. **LAYOUT narrow** — Resize to 640px wide. Panes stack: controls on top, preview below. Preview reachable by scrolling.

3. **INTENT INPUT** — Type "a misty mountain lake at dawn, shot from above" into textarea. Preview updates immediately to show the same text.

4. **CHIP ADD** — Type "cinematic", press Enter. Badge appears. Preview reads: "a misty mountain lake at dawn, shot from above, cinematic".

5. **CHIP DEDUP** — Type "cinematic" again, press Enter. No second "cinematic" chip appears.

6. **CHIP ADD MULTI** — Add "neon" and "oil painting". Preview reads: "a misty mountain lake at dawn, shot from above, cinematic, neon, oil painting".

7. **CHIP REMOVE** — Click ✕ on "neon". Badge disappears; preview updates.

8. **SPECIAL CHARS** — Clear intent, type "a--b::c". Preview shows "a-b:c" (sanitizer active on chips too — type "a--b" as a chip label; stored as "a-b").

9. **COPY BUTTON** — Build a prompt with intent + chips. Click "Copy prompt". Button flips to "Copied!" immediately. Paste into text editor — exact prompt string matches preview.

10. **COPY DISABLED** — Clear intent and all chips. "Copy prompt" button is disabled (grayed out, unclickable).

11. **CLEAR WITH CONTENT** — Type intent + add a chip. Click "Clear all". AlertDialog opens with title "Start over?" and description "This will clear your intent and all chips. This action cannot be undone."

12. **CLEAR CANCEL** — Click "Keep editing". Dialog closes; content preserved.

13. **CLEAR CONFIRM** — Click "Clear all" again, then "Clear everything". Intent textarea empty, chip area empty, preview shows "Your prompt will appear here…", "Clear all" button disabled.

14. **CLEAR EMPTY** — With builder empty, "Clear all" button is disabled (unclickable, no dialog).

15. **PREVIEW EMPTY STATE** — Builder empty shows "Your prompt will appear here…" in muted text color.

### Resume Signal

Type `approved` when all 15 items pass, or describe any failure (item number + observed vs. expected).

## Known Stubs

None — all Plan 04 functionality is implemented and tested. No TODO placeholders remain in App.tsx.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. All threats in the plan's STRIDE register are mitigated as specified:
- T-04-01 (clipboard permission denied): `try/catch` silent fallback in CopyButton
- T-04-02 (chip label bypasses sanitize): `sanitize(trimmed)` called in addChip before storage
- T-04-03 (window.confirm in Tauri): AlertDialog (Base UI/shadcn) used throughout
- T-04-04 (clipboard exposure): accepted — intentional product behavior

## Self-Check: PASSED

- src/ui/PreviewPane/CopyButton.tsx: exists, exports CopyButton ✓
- src/ui/ClearDialog.tsx: exists, exports ClearButton ✓
- src/state/buildSession.ts: sanitize import + sanitize(trimmed) call in addChip ✓
- src/ui/App.tsx: imports CopyButton and ClearButton; no TODO placeholders ✓
- Commit 2363890: confirmed ✓
- 9 test files, 53 tests, 0 todos, exit 0 ✓
- domain coverage 100% branch ✓
- grep "window.confirm" src/ — comment only, zero functional usage ✓
- grep "dangerouslySetInnerHTML" src/ — 0 results ✓
