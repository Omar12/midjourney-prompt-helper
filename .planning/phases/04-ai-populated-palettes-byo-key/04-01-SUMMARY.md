---
phase: 04-ai-populated-palettes-byo-key
plan: "01"
subsystem: domain/ai
tags: [ai-sdk, zod, openrouter, schema-validation, adapter-pattern, tdd]

dependency_graph:
  requires: []
  provides:
    - src/domain/ai/schema.ts — PaletteOptionSchema, PaletteResponseSchema, PaletteMap, PaletteOption
    - src/domain/ai/adapter.ts — PaletteAdapter interface, PaletteCallResult, PaletteError
    - src/domain/ai/openrouter.ts — openRouterAdapter, mapError, PALETTE_SYSTEM_PROMPT, DEFAULT_MODEL
  affects:
    - src/state/paletteSession.ts — will consume PaletteCallResult and PaletteMap (plan 04-02)
    - src/ui/ControlsPane/PaletteAccordion/ — will bind to PaletteMap categories (plan 04-03)
    - src/ui/ControlsPane/SettingsModal/ — will call openRouterAdapter.generatePalettes (plan 04-02/04-03)

tech_stack:
  added:
    - ai@7.0.5 — generateObject, APICallError, NoObjectGeneratedError (resolved from parent node_modules)
    - "@openrouter/ai-sdk-provider@2.10.0" — createOpenRouter model factory
  patterns:
    - z.array(PaletteOptionSchema).catch(EMPTY_OPTS) — per-category graceful degradation (Pitfall 2 avoided)
    - PaletteAdapter interface — adapter extensibility seam for v2 providers (KEY-04)
    - discriminated union PaletteCallResult — {ok:true, palettes} | {ok:false, error} for type-safe error handling
    - mapError — error classification using APICallError.isInstance + statusCode (stable, not string-matching)

key_files:
  created:
    - src/domain/ai/schema.ts — PaletteOptionSchema + PaletteResponseSchema with 6 .catch(EMPTY_OPTS) fields
    - src/domain/ai/adapter.ts — interface-only file; zero runtime code; PaletteAdapter, PaletteCallResult, PaletteError
    - src/domain/ai/openrouter.ts — OpenRouterAdapter implementation, mapError, PALETTE_SYSTEM_PROMPT
    - src/domain/ai/schema.test.ts — 8 tests covering valid parse + .catch([]) degradation scenarios
    - src/domain/ai/adapter.test.ts — 7 tests covering mapError 401/403/429/500/network/NoObjectGenerated
    - src/domain/ai/openrouter.test.ts — 10 tests covering generatePalettes happy path, empty key guard, all-empty, error paths
  modified: []

decisions:
  - "Export mapError from openrouter.ts for direct unit testing in adapter.test.ts — cleaner than indirect testing via generatePalettes mock setup"
  - "Used real APICallError/NoObjectGeneratedError instances in tests (not mocked) — their constructors are accessible and isInstance() returns correctly"
  - "whitespace-only key rejected at key.trim() guard — prevents accidental calls with space-padded stored keys"

metrics:
  duration_minutes: 8
  completed_date: "2026-06-29"
  tasks_completed: 2
  files_created: 6
  files_modified: 0
  tests_added: 25
---

# Phase 4 Plan 1: AI Domain Core — Schema, Adapter, OpenRouter Summary

**One-liner:** Zod 4 PaletteResponseSchema with per-category `.catch([])` fallback, PaletteAdapter extensibility interface, and OpenRouter generateObject implementation with mapError (401/403→auth, 429→malformed, fetch→network).

## What Was Built

The complete AI domain layer for Phase 4. This is the single place where LLM calls originate (KEY-03) and where error classification happens (AI-03). All code is pure domain logic with colocated tests — no UI, no state.

**src/domain/ai/schema.ts** defines:
- `PaletteOptionSchema`: `{label: string(min1,max60), description?: string(max120)}`
- `PaletteResponseSchema`: 6 fields (styleMedium, lighting, cameraLens, composition, color, mood), each `z.array(PaletteOptionSchema).catch(EMPTY_OPTS)`
- Exported types: `PaletteMap`, `PaletteOption`

**src/domain/ai/adapter.ts** (interface-only, zero runtime code) defines:
- `PaletteAdapter` interface: `providerId` + `generatePalettes(intent, key)`
- `PaletteCallResult` discriminated union: `{ok:true, palettes}` | `{ok:false, error}`
- `PaletteError` discriminated union: `{type:'auth'|'network'|'malformed', message}`

**src/domain/ai/openrouter.ts** implements:
- `DEFAULT_MODEL = 'google/gemini-2.0-flash'`
- `PALETTE_SYSTEM_PROMPT` instructing model to populate all 6 categories
- `mapError(err)`: classifies APICallError by statusCode, handles NoObjectGeneratedError
- `openRouterAdapter`: key guard (empty/whitespace → auth error), createOpenRouter at call time, total-zero guard post-resolve

## Tests

25 tests across 3 files, all green. `npx tsc --noEmit` exits 0.

| File | Tests | Coverage |
|------|-------|----------|
| schema.test.ts | 8 | valid parse, null→[], wrong-type→[], all-null, per-category independence |
| adapter.test.ts | 7 | mapError: 401, 403, 429, 500, fetch error, NoObjectGenerated, fixed-string messages |
| openrouter.test.ts | 10 | providerId, happy path, schema/system/prompt call args, key-at-call-time, empty key, whitespace key, all-empty, 401, 429, network |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one minor enhancement.

**Enhancement (Rule 2 — Missing Critical):** Exported `mapError` from `openrouter.ts` for direct unit testing in `adapter.test.ts`. The plan described testing mapError "by constructing mock APICallError instances" which implied direct testing. Exporting mapError is cleaner and avoids needing to mock generateObject just to test error classification. This is an additive change with no impact on callers.

## Security Mitigations Applied (from Threat Model)

| Threat ID | Mitigation |
|-----------|-----------|
| T-04-01-01 | Key accepted as function argument, read at call time only; never stored at module level; never logged |
| T-04-01-02 | PaletteResponseSchema validates all 6 fields; `.catch([])` on each prevents malformed AI output from passing unvalidated |
| T-04-01-03 | mapError messages are fixed strings; raw `err.responseBody` and `err.message` are never surfaced |
| T-04-01-04 | `createOpenRouter({apiKey: key})` calls openrouter.ai directly; no proxy; no first-party server route |

## TDD Gate Compliance

- RED commits: `9fb72d2` (schema tests), `99f9286` (adapter+openrouter tests)
- GREEN commits: `e9d08a4` (schema impl), `84a1c63` (adapter+openrouter impl)
- Gate sequence: test → feat → test → feat (compliant)

## Known Stubs

None — all implemented functionality is complete domain logic with no placeholder values.

## Threat Flags

None — no new network endpoints or trust boundaries introduced beyond what was planned. All threat surface is accounted for in the plan's threat model.

## Self-Check: PASSED

- [x] `src/domain/ai/schema.ts` exists
- [x] `src/domain/ai/adapter.ts` exists
- [x] `src/domain/ai/openrouter.ts` exists
- [x] `src/domain/ai/schema.test.ts` exists
- [x] `src/domain/ai/adapter.test.ts` exists
- [x] `src/domain/ai/openrouter.test.ts` exists
- [x] Commit `9fb72d2` (test RED schema) — verified
- [x] Commit `e9d08a4` (feat GREEN schema) — verified
- [x] Commit `99f9286` (test RED adapter+openrouter) — verified
- [x] Commit `84a1c63` (feat GREEN adapter+openrouter) — verified
- [x] `npx vitest run src/domain/ai/` — 25 tests passed
- [x] `npx tsc --noEmit` — exits 0
- [x] `schema.ts` contains `.catch(` exactly 6 times
- [x] `adapter.ts` has zero function bodies
- [x] No `console.log` in any domain/ai/ file
