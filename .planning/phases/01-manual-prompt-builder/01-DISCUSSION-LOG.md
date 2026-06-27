# Phase 1: Manual Prompt Builder - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 1-Manual Prompt Builder
**Areas discussed:** Prompt string format, Special-char escaping, Builder layout & feedback

---

## Prompt String Format

### Emit order

| Option | Description | Selected |
|--------|-------------|----------|
| Intent first, chips after | Intent text, then chips appended; matches MJ convention | ✓ |
| Chips first, intent after | Chips lead, then free-text intent | |

**User's choice:** Intent first, chips after

### Separator

| Option | Description | Selected |
|--------|-------------|----------|
| Comma + space | `intent, chip1, chip2` — standard MJ separator | ✓ |
| Space only | `intent chip1 chip2` — loses descriptor boundaries | |
| You decide | Claude picks MJ-idiomatic default | |

**User's choice:** Comma + space

### Intent handling

| Option | Description | Selected |
|--------|-------------|----------|
| Opaque block | Intent passed verbatim (after escaping) as single segment | ✓ |
| Split on user commas | User commas become descriptor boundaries | |

**User's choice:** Opaque block

---

## Special-Char Escaping

### Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Silently sanitize | Auto-clean output, never block user | ✓ |
| Sanitize + subtle notice | Clean + small inline hint | |
| Warn, don't auto-fix | Flag issue, user fixes | |

**User's choice:** Silently sanitize

### Method

| Option | Description | Selected |
|--------|-------------|----------|
| Collapse to single char | `::`→`:`, `--`→`-` | ✓ |
| Break with a space | `::`→`: :`, `--`→`- -` | |
| You decide | Claude picks safest | |

**User's choice:** Collapse to single char

### Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All risky tokens | `::`, `--`, leading/trailing commas, newlines→space | ✓ |
| Just :: and -- | Only the two MJ-significant sequences | |

**User's choice:** All risky tokens

---

## Builder Layout & Feedback

### Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single column | input → chips → preview → actions, top to bottom | |
| Two-pane | Controls left, sticky preview right | ✓ |

**User's choice:** Two-pane

### Preview

| Option | Description | Selected |
|--------|-------------|----------|
| Always-visible panel | Dedicated live-updating preview box w/ copy button | ✓ |
| Collapsible/secondary | Preview tucked away or toggled | |

**User's choice:** Always-visible panel

### Actions (copy + clear)

| Option | Description | Selected |
|--------|-------------|----------|
| 'Copied!' flip + confirm clear | Copy flips to 'Copied!'; Clear confirms when content present | ✓ |
| 'Copied!' flip + instant clear | Same copy feedback, instant clear | |
| Toast + instant clear | Toast on copy, instant clear | |

**User's choice:** 'Copied!' flip + confirm clear

---

## Claude's Discretion

- **Custom chip mechanics** — area offered but not selected for discussion. Defaulting to plain text-label chips, click-to-remove, dedup identical labels, insertion order.
- **`PromptDraft` model shape** — exact Zod/TS structure left to research/planning (constraints recorded in CONTEXT.md).
- **Empty/placeholder states, microcopy, responsive collapse** — standard defaults.

## Deferred Ideas

None — discussion stayed within phase scope.
