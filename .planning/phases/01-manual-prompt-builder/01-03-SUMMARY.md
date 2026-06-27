---
phase: 01-manual-prompt-builder
plan: "03"
subsystem: ui-state
tags: [zustand, react, tailwind, shadcn-ui, tdd, component, live-preview]
dependency_graph:
  requires:
    - 01-02 (domain core: PromptDraft, serialize, sanitize)
  provides:
    - useBuildSession (Zustand 5 store: intent, chips, setIntent, addChip, removeChip, toggleChip, clearAll)
    - IntentInput component (controlled Textarea bound to store)
    - ChipInput component (Input + Add keyword button; Enter submit; dedup)
    - ChipArea component (chip badges with ✕ remove; 44px touch targets)
    - LivePreview component (pure prop-based; empty-state placeholder)
    - App.tsx two-pane layout (flex-col md:flex-row; sticky preview pane D-09)
  affects:
    - Plan 04 (CopyButton and ClearButton slot into the TODO placeholders in App.tsx)
    - Phase 2 (serialize() called inline in App.tsx; flags tail extension point already present)
tech_stack:
  added: []
  patterns:
    - Zustand 5 curried create<State>()() form — correct TypeScript inference
    - Separate per-field Zustand selectors (not object selectors) to avoid React 19 infinite re-render loop
    - TDD RED→GREEN per task — tests written before implementation
    - LivePreview as a pure prop-driven component (preview string derived inline in App, not inside component)
key_files:
  created:
    - src/state/buildSession.ts
    - src/ui/App.tsx
    - src/ui/ControlsPane/IntentInput.tsx
    - src/ui/ControlsPane/ChipInput.tsx
    - src/ui/ControlsPane/ChipArea.tsx
    - src/ui/PreviewPane/LivePreview.tsx
  modified:
    - src/ui/IntentInput.test.tsx (test.todo stubs → 2 real assertions)
    - src/ui/ChipInput.test.tsx (test.todo stubs → 4 real assertions)
    - src/ui/ChipArea.test.tsx (test.todo stubs → 3 real assertions)
    - src/ui/LivePreview.test.tsx (test.todo stubs → 3 real assertions)
    - src/main.tsx (import path updated to src/ui/App)
decisions:
  - Use separate per-field Zustand selectors to prevent React 19 infinite re-render caused by object selector referential instability
  - LivePreview implemented as a pure prop component (preview derived inline in App.tsx) per RESEARCH.md Open Question 1 — toDraft() not added as store method in Phase 1
  - App.tsx placed in src/ui/ to follow the planned project structure; src/main.tsx updated to point there
metrics:
  duration: "~4 minutes"
  completed: "2026-06-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 5
---

# Phase 01 Plan 03: UI Build Loop (store + IntentInput + ChipInput + ChipArea + LivePreview) Summary

**One-liner:** Zustand 5 build session store, two-pane responsive App layout, and four TDD-tested components (IntentInput, ChipInput, ChipArea, LivePreview) delivering the first working vertical slice — type intent, add/remove chips, see live prompt preview.

## What Was Built

### src/state/buildSession.ts

Zustand 5 store holding the in-progress prompt draft:

- `intent: string`, `chips: Chip[]` — session state
- `setIntent(intent)` — updates intent field on every keystroke
- `addChip(label)` — trims, deduplicates (case-sensitive), assigns `crypto.randomUUID()` id, source `'custom'`, enabled `true`
- `removeChip(id)` — filters chip by id
- `toggleChip(id)` — flips `enabled` flag (Phase 4 palette use)
- `clearAll()` — resets intent and chips to empty (Plan 04 ClearButton)
- `toDraft()` NOT included — preview computed inline in App per RESEARCH.md Open Question 1

### src/ui/App.tsx

Two-pane responsive layout per D-09 and UI-SPEC §"Layout Contract":

- Outer: `flex flex-col md:flex-row h-auto md:h-screen`
- Controls pane: `flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6` — renders IntentInput, ChipInput, ChipArea; ClearButton placeholder for Plan 04
- Preview pane: `w-full md:w-96 border-t md:border-t-0 md:border-l border-border md:sticky md:top-0 md:h-screen p-4 md:p-6 flex flex-col gap-4` — sticky on wide viewports (D-09)
- Preview derived inline: `serialize({ id: '', intent, chips, flags: [], schemaVersion: 1, createdAt: '', updatedAt: '' })`

### src/ui/ControlsPane/IntentInput.tsx

Controlled `Textarea` (shadcn/ui) bound to Zustand `intent` field:

- Visible label "Describe your image" with `htmlFor="intent-input"` (WCAG accessible)
- Placeholder from UI-SPEC §"Copywriting Contract"
- `min-h-[96px]` (3 lines at body size)
- Uses separate selector `useBuildSession((s) => s.intent)` — avoids React 19 re-render issue

### src/ui/ControlsPane/ChipInput.tsx

Text Input + "Add keyword" Button:

- Visible label "Add a style keyword"
- Enter key submits (via `onKeyDown`)
- Clears input after add
- Button disabled when `!value.trim()` (UI-SPEC §"Interaction Contract — ChipInput")
- Deduplication handled by store's `addChip` — no extra logic needed in component

### src/ui/ControlsPane/ChipArea.tsx

Badge-per-chip display with ✕ remove button:

- Returns `null` when `chips.length === 0` (no empty state element)
- Each chip: `Badge variant="secondary"` with label `<span>` (truncate + title) and ghost icon `Button`
- `aria-label="Remove [chip.label]"` on each ✕ button (WCAG screen reader accessible)
- `min-w-[44px] min-h-[44px]` on ✕ button (WCAG 2.5.5 AA 44px touch target)
- Badge overridden with `h-auto overflow-visible` to accommodate the touch-target button size

### src/ui/PreviewPane/LivePreview.tsx

Pure prop-driven component — receives `preview: string` from App:

- Non-empty: `<pre className="flex-1 whitespace-pre-wrap text-sm font-mono break-words">{preview}</pre>` — React text child, never `dangerouslySetInnerHTML`
- Empty: renders placeholder "Your prompt will appear here…" with `text-muted-foreground`

## Test Results

- `IntentInput.test.tsx`: 2 assertions — label rendered, typing updates store
- `LivePreview.test.tsx`: 3 assertions — intent text shown, chip text shown, empty state placeholder
- `ChipInput.test.tsx`: 4 assertions — chip created, input cleared, dedup, disabled-when-empty
- `ChipArea.test.tsx`: 3 assertions — remove chip, aria-label, null when empty
- **Total: 12 assertions, 4 test files, all green**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Separate per-field Zustand selectors to fix React 19 infinite re-render**
- **Found during:** Task 1 GREEN run (tests failed with "Maximum update depth exceeded")
- **Issue:** Object selector `useBuildSession((s) => ({ intent: s.intent, setIntent: s.setIntent }))` creates a new object reference on every call. React 19's concurrent mode detected the snapshot was never equal and triggered infinite re-renders ("The result of getSnapshot should be cached to avoid an infinite loop").
- **Fix:** Split into separate primitive selectors: `const intent = useBuildSession((s) => s.intent)` and `const setIntent = useBuildSession((s) => s.setIntent)`. Applied to both IntentInput.tsx and App.tsx.
- **Files modified:** `src/ui/ControlsPane/IntentInput.tsx`, `src/ui/App.tsx`
- **Commit:** 912a745

**2. [Rule 2 - Missing] src/main.tsx import path update**
- **Found during:** Task 1 implementation (App moved to src/ui/App.tsx per plan structure)
- **Issue:** `src/main.tsx` imported from `./App` (old placeholder location); new App is at `src/ui/App.tsx`
- **Fix:** Updated import to `./ui/App`
- **Files modified:** `src/main.tsx`
- **Commit:** 912a745

## Verification Evidence

- `npx vitest run src/ui/IntentInput.test.tsx src/ui/ChipInput.test.tsx src/ui/ChipArea.test.tsx src/ui/LivePreview.test.tsx` → 4 files, 12 tests, exit 0
- `grep -rn "dangerouslySetInnerHTML" src/ui/` → 0 results
- `buildSession.ts` exports `useBuildSession`; uses curried `create<BuildSessionState>()()` form
- `addChip` deduplicates by label (case-sensitive); chips get id from `crypto.randomUUID()`
- App two-pane layout uses `md:flex-row` for wide, `flex-col` for mobile
- Preview pane has `md:sticky md:top-0 md:h-screen`

## Known Stubs

- `App.tsx` has `{/* TODO-ClearButton: wired in Plan 04 */}` placeholder — intentional, Plan 04 wires it
- `App.tsx` has `{/* TODO-CopyButton: wired in Plan 04 */}` placeholder — intentional, Plan 04 wires it
- `src/ui/CopyButton.test.tsx` and `src/ui/ClearButton.test.tsx` remain as `test.todo()` stubs — Plan 04 implements these

These stubs do not block the plan's goal (live preview of assembled prompt) — the core build loop works end-to-end.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. T-03-01 (XSS via LivePreview) mitigated as specified: `{preview}` text child, zero `dangerouslySetInnerHTML`. T-03-02 (aria-label from chip.label) mitigated: React renders attribute values safely.

## Self-Check: PASSED

- src/state/buildSession.ts: exists, exports useBuildSession ✓
- src/ui/App.tsx: exists, contains md:flex-row and md:sticky md:top-0 md:h-screen ✓
- src/ui/ControlsPane/IntentInput.tsx: exists, exports IntentInput ✓
- src/ui/ControlsPane/ChipInput.tsx: exists, exports ChipInput ✓
- src/ui/ControlsPane/ChipArea.tsx: exists, exports ChipArea ✓
- src/ui/PreviewPane/LivePreview.tsx: exists, exports LivePreview ✓
- Commit 912a745 (Task 1): confirmed in git log ✓
- Commit 6b05dbf (Task 2): confirmed in git log ✓
- 12 tests green, 4 files ✓
- dangerouslySetInnerHTML: 0 results ✓
