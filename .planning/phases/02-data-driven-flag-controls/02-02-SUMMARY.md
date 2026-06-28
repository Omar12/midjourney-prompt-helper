---
phase: 02-data-driven-flag-controls
plan: "02"
subsystem: domain-model-store
tags: [model, zustand, schema, flags, tdd]
dependency_graph:
  requires: [02-01]
  provides: [PromptDraft-v2, buildSession-flag-actions]
  affects: [02-03, 02-04, 02-05]
tech_stack:
  added: []
  patterns:
    - "Zustand per-field selectors (no object selector to avoid referential instability)"
    - "TDD RED/GREEN for schema evolution and store actions"
    - "Zod literal bump (1→2) as migration gate"
    - "flagValues/setFlags split: D-05 hide-but-retain + D-06 zero-is-valid"
key_files:
  created:
    - src/state/buildSession.test.ts
  modified:
    - src/domain/prompt/model.ts
    - src/domain/prompt/model.test.ts
    - src/domain/prompt/serialize.test.ts
    - src/ui/App.tsx
    - src/state/buildSession.ts
decisions:
  - "flagValues and setFlags kept separate: isSet=true with value=0 is distinct from isSet=false (D-06)"
  - "unsetFlag preserves flagValues to support hide-but-retain when toggling version scope (D-05)"
  - "clearAll resets all 5 fields to ensure full session wipe (BLD-06 extension)"
metrics:
  duration: 10m
  completed_date: "2026-06-28"
  tasks: 2
  files: 6
---

# Phase 02 Plan 02: Model + Store Extension Summary

PromptDraft bumped to schemaVersion 2 (adds `selectedVersionId`) and Zustand store extended with flag state (`flagValues`, `setFlags`) and actions (`setVersion`, `setFlag`, `unsetFlag`, extended `clearAll`).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | PromptDraft v2 failing tests | a72a7ec | model.test.ts, serialize.test.ts |
| 1 GREEN | Bump schema to v2, fix App.tsx | 3d78ad5 | model.ts, App.tsx |
| 2 RED | Store flag action failing tests | b6431b0 | buildSession.test.ts (new) |
| 2 GREEN | Extend store with flag state/actions | 4bd136f | buildSession.ts |

## Verification

- `npx vitest run src/domain/prompt/model.test.ts src/domain/prompt/serialize.test.ts` — 21/21 pass
- `npx vitest run src/state/buildSession.test.ts` — 18/18 pass
- `npx vitest run` (full suite) — 131/131 pass, 0 failures

## Key Implementation Details

**PromptDraft v2 (model.ts):**
- `schemaVersion: z.literal(2)` — rejects any stored v1 drafts at parse time
- `selectedVersionId: z.string().nullable().default(null)` — placed after `flags` array; `.default(null)` means omitting the field is valid (backward-compat construction)

**buildSession.ts store extension:**
- `setFlag(flagId, value)` — spreads into both `flagValues` and marks `setFlags[flagId]=true`; zero is stored correctly (no falsy short-circuit)
- `unsetFlag(flagId)` — only updates `setFlags[flagId]=false`, leaves `flagValues` intact (D-05 hide-but-retain so value is restored when flag is re-enabled)
- `clearAll()` now resets `selectedVersionId: null, flagValues: {}, setFlags: {}` in addition to `intent` and `chips`

**App.tsx:** Minimal 2-field fix (`schemaVersion: 2`, `selectedVersionId: null`) to prevent TypeScript literal mismatch; no FlagControls wiring yet (Plan 05).

**serialize.test.ts mkDraft:** Now accepts `flags` and `selectedVersionId` optional parameters, preparing the helper for Plan 03 flag serialization test cases without requiring callers to change.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no UI rendering is involved in this plan; all changes are model/store layer.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced. `setFlag` accepts `unknown` values intentionally; sanitization responsibility is documented in the threat model as belonging to Plan 04's UI callers (matching the existing `addChip` pattern).

## Self-Check: PASSED

Files created/modified:
- src/domain/prompt/model.ts — FOUND
- src/domain/prompt/model.test.ts — FOUND
- src/domain/prompt/serialize.test.ts — FOUND
- src/ui/App.tsx — FOUND
- src/state/buildSession.ts — FOUND
- src/state/buildSession.test.ts — FOUND

Commits verified:
- a72a7ec (test RED Task 1) — FOUND
- 3d78ad5 (feat GREEN Task 1) — FOUND
- b6431b0 (test RED Task 2) — FOUND
- 4bd136f (feat GREEN Task 2) — FOUND
