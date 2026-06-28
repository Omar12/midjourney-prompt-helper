---
phase: 2
slug: data-driven-flag-controls
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 (happy-dom env) |
| **Config file** | `vitest.config.ts` (root); setup `src/test/setup.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-1 | 01 | 1 | FLG-01 | — | N/A | unit | `npx vitest run src/domain/flags/` | ❌ W0 | ⬜ pending |
| 02-01-2 | 01 | 1 | FLG-01, FLG-03, FLG-04 | — | N/A | unit | `npx vitest run src/domain/flags/helpers.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-1 | 02 | 1 | FLG-04, FLG-05 | — | N/A | unit | `npx vitest run src/domain/prompt/model.test.ts src/domain/prompt/serialize.test.ts` | ✅ extend | ⬜ pending |
| 02-02-2 | 02 | 1 | FLG-02, BLD-06 | — | N/A | unit | `npx vitest run src/state/buildSession.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-1 | 03 | 2 | FLG-05 | — | N/A | unit | `npx vitest run src/domain/prompt/serialize.test.ts` | ✅ extend | ⬜ pending |
| 02-03-2 | 03 | 2 | FLG-02 | — | N/A | install | `test -f src/components/ui/slider.tsx && test -f src/components/ui/select.tsx` | ❌ W0 | ⬜ pending |
| 02-04-1 | 04 | 3 | FLG-02, FLG-03 | T-02-02 | AR `--ar` accepts only `/^\d+:\d+$/` | unit | `npx vitest run src/ui/ControlsPane/FlagControls/` | ❌ W0 | ⬜ pending |
| 02-04-2 | 04 | 3 | FLG-02, FLG-05 | T-02-01 | `--no` value routed through `sanitize()` before commit | unit | `npx vitest run src/ui/ControlsPane/FlagControls/` | ❌ W0 | ⬜ pending |
| 02-05-1 | 05 | 4 | FLG-02, FLG-04, FLG-05 | T-02-ver-gate | App derivation filters by `setFlags[id]===true` AND `supportedFlagIds` | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-05-2 | 05 | 4 | FLG-04 | T-02-ver-gate | Unsupported-version flag absent from DOM | unit (component) | `npx vitest run src/ui/ControlsPane/FlagControls/FlagControls.test.tsx` | ❌ W0 | ⬜ pending |
| 02-06-1 | 06 | 5 | FLG-02..05 | — | Manual MJ-parameter assumption check | checkpoint | manual (human-verify) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/domain/flags/schema.test.ts`, `src/domain/flags/helpers.test.ts` — stubs for FLG-01, FLG-03, FLG-04
- [ ] `src/state/buildSession.test.ts` — extend for FLG-02, BLD-06 (setFlag/unsetFlag, clearAll)
- [ ] `src/ui/ControlsPane/FlagControls/*.test.tsx` + `FlagControls.test.tsx` — component stubs for FLG-02, FLG-04
- [ ] `src/domain/prompt/serialize.test.ts` — extend existing for FLG-05 / D-04 / D-06 cases

*Existing `sanitize.test.ts` covers ASM-03 (`--no` injection); verify it exercises the `--`/`::` case.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 9 MJ-parameter assumptions (ranges, niji support, syntax) from RESEARCH.md hold against real Midjourney | FLG-02..FLG-05 | Cannot assert external MJ behavior in unit tests | Plan 02-06 checkpoint: paste assembled prompt into Midjourney, confirm each flag parses |
| Responsive layout of Flags section (D-03) | FLG-02 | Visual/layout truth | Resize viewport; confirm Flags section reflows with existing ControlsPane breakpoints |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (02-06 is a human checkpoint by design)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-27
