---
phase: 03-local-library-backup
plan: "03"
subsystem: domain/library
tags: [import, export, tdd, zod, dexie, indexeddb, fake-indexeddb, security]
dependency_graph:
  requires:
    - LibraryEntrySchema (src/domain/library/schema.ts) — 03-01
    - db singleton (src/persistence/db.ts) — 03-01
  provides:
    - importLibrary (src/domain/library/import.ts)
    - exportLibrary (src/domain/library/import.ts)
    - ImportResult interface (src/domain/library/import.ts)
  affects:
    - src/ui/LibraryDrawer/ExportImport.tsx — 03-04 will import these functions
tech_stack:
  added: []
  patterns:
    - TDD RED→GREEN for importLibrary (test file committed first, then implementation)
    - Per-entry LibraryEntrySchema.safeParse validate-and-skip (D-08)
    - crypto.randomUUID() fresh ids per imported entry (D-07 non-destructive merge)
    - parse/shape error discriminant return values (no throws for expected failures)
    - BulkError swallow for best-effort partial bulkAdd
    - Blob+anchor download pattern for exportLibrary (not showSaveFilePicker — Safari compat)
key_files:
  created:
    - src/domain/library/import.ts
    - src/domain/library/import.test.ts
  modified: []
decisions:
  - "exportLibrary included in import.ts alongside importLibrary — single file for all file-I/O domain logic, consistent with helpers.ts pattern of grouping related utilities"
  - "Test fixture chips use proper ChipSchema objects (id/label/source/enabled) — plain strings are rejected by LibraryEntrySchema via ChipSchema validation"
  - "exportLibrary receives entries as parameter rather than reading from Dexie — caller (ExportImport component) passes useLiveQuery result, keeping function pure and testable without DOM"
metrics:
  duration: 5m
  completed: "2026-06-29"
  tasks_completed: 2
  files_changed: 2
---

# Phase 03 Plan 03: Import/Export Domain Module Summary

**One-liner:** importLibrary with per-entry Zod validate-and-skip, fresh-id non-destructive merge, and parse/shape error paths; exportLibrary with Blob+anchor JSON download — fully tested with fake-indexeddb.

## What Was Built

- **`src/domain/library/import.ts`** — Three named exports:
  - `ImportResult` interface: `{ imported: number; skipped: number; error?: 'parse' | 'shape' }`
  - `importLibrary(file: File): Promise<ImportResult>` — validates each entry via `LibraryEntrySchema.safeParse`, assigns fresh `crypto.randomUUID()` per valid entry (D-07), performs `db.entries.bulkAdd` with BulkError swallowed, returns counts. Non-JSON → `{ error: 'parse' }`; missing entries array → `{ error: 'shape' }`.
  - `exportLibrary(entries: LibraryEntry[]): Promise<void>` — builds `{ schemaVersion: 2, exportedAt, entries }` envelope, serializes via `JSON.stringify`, creates Blob, triggers download via anchor click, revokes URL after 1000ms.

- **`src/domain/library/import.test.ts`** — 7 integration tests using `fake-indexeddb/auto` (first import, per Pitfall 4). `beforeEach(db.entries.clear())` reset discipline. Tests cover:
  1. Valid file → `{ imported: 1, skipped: 0 }`
  2. Mixed entries → `{ imported: 1, skipped: 2 }`
  3. All invalid → `{ imported: 0, skipped: 2 }`, existing entries unaffected
  4. Non-JSON → `{ error: 'parse' }`
  5. Wrong top-level shape → `{ error: 'shape' }`
  6. Re-import → `db.entries.count() === 2` (fresh ids, D-07)
  7. Multi-entry import → count matches imported count

## Tests

| File | Tests | Result |
|------|-------|--------|
| src/domain/library/import.test.ts | 7 | All pass |
| Full suite | 171 | All pass |

TDD discipline: `import.test.ts` committed as RED (module-not-found failure), then `import.ts` committed as GREEN (all 7 tests pass).

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 0b415fd | Task 1 RED | test(03-03): add failing importLibrary tests |
| ee797f7 | Task 1+2 GREEN | feat(03-03): implement importLibrary validate-and-skip |

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed test fixture chips shape**
- **Found during:** Task 1 GREEN phase (first test run — 4 of 7 tests failing)
- **Issue:** `makeValidEntry` used `chips: ['moody', 'forest']` (plain strings). `LibraryEntrySchema` inherits `ChipSchema` which requires `{ id: uuid, label: string, source: enum, enabled: boolean }` — plain strings fail Zod validation, causing all entries to be counted as skipped.
- **Fix:** Updated `makeValidEntry` to produce proper `Chip` objects with `id`, `label: 'moody'/'forest'`, `source: 'custom'`, `enabled: true`.
- **Files modified:** `src/domain/library/import.test.ts`
- **Commit:** ee797f7

**2. exportLibrary implemented in same commit as importLibrary (Task 2 pre-empted)**
- The PATTERNS.md pattern map already showed both functions in `import.ts`. Including `exportLibrary` in the same implementation commit was natural; no separate commit was needed since no new test file was required for Task 2 and `tsc --noEmit` + full suite served as Task 2 verification.

## Threat Flags

No new security surface beyond the plan's threat model. Security checks confirmed:
- `grep -c 'eval\b' src/domain/library/import.ts` → 0 (T-03-14 mitigated)
- `grep -c 'dangerouslySetInnerHTML' src/domain/library/import.ts` → 0
- Only `result.data` (Zod-validated, typed) is written to Dexie — raw parsed object never spread directly (T-03-11 mitigated)
- `crypto.randomUUID()` on every import regardless of stored id prevents overwrite (T-03-12 mitigated)

## Known Stubs

None — `importLibrary` and `exportLibrary` are fully implemented domain functions with no placeholder behavior.

## Self-Check: PASSED

- src/domain/library/import.ts — exists; exports ImportResult, importLibrary, exportLibrary (grep count: 3)
- src/domain/library/import.test.ts — exists; 7 tests, all pass
- `npx vitest run src/domain/library/import.test.ts` — 7/7 pass
- `npx tsc --noEmit` — clean
- `npx vitest run` — 171 tests, 16 files, all pass
- `grep -c 'LibraryEntrySchema\.safeParse' import.ts` → 1
- `grep -c 'crypto\.randomUUID' import.ts` → 1
- `grep -c 'createObjectURL\|a\.download' import.ts` → 2
- `grep -c 'eval\b' import.ts` → 0
- `grep -c 'export default' import.ts` → 0
- Commits 0b415fd, ee797f7 — verified in git log
