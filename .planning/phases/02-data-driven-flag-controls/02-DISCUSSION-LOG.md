# Phase 2: Data-Driven Flag Controls - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 2-Data-Driven Flag Controls
**Areas discussed:** Flag panel placement, Default emission policy

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Flag panel placement | Where flag controls live in the two-pane layout | ✓ |
| Version coverage + switch behavior | Which MJ versions ship + switch-conflict handling (FLG-04) | |
| Default emission policy | Which flags emit by default vs only when touched | ✓ |
| Control style per flag | Sliders vs steppers; preset chips vs dropdown for AR | |

---

## Flag Panel Placement

### Q1 — Where should flag controls sit in the two-pane layout?

| Option | Description | Selected |
|--------|-------------|----------|
| Section in left pane, always visible | Third block below intent + chips, always on screen | ✓ |
| Collapsible 'Flags' panel in left pane | Accordion, collapsed by default | |
| Separate tab | Build / Flags tabs over the left pane | |

**User's choice:** Section in left pane, always visible.

### Q2 — How to organize the six controls within that section?

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list, logical order | All six stacked: version → aspect → stylize → chaos → seed → no | ✓ |
| Primary visible + 'More' for rest | Version/aspect always; rest behind expander | |
| Grouped with labels | 'Model & Format' + 'Tuning' labeled groups | |

**User's choice:** Flat list, logical order.

---

## Default Emission Policy

### Q1 — Which flags appear in the prompt tail by default?

| Option | Description | Selected |
|--------|-------------|----------|
| Omit all until touched | Empty section appends nothing; MJ applies server-side defaults | ✓ |
| Always emit version + aspect | --v and --ar always present for reproducibility | |
| Always emit version only | Pin --v always; rest omitted until touched | |

**User's choice:** Omit all until touched.

### Q2 — Once set, how does a flag go back to NOT appearing?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit set/unset per flag | Clear/remove control returns flag to omitted; default-looking values still emit | ✓ |
| Auto-omit when value = MJ default | Flag emits only when value differs from MJ default | |

**User's choice:** Explicit set/unset per flag.

---

## Claude's Discretion

User chose "Ready for context" rather than discussing further; these were explicitly deferred to research/planning:
- Version coverage at launch (which MJ versions in the flag-definition data).
- Version-switch conflict behavior (non-destructive default preferred; VAL-01 warnings are v2/out of scope).
- Control style per flag (slider vs stepper; preset chips vs dropdown).
- Aspect-ratio preset set.
- Flag-definition data shape (TS/Zod structure).

## Deferred Ideas

None — discussion stayed within phase scope. Reference flags, `::` weights, and validation warnings already tracked as v2 requirements (REF-01, WGT-01, VAL-01).
