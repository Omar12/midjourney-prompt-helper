---
phase: 02-data-driven-flag-controls
plan: "04"
subsystem: ui/flag-controls
tags: [react, zustand, base-ui, tailwind, security]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [VersionSelect, ARControl, SliderFlagControl, NumberFlagControl, TextFlagControl]
  affects: [FlagControls.tsx (Plan 05)]
tech_stack:
  added: []
  patterns:
    - props-based controlled components (no direct store access in leaf components)
    - local draft state for deferred sanitization (TextFlagControl)
    - per-field Zustand selectors to prevent React 19 referential-instability loops
    - type-narrowed prop interfaces for discriminated-union ControlSpec
key_files:
  created:
    - src/ui/ControlsPane/FlagControls/VersionSelect.tsx
    - src/ui/ControlsPane/FlagControls/ARControl.tsx
    - src/ui/ControlsPane/FlagControls/SliderFlagControl.tsx
    - src/ui/ControlsPane/FlagControls/NumberFlagControl.tsx
    - src/ui/ControlsPane/FlagControls/TextFlagControl.tsx
  modified: []
decisions:
  - SliderFlagControl receives all constraint values (min/max/step) exclusively via def.control props — no hardcoded 0, 1000, or 100 literals exist in the component
  - TextFlagControl defers sanitize() to blur/Enter commit; local draft state prevents mid-keystroke corruption of partial input
  - ARControl uses type-narrowing early return after all hooks are declared (React rules compliance)
  - NumberFlagControl uses NumberField from @base-ui/react/number-field rather than Slider for the seed flag — 4,294,967,295 max is impractical for slider UX
metrics:
  duration: 18m
  completed: "2026-06-28"
  tasks: 2
  files: 5
---

# Phase 02 Plan 04: Leaf Flag Control Components Summary

**One-liner:** Five controlled leaf flag components — VersionSelect (Select), ARControl (preset chips + validated W:H input), SliderFlagControl (Switch-gated base-ui slider), NumberFlagControl (NumberField for seed), TextFlagControl (sanitize-on-commit) — all props-based and security-compliant.

## What Was Built

Five leaf components that FlagControls.tsx (Plan 05) will render in a loop. Each component reads its constraints from typed props and writes to the Zustand store only where required (VersionSelect and ARControl read directly from the store; the three reusable controls are fully props-based).

| Component | Store Access | Key Behavior |
|-----------|-------------|--------------|
| VersionSelect | per-field selectors | Stores `version.id` (not label); × calls `setVersion(null)` |
| ARControl | per-field selectors | 7 presets from `FLAG_DEFINITIONS`; `/^\d+:\d+$/` validation; D-06 no re-click deselect |
| SliderFlagControl | none (props-based) | Switch enable/disable; `opacity-50 pointer-events-none` when unset; `def.control` drives all limits |
| NumberFlagControl | none (props-based) | NumberField for 0–4,294,967,295 range; × clear when set |
| TextFlagControl | none (props-based) | Local draft; `sanitize()` on blur/Enter only; `onChange` fires with sanitized value |

## Security Mitigations Applied

| Threat | Component | Mitigation |
|--------|-----------|------------|
| T-02-01: `--no` injection | TextFlagControl | `sanitize()` called on commit; raw keystrokes never reach the parent |
| T-02-02: AR custom injection (`16:9 --stylize 999`) | ARControl | `/^\d+:\d+$/` rejects any input containing spaces or `--`; error shown to user |
| T-02-04: DoS via long `--no` input | TextFlagControl | `maxLength={def.control.maxLength}` (500) on Input; value from FLAG_DEFINITIONS, not hardcoded |
| T-02-05: Version stored as label | VersionSelect | `SelectItem value={version.id}`; label is display-only |
| T-02-xss-01: XSS via flag values | All | React controlled inputs (`value=` prop); no `dangerouslySetInnerHTML` anywhere |

## Key Design Decisions

1. **SliderFlagControl reads min/max/step from `def.control` exclusively.** No literal values appear in the component body. Changing the stylize range in `definitions.ts` updates the UI automatically (FLG-01 compliance).

2. **TextFlagControl's `onChange` contract:** fires only on blur/Enter with an already-sanitized string. FlagControls.tsx (Plan 05) MUST NOT re-sanitize — wire `onChange` directly to `setFlag(def.id, value)`. This contract is documented as a code comment in the component.

3. **ARControl typing via type narrowing.** `FLAG_DEFINITIONS.find(f => f.id === 'ar')` followed by `if (!arDef || arDef.control.type !== 'aspect-ratio') return null` gives TypeScript access to `.control.presets` with no assertion needed. All hooks are called before this early return (React rules compliant).

4. **NumberField instead of Slider for seed.** A slider with max=4,294,967,295 has essentially no drag precision. NumberField provides typed input, increment/decrement buttons, and keyboard up/down — the correct UX for a large integer range (RESEARCH.md Pitfall 1 avoided).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all components are complete with full interaction logic. No placeholder text or hardcoded empty values flow to the UI. FlagControls.tsx (Plan 05) must wire props to complete the integration.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers. All five components render flag values as React controlled input values (not innerHTML); no new network endpoints or auth paths introduced.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| VersionSelect.tsx exists | FOUND |
| ARControl.tsx exists | FOUND |
| SliderFlagControl.tsx exists | FOUND |
| NumberFlagControl.tsx exists | FOUND |
| TextFlagControl.tsx exists | FOUND |
| Task 1 commit 116c6ef | FOUND |
| Task 2 commit cd9704d | FOUND |
| `npx tsc --noEmit` clean | PASSED |
