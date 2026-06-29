---
phase: 4
slug: ai-populated-palettes-byo-key
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-29
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing — domain modules use colocated `*.test.ts`) |
| **Config file** | existing repo vitest config |
| **Quick run command** | `npx vitest run src/domain/ai` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~{N} seconds (confirm in Wave 0) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/domain/ai`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 04-01 | 1 | AI-02, AI-03 | T-04-01 | Per-category `.catch([])` degradation; no key logging | unit | `npx vitest run src/domain/ai/schema.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 04-01 | 1 | AI-01, KEY-03, KEY-04 | T-04-01 | Key sent only to openrouter.ai; no proxy; mapError fixed strings | unit | `npx vitest run src/domain/ai/ && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 04-02-01 | 04-02 | 1 | KEY-01, KEY-02 | T-04-02 | localStorage key save/clear; XSS tradeoff stated | unit | `npx vitest run src/hooks/useKeyStorage.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 04-02 | 1 | BLD-02, AI-03 | T-04-02 | sanitize() gate on addPaletteChip; chip preservation | unit | `npx vitest run src/state/buildSession.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 04-03 | 2 | AI-03, AI-04 | — | D-07 replace / D-08 preserve-selected; isLoading guard | unit | `npx vitest run src/state/paletteSession.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-02 | 04-03 | 2 | KEY-01, KEY-02 | T-04-03 | type="password" masking; clear control; no dangerouslySetInnerHTML | type | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-04-01 | 04-04 | 3 | AI-02 | T-04-04 | Six accordion sections; AI labels as React text nodes only | type | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-04-02 | 04-04 | 3 | AI-01, AI-04, BLD-02 | T-04-04 | CSP connect-src openrouter.ai; double-fire guard; dismissible banner | type+unit | `npx tsc --noEmit && npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Confirm `ai` 7.0.5 / `@openrouter/ai-sdk-provider` 2.10.0 already in package.json (RESEARCH: installed)
- [ ] Live OpenRouter call to verify browser-origin CORS (RESEARCH open question) before building palette UI
- [ ] Test stubs for the per-category Zod schema + `.catch([])` graceful-degradation behavior (AI-03 / D-12)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real AI suggestion populates six palettes from intent | AI-01/02/03 | Requires live key + provider call | Enter key in settings, type intent, click Suggest, confirm six categories populate |
| Key never sent to any first-party server | KEY-03 | Network-trust boundary | Devtools network tab: only outbound request is to openrouter.ai with the key |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
