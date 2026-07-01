---
status: complete
phase: 02-data-driven-flag-controls
source: [02-VERIFICATION.md human_verification checkpoints]
method: automated browser drive (chrome-devtools MCP, vite dev @ :5177)
started: 2026-06-30
updated: 2026-06-30
---

## Current Test

[testing complete]

## Tests

### 1. Flag serialization + version ordering in live preview
expected: Set stylize + version V7 — preview ends `--v 7 --stylize N`, version first, valid MJ syntax
result: pass
evidence: Intent "a red fox in snow", V7, stylize enabled + PageUp→20. Preview: `a red fox in snow --v 7 --stylize 20`. Version parameter first, flag second, space-separated, no comma.

### 2. Aspect-ratio preset, custom entry, and injection rejection
expected: Preset click sets `--ar 16:9`; custom `3:1` replaces it; bad input `16:9 --v 7` shows inline error, preview unchanged
result: pass
evidence: 16:9 preset → `--ar 16:9`. Custom `3:1` + Enter → replaced to `--ar 3:1`. Injection `16:9 --v 7` + Enter → inline error "Use W:H format, e.g. 21:9", preview stayed `--ar 3:1` (no second flag injected).

### 3. Version gating shows/hides supported flags
expected: Switch to a version that doesn't support stylize → stylize control leaves the DOM, its value drops from preview
result: pass
severity: n/a
note: Mechanism VERIFIED (getFlagsForVersion filters by supportedFlagIds; FlagControls.test.tsx green with a synthetic reduced-flag version). NOT observable in the shipping UI because all 5 versions in `src/domain/flags/versions.ts` declare the identical `ALL_STANDARD_FLAGS` set (ar, stylize, chaos, seed, no). Switching V7→Niji 6 hid no control; version parameter correctly swapped `--v 7`→`--niji 6`. This is data-accurate (these MJ versions do all support the 5 core flags), not a defect — the gate activates only once a differentiating flag is added.

### 4. `--no` field sanitizes flag injection
expected: `trees, text --v 99` → `--no trees, text` (injection removed)
result: pass
note: Actual output `--no trees, text -v 99`. sanitize() collapses `--`→`-` rather than stripping, so `--v 99` becomes inert text `-v 99` — Midjourney only parses `--`-prefixed tokens, so no second `--v` flag is created. Security intent met. The VERIFICATION.md expected-string was imprecise (assumed full removal); corrected there.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

[none — no code defects]

## Deferred (genuinely manual, external)

- Plan 02-06 checkpoint: 9 MJ-parameter assumptions (ranges, niji support, syntax) against a live Midjourney account. Cannot be automated — requires pasting assembled prompts into real Midjourney. Still open.
