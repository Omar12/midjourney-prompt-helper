# Phase 4: AI-Populated Palettes + BYO Key - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 4-AI-Populated Palettes + BYO Key
**Areas discussed:** Provider & key setup, Palette display, Re-suggest behavior, Failure UX

---

## Provider & key setup

### Which provider ships v1 behind the single adapter?

| Option | Description | Selected |
|--------|-------------|----------|
| OpenRouter only | One key → 400+ models, browser-CORS-friendly, lowest friction; adapter still designed for more later | ✓ |
| OpenAI-compatible generic | Any base URL implementing OpenAI Chat API; max openness, more setup friction | |
| Direct vendor (e.g. OpenAI) | One vendor's direct endpoint; CORS may block browser until Tauri (Phase 5) | |

### Where does key + provider entry live?

| Option | Description | Selected |
|--------|-------------|----------|
| Settings modal/dialog | Gear-icon dialog: provider select, masked key, clear-key, privacy note; keeps builder uncluttered | ✓ |
| Inline panel in controls pane | Always visible in left pane; adds clutter for a set-once thing | |
| First-run prompt + settings | Prompt on first AI trigger if missing, plus settings to change/clear | |

### Can the user pick the model?

| Option | Description | Selected |
|--------|-------------|----------|
| Sensible default, hidden | App picks a good default; no model picker in v1 | ✓ |
| Optional model field | Editable override pre-filled with default | |

**User's choice:** OpenRouter only; settings modal/dialog; sensible default model hidden.
**Notes:** Provider + key treated as coupled setup; model selection deferred to v2 power feature.

---

## Palette display

### How do the 6 categories render?

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked labeled sections | Six always-visible labeled chip grids; can get tall | |
| Collapsible accordions | Each category collapsible; compact for 6 categories × many chips | ✓ |
| Tabbed categories | One category at a time; most compact but hides the rest | |

### How do AI options relate to the existing custom-chip ChipArea?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate palette area, click promotes | AI options in own UI; click adds as source:'palette' chip into existing flow | ✓ |
| Unified — selected highlights in place | Palette chips toggle in place; no separate added-chips tray | |

### Where does the trigger live?

| Option | Description | Selected |
|--------|-------------|----------|
| Button by the intent input | Trigger sits with its input; single explicit action | ✓ |
| Dedicated palette-area header | Trigger groups with output region | |

**User's choice:** Collapsible accordions; separate palette area with click-to-promote; trigger button by the intent input.
**Notes:** Promotion reuses existing addChip + sanitize chokepoint.

---

## Re-suggest behavior

### What happens to previous palette options on re-run?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace all options | New suggestion replaces palette contents entirely; clean/predictable | ✓ |
| Merge/append new options | Accumulates across runs; clutter + duplicates | |

### What happens to already-selected chips?

| Option | Description | Selected |
|--------|-------------|----------|
| Always preserved | Selected chips stay regardless; AI-03 guarantee made concrete | |
| Preserved + re-offered if returned | Stay; same-label new options show as already-selected | ✓ |

### Builder state during loading?

| Option | Description | Selected |
|--------|-------------|----------|
| Builder stays fully usable | Only trigger shows loading; palette spinner/skeleton | |
| Palette area disabled during load | Just palette region disabled; trigger debounced against concurrent calls | ✓ |

**User's choice:** Replace all options; preserve selected + re-offer if returned; palette area disabled during load.
**Notes:** Requires same-label matching between new options and current selections.

---

## Failure UX

### How are failure types surfaced?

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct messages per cause | Differentiate invalid key / network / malformed-or-rate-limit; actionable | ✓ |
| Single generic error + retry | One message + retry; simplest, less helpful | |

### Where does an error appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in palette area | Error + retry in the palette region | |
| Toast / transient banner | Dismissible toast; doesn't occupy palette space | ✓ |

### Partial/malformed data?

| Option | Description | Selected |
|--------|-------------|----------|
| Show valid, drop invalid | Per-category Zod validate; render parsed, skip malformed | ✓ |
| All-or-nothing | Reject whole response if not fully valid | |

**User's choice:** Distinct messages per cause; toast/transient banner; show valid / drop invalid (per-category validation).
**Notes:** Planner flagged to pair toast with a durable retry affordance (the trigger button serves as it) so a transient toast doesn't strand the user.

---

## Claude's Discretion

- AI SDK wiring (Vercel AI SDK + `@openrouter/ai-sdk-provider`, `generateObject`, adapter interface) — not yet installed.
- Palette output Zod schema shape + options-per-category count.
- Web key storage mechanism (localStorage vs IndexedDB).
- System/prompt design for the AI call.
- Whether the last suggestion persists across reload / into library (default: session-only).
- Settings-modal primitive choice.

## Deferred Ideas

- Additional provider adapters (Anthropic/OpenAI/Gemini/local) — PROV-01, v2.
- Per-category "suggest more / regenerate" — AI-05, v2.
- Model picker / per-call override — v2.
- Persisting the last suggestion across reload/library — promote only if cheap.
- OS-keychain / encrypted-at-rest key storage — Phase 5 (desktop) hardening.
