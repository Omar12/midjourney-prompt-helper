---
phase: 04-ai-populated-palettes-byo-key
plan: "04"
subsystem: ui
tags: [accordion, palette-ui, suggest-button, csp, app-wiring]
dependency_graph:
  requires: [04-01, 04-02, 04-03]
  provides: [complete-ai-palette-feature, accordion-primitive, palette-accordion, suggest-button, csp]
  affects: [src/ui/App.tsx, src/ui/ControlsPane/IntentInput.tsx, index.html]
tech_stack:
  added: []
  patterns:
    - "@base-ui/react/accordion wrapper following alert-dialog.tsx pattern"
    - "Per-field Zustand selectors in PaletteAccordion and PaletteOption (React 19 guard)"
    - "isSelected matching via sanitize() before comparing chip labels (D-08)"
    - "Async suggest handler with isLoading double-fire guard (D-09)"
    - "CSP meta tag restricting connect-src to openrouter.ai (T-04-04-03)"
key_files:
  created:
    - src/components/ui/accordion.tsx
    - src/ui/ControlsPane/PaletteAccordion/PaletteAccordion.tsx
    - src/ui/ControlsPane/PaletteAccordion/PaletteOption.tsx
  modified:
    - src/ui/ControlsPane/IntentInput.tsx
    - src/ui/App.tsx
    - index.html
decisions:
  - "Accordion wrapper follows exact alert-dialog.tsx pattern (data-slot, cn(), spread props, named exports)"
  - "ChevronDown rendered as inline SVG in AccordionTrigger (avoids lucide-react import in primitive wrapper)"
  - "PaletteOption uses <button> + text span rather than Badge to allow aria-pressed semantics"
  - "Error banner placed above IntentInput outside palette region per D-11; dismiss calls setError(null)"
  - "6 pre-existing vitest failures confirmed not caused by this plan (ChipArea/ChipInput/ClearButton/IntentInput tests fail on base commit)"
metrics:
  duration: "~25m"
  completed_date: "2026-06-29"
  tasks: 2
  files: 6
---

# Phase 04 Plan 04: Accordion + Palette UI + Suggest Button + App Wiring Summary

**One-liner:** Complete Phase 4 UI delivery — accordion primitive, 6-section palette accordion with loading skeleton, click-to-promote PaletteOption with D-08 isSelected, Suggest button with loading guard, SettingsModal and PaletteAccordion wired into App.tsx, dismissible error banner, CSP meta tag restricting outbound to openrouter.ai.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | accordion.tsx + PaletteAccordion + PaletteOption | d33a9d8 | src/components/ui/accordion.tsx, src/ui/ControlsPane/PaletteAccordion/PaletteAccordion.tsx, src/ui/ControlsPane/PaletteAccordion/PaletteOption.tsx |
| 2 | IntentInput Suggest button + App.tsx wiring + index.html CSP | be404b8 | src/ui/ControlsPane/IntentInput.tsx, src/ui/App.tsx, index.html |

## What Was Built

### Task 1 — Accordion primitive + PaletteAccordion + PaletteOption

**src/components/ui/accordion.tsx**
Wraps `@base-ui/react/accordion` following the exact `alert-dialog.tsx` pattern: named functions with `data-slot`, `cn()` className merging, spread props. Exports `Accordion`, `AccordionItem`, `AccordionHeader`, `AccordionTrigger`, `AccordionPanel`. AccordionTrigger includes an inline SVG chevron that rotates 180° via `[&[data-panel-open]>svg]:rotate-180`.

**src/ui/ControlsPane/PaletteAccordion/PaletteAccordion.tsx**
Reads `palettes` and `isLoading` from `usePaletteSession` and `chips` from `useBuildSession` using per-field selectors (React 19 guard). Three render paths:
- `isLoading=true` → 6 animated skeleton rows, `aria-busy="true"`
- `palettes=null` → placeholder text "Enter your intent above and click Suggest options…"
- `palettes` present → 6-section `<Accordion multiple>` with `defaultValue={['styleMedium']}`, each section mapping to `PaletteOption` components

D-08 selected-label matching: `new Set(chips.filter(c => c.source === 'palette').map(c => c.label))` then `selectedPaletteLabels.has(sanitize(option.label))`.

**src/ui/ControlsPane/PaletteAccordion/PaletteOption.tsx**
Props: `{ option: PaletteOption, category: string, isSelected: boolean }`. Per-field selectors for `chips`, `addPaletteChip`, `removeChip`. On click: if not selected → `addPaletteChip(option.label, category)`; if selected → find chip by `c.label === sanitize(option.label)` and call `removeChip(chip.id)`. Renders AI label as React text node inside `<span>` — no innerHTML. Visual difference via conditional className classes (primary vs secondary).

### Task 2 — Suggest button + App.tsx wiring + CSP

**src/ui/ControlsPane/IntentInput.tsx**
Added `Suggest options` button below Textarea. Disabled when `isLoading || !intent.trim() || !key`. Shows `Loader2` spinner with "Suggesting…" during loading. Click handler: double-fire guard (checks `isLoading`), then `setLoading(true)` + `setError(null)`, then `openRouterAdapter.generatePalettes(intent, key)`, on success calls `setPalettes`, on failure calls `setError`, `finally` calls `setLoading(false)`. No blocking overlay — the rest of the builder stays interactive (D-09).

**src/ui/App.tsx**
Added:
1. "AI Palettes" section header row with `SettingsModal` gear icon trigger on the right
2. Dismissible error banner (conditionally renders when `error !== null`) above IntentInput — uses `role="alert"`, renders `error.message` as text, dismiss button calls `setError(null)`. Fixed strings from `mapError` only — no raw provider bodies surfaced (D-10/T-04-04-05)
3. `<PaletteAccordion />` mounted between IntentInput and ChipInput

**index.html**
- Title updated: `mj-scaffold` → `Midjourney Prompt Helper`
- CSP meta tag added: `connect-src 'self' https://openrouter.ai` (T-04-04-03 mitigation)

## Checkpoint Status

**Task 3 (checkpoint:human-verify)** is PENDING. The automated implementation is complete. Human verification of the running dev server is required before this plan is considered fully done.

See checkpoint details below under "Awaiting Human Verification."

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Pre-existing Test Failures (out of scope)

6 vitest tests fail on the base commit before any Plan 04-04 changes and are NOT caused by this plan:

| Test file | Failing tests | Root cause |
|-----------|--------------|------------|
| ChipArea.test.tsx | 2 | Store state empty — chip not found in DOM |
| ChipInput.test.tsx | 1 | Store not updated after click |
| ClearButton.test.tsx | 2 | Dialog not rendering — @base-ui portal in test env |
| IntentInput.test.tsx | 1 | Store not updated after type |

These failures predate Plan 04-04. They are tracked in `deferred-items.md` for investigation in a future plan.

## Security / Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-04-04-01 | PaletteOption renders `option.label` as React text node only; no innerHTML |
| T-04-04-02 | Key read from `useKeyStorage` at call time; never logged; `setError` uses fixed strings from `mapError` |
| T-04-04-03 | CSP meta tag: `connect-src 'self' https://openrouter.ai` added to index.html |
| T-04-04-04 | isLoading guard at top of handleSuggest; button disabled while loading |
| T-04-04-05 | Error banner renders `error.message` (fixed strings only); no raw SDK error bodies |
| T-04-04-06 | `setPalettes` replaces available options only; existing chips untouched; sanitize() used for matching |

## Known Stubs

None. All data flows are wired end-to-end.

## Self-Check: PASSED

Files confirmed present:
- src/components/ui/accordion.tsx ✓
- src/ui/ControlsPane/PaletteAccordion/PaletteAccordion.tsx ✓
- src/ui/ControlsPane/PaletteAccordion/PaletteOption.tsx ✓
- src/ui/ControlsPane/IntentInput.tsx (modified) ✓
- src/ui/App.tsx (modified) ✓
- index.html (modified) ✓

Commits confirmed:
- d33a9d8 feat(04-04): accordion primitive + PaletteAccordion + PaletteOption ✓
- be404b8 feat(04-04): Suggest button + App wiring + CSP meta tag ✓
