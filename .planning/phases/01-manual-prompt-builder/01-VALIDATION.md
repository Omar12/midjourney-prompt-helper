---
phase: 1
slug: manual-prompt-builder
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + @testing-library/react + happy-dom |
| **Config file** | `vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `npx vitest run src/domain` |
| **Full suite command** | `npx vitest run` |
| **Coverage command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~2s domain only · ~6s full suite |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/domain` (pure-function tests, < 2s)
- **After every plan wave:** Run `npx vitest run` (full suite incl. component tests)
- **Before `/gsd:verify-work`:** Full suite green + domain core 100% branch coverage
- **Max feedback latency:** 6 seconds

---

## Per-Task Verification Map

> Task IDs assigned during planning; rows are keyed by requirement + behavior. Every row maps to an automated test created in Wave 0.

| Plan | Wave | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|------|------|-------------|----------|-----------|-------------------|-------------|--------|
| domain | 1 | ASM-02 | `PromptDraftSchema` validates a valid draft | unit | `npx vitest run src/domain/prompt/model.test.ts` | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-02 | `PromptDraftSchema` rejects chip with empty label | unit | same file | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-03 | `sanitize()` collapses `::`→`:`, `--`→`-` | unit | `npx vitest run src/domain/prompt/sanitize.test.ts` | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-03 | `sanitize()` collapses newlines to spaces | unit | same file | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-03 | `sanitize()` strips leading/trailing commas | unit | same file | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-03 | `sanitize()` order: `\n--`→` -` (newline before dash collapse) | unit | same file | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-01 | `serialize()` intent-first, chips in order, joined `, ` | unit | `npx vitest run src/domain/prompt/serialize.test.ts` | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-01 | `serialize()` deterministic — same input→same output | unit | same file | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-01 | `serialize()` skips disabled chips | unit | same file | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-01 | `serialize()` empty draft → empty string | unit | same file | ❌ W0 | ⬜ pending |
| domain | 1 | ASM-01 | `serialize()` intent commas preserved (opaque block, D-03) | unit | same file | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-01 | Intent input renders + accepts text | component | `npx vitest run src/ui/IntentInput.test.tsx` | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-04 | Add chip input+button creates chip in state | component | `npx vitest run src/ui/ChipInput.test.tsx` | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-04 | Duplicate chip label ignored | component | same file | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-03 | Clicking ✕ removes chip from state | component | `npx vitest run src/ui/ChipArea.test.tsx` | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-05 | Preview updates when intent changes | component | `npx vitest run src/ui/LivePreview.test.tsx` | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-05 | Preview updates when chip added | component | same file | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-07 | Copy button calls `clipboard.writeText` with preview | component | `npx vitest run src/ui/CopyButton.test.tsx` | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-07 | Copy button shows "Copied!" after copy | component | same file | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-06 | Clear triggers confirm when content present | component | `npx vitest run src/ui/ClearButton.test.tsx` | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-06 | Confirm clears state | component | same file | ❌ W0 | ⬜ pending |
| ui | 2 | BLD-06 | No dialog when already empty | component | same file | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom happy-dom` — test framework
- [ ] `vitest.config.ts` — vitest config (happy-dom env)
- [ ] `src/test/setup.ts` — jest-dom matchers + cleanup
- [ ] `src/domain/prompt/model.test.ts` — schema validation stubs (ASM-02)
- [ ] `src/domain/prompt/sanitize.test.ts` — table-driven escaping stubs (ASM-03)
- [ ] `src/domain/prompt/serialize.test.ts` — golden-string serializer stubs (ASM-01)
- [ ] `src/ui/IntentInput.test.tsx`, `ChipInput.test.tsx`, `ChipArea.test.tsx`, `LivePreview.test.tsx`, `CopyButton.test.tsx`, `ClearButton.test.tsx` — component stubs (BLD-01,03,04,05,06,07)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Two-pane layout responsive collapse on narrow viewport | BLD-05 (D-09) | Visual/responsive — not asserted in unit tests | Resize browser < 640px; controls stack above preview, preview still reachable |
| Real clipboard paste round-trip | BLD-07 | Component test mocks `navigator.clipboard`; real OS clipboard not exercised | Copy a built prompt, paste into a text editor, confirm exact string |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`vitest run`, not `vitest`)
- [ ] Feedback latency < 6s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner aligns task IDs)

**Approval:** pending
