---
phase: 03-local-library-backup
plan: "04"
subsystem: ui
tags: [react, export, import, file-io, shadcn, sheet, security]
dependency_graph:
  requires:
    - importLibrary / exportLibrary (src/domain/library/import.ts) — 03-03
    - LibraryDrawer with PromptEntryCard list (src/ui/LibraryDrawer/LibraryDrawer.tsx) — 03-02
    - SheetFooter (src/components/ui/sheet.tsx) — 03-01
  provides:
    - ExportImport component (src/ui/LibraryDrawer/ExportImport.tsx)
    - LibraryDrawer with SheetFooter + ExportImport mounted (src/ui/LibraryDrawer/LibraryDrawer.tsx)
  affects:
    - Human verification — complete Phase 3 end-to-end workflow (Task 2, checkpoint pending)
tech_stack:
  added: []
  patterns:
    - useRef for hidden file input (programmatic click on user gesture only)
    - Transient status message via useState + setTimeout 4000ms (mirrors CopyButton pattern)
    - Status strings use template literals with integer counts only (T-03-15 mitigation)
    - SheetFooter in SheetContent for export/import controls in drawer footer
key_files:
  created:
    - src/ui/LibraryDrawer/ExportImport.tsx
  modified:
    - src/ui/LibraryDrawer/LibraryDrawer.tsx
decisions:
  - "SheetFooter has mt-auto built in (via sheet.tsx); added border-t pt-4 className for visual separator from the entry list"
  - "entries prop passed from useLiveQuery result in LibraryDrawer — ExportImport is a pure presentational component with async handlers, no direct db access"
metrics:
  duration: 2m
  completed: "2026-06-29"
  tasks_completed: 2
  files_changed: 2
---

# Phase 03 Plan 04: ExportImport UI Component Summary

**One-liner:** ExportImport component with Export + Import buttons, per-case status messages using integer counts only, mounted in LibraryDrawer SheetFooter — completes LIB-05 UI layer; awaiting human end-to-end verification.

## What Was Built

### `src/ui/LibraryDrawer/ExportImport.tsx` (new)

Named export `ExportImport` component. Props: `{ entries: LibraryEntry[] }`.

- **Export button:** `variant="outline"`, full-width, `disabled={entries.length === 0}`. Calls `exportLibrary(entries)` on click — triggers JSON file download named `mj-prompt-library-YYYY-MM-DD.json`.
- **Import button:** `variant="outline"`, full-width. Clicks the hidden `<input ref={fileInputRef}>` on user gesture via `fileInputRef.current?.click()`.
- **Hidden file input:** `type="file" accept=".json" className="hidden"`. `onChange` calls `handleImportFile`.
- **handleImportFile:** Reads `e.target.files?.[0]`, calls `importLibrary(file)`, maps `ImportResult` to one of four status messages (error / zero imported / partial skip / full success). Resets `e.target.value = ''` after import to allow re-import of the same file.
- **Status display:** `{status && <p className="text-xs text-muted-foreground">{status}</p>}` — React text child only. No `dangerouslySetInnerHTML`. Auto-clears after 4000ms via `showStatus` helper.

### `src/ui/LibraryDrawer/LibraryDrawer.tsx` (updated)

Two changes only:
1. Added `SheetFooter` to the sheet import block.
2. Added `import { ExportImport } from './ExportImport'`.
3. After the entry list `div`, added `<SheetFooter className="border-t pt-4"><ExportImport entries={entries} /></SheetFooter>` inside `SheetContent`. `entries` is the existing `useLiveQuery` result — no new state or db access introduced.

## Tests

| File | Tests | Result |
|------|-------|--------|
| Full suite | 171 | All pass |

No new test file (UI interaction component; human verification covers LIB-05 end-to-end). Existing domain and adapter tests continue to pass unchanged.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 73eae39 | Task 1 | feat(03-04): add ExportImport component and mount in LibraryDrawer SheetFooter |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

No new security surface beyond the plan's threat model.

- T-03-15 mitigated: `grep -c 'dangerouslySetInnerHTML' src/ui/LibraryDrawer/ExportImport.tsx` → 0. Status strings are template literals with `result.imported` and `result.skipped` (integer counts) and controlled copy-text only — no file content interpolated.
- T-03-16 accept: `fileInputRef.current?.click()` invoked only from the Import button's `onClick` — explicit user gesture required.

## Known Stubs

None — ExportImport is fully wired to `exportLibrary`/`importLibrary` domain functions. No placeholder behavior.

## Checkpoint Status

**Task 2 (checkpoint:human-verify)** — PASSED. Human completed end-to-end verification of the complete Phase 3 workflow on 2026-06-29; all 12 steps passed (save, list, second save, inline rename, reload clean, reload dirty, delete, persist, export, import, import validation, empty state). No discrepancies reported. Phase 3 (LIB-01..05, PLT-03) verified end-to-end.

## Self-Check: PASSED

- src/ui/LibraryDrawer/ExportImport.tsx — exists, exports ExportImport
- src/ui/LibraryDrawer/LibraryDrawer.tsx — updated; SheetFooter + ExportImport present
- `npx tsc --noEmit` — exits 0 (no output)
- `npx vitest run` — 171 tests, 16 files, all pass
- `grep -c 'dangerouslySetInnerHTML' src/ui/LibraryDrawer/ExportImport.tsx` → 0
- `grep -c 'entries\.length === 0' src/ui/LibraryDrawer/ExportImport.tsx` → 1 (Export disabled when empty)
- `grep -c 'e\.target\.value' src/ui/LibraryDrawer/ExportImport.tsx` → 1 (input reset after import)
- `grep -c 'ExportImport' src/ui/LibraryDrawer/LibraryDrawer.tsx` → 2 (import + usage)
- `grep -c 'SheetFooter' src/ui/LibraryDrawer/LibraryDrawer.tsx` → 3 (import + open tag + close tag)
- Commit 73eae39 — verified in git log
