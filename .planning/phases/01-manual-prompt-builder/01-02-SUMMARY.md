---
phase: 01-manual-prompt-builder
plan: "02"
subsystem: domain-core
tags: [zod, typescript, vitest, tdd, domain-model, serializer, sanitizer]
dependency_graph:
  requires:
    - 01-01 (scaffold, vitest, test stubs)
  provides:
    - PromptDraftSchema (ChipSchema, FlagValueSchema) — canonical re-editable model
    - sanitize(text) — single chokepoint for MJ syntax escaping
    - serialize(draft) — deterministic pure fn, model → prompt string
  affects:
    - Plan 03 (UI/Zustand store binds to PromptDraft and calls serialize)
    - Plan 04 (AI palette chips route through same sanitize chokepoint)
    - Phase 2 (flags array already present; append at serialize tail)
    - Phase 3 (PromptDraft is the persistence unit)
tech_stack:
  added: []
  patterns:
    - Zod schema-first with inferred TypeScript types (no hand-written interfaces)
    - TDD RED→GREEN per task — tests written before implementation
    - Table-driven tests with test.each for golden-string coverage
    - sanitize() operation order: newlines first, then ::, then --, then comma trim
key_files:
  created:
    - src/domain/prompt/model.ts
    - src/domain/prompt/sanitize.ts
    - src/domain/prompt/serialize.ts
  modified:
    - src/domain/prompt/model.test.ts (test.todo stubs → 6 real assertions)
    - src/domain/prompt/sanitize.test.ts (test.todo stubs → 15 real assertions)
    - src/domain/prompt/serialize.test.ts (test.todo stubs → 13 real assertions)
decisions:
  - sanitize() strips leading/trailing commas only (not whitespace) so newline→space in '\n--ar' preserves the resulting leading space, satisfying the plan's must_haves ordering test
  - Added test for enabled chip with whitespace-only label to cover the falsy labelSanitized branch (100% branch coverage gate)
metrics:
  duration: "~42 minutes"
  completed: "2026-06-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
---

# Phase 01 Plan 02: Domain Core (model + sanitize + serialize) Summary

**One-liner:** PromptDraft Zod schema (ChipSchema, FlagValueSchema, schemaVersion literal), single-chokepoint sanitize() with ordered MJ-escaping, and deterministic serialize() — all tested TDD RED→GREEN with 34 assertions and 100% branch coverage.

## What Was Built

### src/domain/prompt/model.ts

Zod schema for the canonical `PromptDraft` re-editable model:

- `ChipSchema`: `id` (uuid), `label` (min1/max200), `source` enum `'custom' | 'palette'` (Phase 4 discriminator already in place), `paletteCategory` optional, `enabled` boolean default true
- `FlagValueSchema`: `flagId` string, `value` unknown (Phase 2 will populate)
- `PromptDraftSchema`: `id` (uuid), `intent` (max2000), `chips` array, `flags` array (empty in Phase 1), `schemaVersion` literal(1), `createdAt`/`updatedAt` datetime strings
- Inferred types exported: `Chip`, `FlagValue`, `PromptDraft`
- Zero framework imports — pure Zod only

### src/domain/prompt/sanitize.ts

Single chokepoint utility for all user-supplied and AI-supplied text (D-08):

Ordered operations:
1. All newline variants → single space (`\r\n`, `\r`, `\n`)
2. `::` → `:` (MJ multi-prompt weight separator)
3. `--` → `-` (MJ parameter prefix — runs AFTER newline collapse to avoid `\n--` edge)
4. Strip leading commas
5. Strip trailing commas

Key behavior: `sanitize('\n--ar 1:1')` → `' -ar 1:1'` (leading space preserved from newline collapse; the test confirms the operation ordering is correct).

### src/domain/prompt/serialize.ts

Deterministic pure function: `PromptDraft` → `string` (D-01..D-04):

- Intent block first (D-01, D-03) — treated as one opaque segment, not split on user commas
- Enabled chips follow in insertion order
- Segments joined by `', '` (D-02)
- Disabled chips excluded
- Empty sanitized segments excluded (whitespace-only labels silently dropped)
- Phase 2 extension point comment: flags append here at the tail

## Test Results

- `model.test.ts`: 6 assertions — valid parse, UUID rejection, empty label rejection, schemaVersion literal enforcement
- `sanitize.test.ts`: 15 assertions — 10 table-driven golden cases + 5 named describe tests
- `serialize.test.ts`: 13 assertions — 7 golden-string table cases + 5 named describe tests + 1 whitespace-label edge case
- **Total: 34 assertions, 3 test files, all green**
- **Coverage: 100% statements, 100% branches, 100% functions, 100% lines on src/domain/**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Coverage] Added whitespace-only chip label test for 100% branch coverage**
- **Found during:** Task 2 coverage run (83.33% branches — serialize.ts line 28 uncovered)
- **Issue:** The `if (labelSanitized)` falsy branch in serialize.ts was untested — no test covered an enabled chip whose label trims to empty
- **Fix:** Added `test('enabled chip whose label trims to empty is excluded')` with a `{label: '   ', enabled: true}` chip
- **Files modified:** `src/domain/prompt/serialize.test.ts`
- **Commit:** 2850aab

### Implementation Note: sanitize() leading whitespace behavior

The plan's `<action>` section described step 4 as `replace(/^[,\s]+/, '')` (strip leading commas AND whitespace), but the plan's `must_haves.truths` explicitly requires `sanitize('\n--ar')` to return `' -ar'` (with leading space). These two specs conflict.

Resolution: the `must_haves.truths` are the hard requirement (they define what tests must verify). The sanitize function was implemented to strip only leading/trailing commas (`/^,+/` and `/,+$/`), preserving whitespace introduced by newline collapse. This satisfies all 10 golden test cases including the ordering verification test. The RESEARCH.md golden table's `-ar 1:1` (without space) was superseded by the plan's explicit behavior spec.

## Verification Evidence

- `npx vitest run src/domain/` → 3 files, 34 tests, exit 0
- `npx vitest run src/domain --coverage` → 100% branch coverage on src/domain/**
- `grep -rn "dangerouslySetInnerHTML" src/domain/` → 0 results
- `grep -rn "import.*react\|import.*zustand" src/domain/` → 0 results (pure TS, zero framework deps)
- model.ts exports: ChipSchema, FlagValueSchema, PromptDraftSchema, Chip, FlagValue, PromptDraft ✓
- sanitize.ts exports: sanitize only ✓
- serialize.ts exports: serialize only; imports sanitize and PromptDraft type ✓

## Known Stubs

None — all domain core contracts are fully implemented and tested.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns. The sanitize() chokepoint mitigates T-02-01 and T-02-02 as specified in the plan's threat model.

## Self-Check: PASSED

- src/domain/prompt/model.ts: exists, exports ChipSchema/FlagValueSchema/PromptDraftSchema/Chip/FlagValue/PromptDraft ✓
- src/domain/prompt/sanitize.ts: exists, exports sanitize ✓
- src/domain/prompt/serialize.ts: exists, exports serialize ✓
- Commit 78e1fb8 (Task 1): confirmed in git log ✓
- Commit 2850aab (Task 2): confirmed in git log ✓
- 34 tests green, 100% branch coverage ✓
