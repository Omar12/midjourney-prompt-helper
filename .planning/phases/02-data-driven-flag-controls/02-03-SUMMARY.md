---
phase: 02-data-driven-flag-controls
plan: "03"
subsystem: domain/serializer, components/ui
tags: [serializer, flags, tdd, ui-primitives, shadcn]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [serialize-flag-tail, slider-primitive, select-primitive]
  affects: [02-04, 02-05]
tech_stack:
  added: []
  patterns:
    - "Flag tail emission: version param first via getVersionParameter, then flags via serializeFlag"
    - "shadcn/base-nova CLI generates UI primitives; alias resolution quirk requires manual placement in src/"
key_files:
  created:
    - src/components/ui/slider.tsx
    - src/components/ui/select.tsx
  modified:
    - src/domain/prompt/serialize.ts
    - src/domain/prompt/serialize.test.ts
decisions:
  - "Serializer trusts App.tsx pre-filtering; receives only set+version-compatible flags (no extra filtering in serialize.ts)"
  - "value=0 treated as valid emission (D-06); serializeFlag only omits null/undefined/empty string"
  - "shadcn CLI placed files in literal @/ directory; moved to src/components/ui/ manually"
metrics:
  duration: 12m
  completed: "2026-06-27"
  tasks: 2
  files: 4
---

# Phase 02 Plan 03: Serializer Flag Tail Emission + UI Primitives Summary

**One-liner:** Extended serialize.ts to emit MJ flag syntax at prompt tail (version first, then flags) and installed shadcn slider/select wrappers over @base-ui/react.

## What Was Built

### Task 1: Serializer Phase 2 extension point (TDD)

`src/domain/prompt/serialize.ts` now imports `serializeFlag` and `getVersionParameter` from `../flags/helpers` and emits a flag tail at the prompt end:

- Version parameter emitted first (`selectedVersionId → getVersionParameter → flagParts`)
- Flags emitted in array-order via `serializeFlag` (null/empty string/undefined omitted; 0 emits)
- No leading space when descriptors is empty (flag-only output)
- All Phase 1 golden cases preserved (no regression)

`src/domain/prompt/serialize.test.ts` gained 10 new cases:
- 8 golden-case entries covering: ar flag only, version only, intent+version+flag, D-04 (empty flags), D-06 (zero emits), unknown flagId omit, flag-only no leading space, no-regression
- 2 standalone tests: version-before-ar ordering, niji7 → `--niji 7`

### Task 2: shadcn slider and select primitives

- `src/components/ui/slider.tsx` — wraps `@base-ui/react/slider`, exports `Slider` compound component
- `src/components/ui/select.tsx` — wraps `@base-ui/react/select`, exports `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`

No new npm packages — `@base-ui/react` was already a dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn CLI placed files in literal `@/` directory**
- **Found during:** Task 2
- **Issue:** `npx shadcn@latest add slider/select` wrote to `<project-root>/@/components/ui/` instead of resolving the `@` alias to `src/`. The `components.json` alias `"ui": "@/components/ui"` was treated as a literal path by the CLI.
- **Fix:** Read generated content from `@/components/ui/`, wrote to correct `src/components/ui/`, removed the misplaced `@/` directory.
- **Files modified:** `src/components/ui/slider.tsx`, `src/components/ui/select.tsx`
- **Commit:** f22e631

## Verification

- `npx vitest run src/domain/prompt/serialize.test.ts` — 23/23 pass
- `npx vitest run` (full suite) — 141/141 pass
- `src/components/ui/slider.tsx` and `src/components/ui/select.tsx` exist, both import from `@base-ui/react/*`
- `git diff HEAD package.json` — empty (no new packages)

## Known Stubs

None — serializer is fully wired; UI primitives are complete wrappers (Plan 04 will import them).

## Threat Flags

None — no new trust boundaries introduced. shadcn CLI writes from official registry (T-02-SC mitigated: @base-ui/react already approved, package.json unchanged).

## Self-Check: PASSED

- [x] `src/domain/prompt/serialize.ts` exists and imports from `../flags/helpers`
- [x] `src/components/ui/slider.tsx` exists
- [x] `src/components/ui/select.tsx` exists
- [x] `src/domain/prompt/serialize.test.ts` exists with new cases
- [x] Commits c016186 (test RED), f7b55d7 (feat GREEN), f22e631 (feat UI primitives) all present
