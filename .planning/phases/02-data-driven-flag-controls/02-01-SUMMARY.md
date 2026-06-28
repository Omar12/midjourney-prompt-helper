---
phase: 02-data-driven-flag-controls
plan: "01"
subsystem: domain/flags
tags:
  - flags
  - schema
  - zod
  - pure-functions
  - tdd
dependency_graph:
  requires: []
  provides:
    - src/domain/flags (FlagDefinitionSchema, VersionDefinitionSchema, FLAG_DEFINITIONS, VERSION_DEFINITIONS, helpers)
  affects:
    - src/domain/prompt/serialize.ts (Phase 2 extension point reads serializeFlag)
    - src/state/buildSession.ts (reads FLAG_DEFINITIONS/VERSION_DEFINITIONS in Plan 02)
    - src/ui/ControlsPane/FlagControls (consumes getFlagsForVersion in Plans 03-05)
tech_stack:
  added: []
  patterns:
    - Zod discriminated union for ControlSpec (slider/number/aspect-ratio/text)
    - Typed const arrays for version-scoped config data
    - Pure function helpers with null-on-missing return convention
    - TDD: RED (test) → GREEN (implementation) per task
key_files:
  created:
    - src/domain/flags/schema.ts
    - src/domain/flags/versions.ts
    - src/domain/flags/definitions.ts
    - src/domain/flags/helpers.ts
    - src/domain/flags/index.ts
    - src/domain/flags/schema.test.ts
    - src/domain/flags/helpers.test.ts
  modified: []
decisions:
  - "All 5 flags (ar/stylize/chaos/seed/no) available on all 5 versions at MVP; per-version exclusions remain a one-line config edit"
  - "helpers.ts does NOT call sanitize() internally — callers (TextFlagControl) are responsible per domain layer boundary"
  - "serializeFlag returns null for empty string but NOT for zero — satisfies D-06 (no silent auto-omit by default value)"
  - "validateAspectRatio uses /^\\d+:\\d+$/ strict format + zero-component rejection; no sanitize call since format validation makes injection structurally impossible"
metrics:
  duration: "~2 minutes"
  completed: "2026-06-27"
  tasks: 2
  files: 7
---

# Phase 02 Plan 01: Flag Domain Module Summary

**One-liner:** Zod-typed flag definition schema and VERSION_DEFINITIONS/FLAG_DEFINITIONS data arrays with pure helper functions (getFlagsForVersion, serializeFlag, getVersionParameter, validateAspectRatio) as the single source of truth for all Phase 2 flag work.

## What Was Built

Created `src/domain/flags/` — the foundational domain module for Phase 2. Every downstream plan (store, serializer, UI) reads from this module.

**7 files, 58 passing tests, zero npm installs.**

### Files Created

| File | Role | Key Exports |
|------|------|-------------|
| `schema.ts` | Zod schemas + TS types | FlagDefinitionSchema, VersionDefinitionSchema, ControlSpecSchema, FlagDefinition, VersionDefinition, ControlSpec |
| `versions.ts` | Version config data | VERSION_DEFINITIONS (5 entries: v8.1, v7, v6.1, niji7, niji6) |
| `definitions.ts` | Flag config data | FLAG_DEFINITIONS (5 entries: ar, stylize, chaos, seed, no) |
| `helpers.ts` | Pure helper functions | getFlagsForVersion, serializeFlag, getVersionParameter, validateAspectRatio |
| `index.ts` | Barrel re-export | export * from all 4 sibling modules |
| `schema.test.ts` | Schema + data tests | 20 tests for schemas and data array shapes |
| `helpers.test.ts` | Helper function tests | 38 tests covering all edge cases |

### Key Data Shapes

**FLAG_DEFINITIONS** (canonical tail order):
- `ar`: aspect-ratio control, 7 presets (`1:1`→`21:9`), all 5 versions
- `stylize`: slider 0–1000 step 1, all 5 versions
- `chaos`: slider 0–100 step 1, all 5 versions
- `seed`: number 0–4294967295, all 5 versions
- `no`: text, placeholder `'trees, text, watermark'`, maxLength 500, all 5 versions

**VERSION_DEFINITIONS** (latest first):
`v8.1` (`--v 8.1`) → `v7` (`--v 7`) → `v6.1` (`--v 6.1`) → `niji7` (`--niji 7`) → `niji6` (`--niji 6`)

## Verification Results

```
Test Files  2 passed (2)
     Tests  58 passed (58)
TypeScript  clean (npx tsc --noEmit)
```

## Deviations from Plan

**1. [Rule 1 - Deviation] Placeholder helpers.ts created in Task 1**
- **Found during:** Task 1 GREEN phase
- **Issue:** index.ts requires export from ./helpers to satisfy acceptance criterion "4 export * lines", but helpers.ts is created in Task 2. Without a placeholder, TypeScript module resolution fails.
- **Fix:** Created `helpers.ts` with `export {}` in Task 1; replaced with full implementation in Task 2.
- **Files modified:** `src/domain/flags/helpers.ts`
- **Impact:** None — fully transparent to downstream consumers.

No other deviations. Plan executed as written.

## Known Stubs

None. All exported functions are fully implemented and tested.

## Threat Flags

No new security-relevant surface introduced. All files are pure TypeScript with no network access, no user input handling, and no side effects.

## Self-Check: PASSED

- [x] `src/domain/flags/schema.ts` exists
- [x] `src/domain/flags/versions.ts` exists
- [x] `src/domain/flags/definitions.ts` exists
- [x] `src/domain/flags/helpers.ts` exists
- [x] `src/domain/flags/index.ts` exists
- [x] `src/domain/flags/schema.test.ts` exists
- [x] `src/domain/flags/helpers.test.ts` exists
- [x] All commits present: 2543165, e4df6c4, 6d2a388, d6734c0
- [x] 58 tests pass, 0 failures
- [x] TypeScript: clean
- [x] No React/framework imports in domain files
- [x] serializeFlag('stylize', 0) returns '--stylize 0' (D-06 verified)
- [x] validateAspectRatio('16:9 --stylize 999') returns null (injection rejected)
