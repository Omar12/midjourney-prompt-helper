# Phase 1: Manual Prompt Builder - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

A user can hand-build a complete, correctly-formatted Midjourney prompt from a plain-language description plus custom chips, see it live-previewed, and copy it to the clipboard. This phase establishes the three foundations everything downstream consumes: the canonical `PromptDraft` model (re-editable structured state, not raw text), the deterministic serializer (model → prompt string), and the live-preview build loop.

**In scope:** intent input, custom chips (add/remove), live preview, copy, clear/reset, special-char escaping, canonical model + serializer.
**Out of scope (other phases):** Midjourney flags/version controls (Phase 2), save/library/backup (Phase 3), AI-populated palettes + BYO key (Phase 4), desktop/Tauri (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Prompt String Format (serializer contract — ASM-01)
- **D-01:** Emit **intent text first, then chips appended**, matching Midjourney convention (description leads, descriptors follow).
- **D-02:** Join all segments with **`, ` (comma + space)** — the standard MJ descriptor separator.
- **D-03:** Treat the **intent as one opaque block** — passed through verbatim (after escaping) as a single segment. Only chips are discrete model entries. The serializer does NOT split the user's intent on their own commas.
- **D-04:** Serializer must be **deterministic and pure** (same `PromptDraft` → same string). This is the contract Phases 2–4 extend (flags append at the tail, palette chips reuse the chip path).

### Special-Character Escaping (ASM-03)
- **D-05:** **Silently sanitize** — clean the output automatically, never block the user. Manual builder; keep the flow fast.
- **D-06:** Neutralize MJ-significant doubles by **collapsing to a single char**: `::` → `:`, `--` → `-`.
- **D-07:** Sanitize scope = **all risky tokens**: double-colon `::`, double-dash `--`, leading/trailing commas, and newlines (collapse newlines to spaces). Covers the ways free text breaks MJ syntax.
- **D-08:** Escaping applies to all user-provided text (intent + custom chip labels). Design the escape function as the single chokepoint so Phase 4 AI-supplied content routes through the same path (AI output is untrusted text too).

### Builder Layout & Feedback (BLD-05/06/07)
- **D-09:** **Two-pane layout** — controls (intent input + chips + actions) on the left, **sticky always-visible live-preview panel** on the right. Preview is the core value of the build loop; keep it on screen while editing.
- **D-10:** **Copy button lives on the preview panel**; on copy it **flips to "Copied!" briefly** then reverts (visible confirmation, no silent failure).
- **D-11:** **Clear/reset confirms when there is content** in the builder (intent or chips present); no-op or instant when already empty. Prevents accidental loss of in-progress work.

### Claude's Discretion
- **Custom chip mechanics** (not selected for discussion): default to plain text-label chips, click-to-remove, dedup identical labels, order = insertion order. Planner may refine.
- **`PromptDraft` model shape:** exact TypeScript/Zod structure left to research/planning, subject to: must be re-editable structured state (ASM-02), must carry intent + chips now, and must be forward-compatible with flags (Phase 2) and palette-sourced chips (Phase 4) without a breaking reshape.
- **Empty/placeholder states** and exact copy/microcopy: standard sensible defaults.
- **Two-pane responsive collapse** on narrow viewports: Claude/UI-phase discretion (stacking to single column on mobile is acceptable).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & requirements
- `.planning/ROADMAP.md` §"Phase 1: Manual Prompt Builder" — phase goal, success criteria, requirement set (BLD-01,03,04,05,06,07 / ASM-01,02,03).
- `.planning/REQUIREMENTS.md` §"Builder Core" + §"Prompt Assembly" — exact requirement text this phase satisfies.
- `.planning/PROJECT.md` — core value, constraints, key decisions.

### Tech stack (locked)
- `CLAUDE.md` §"Technology Stack" — locked stack: TypeScript + Vite + React 19 + Zod (model/serializer schema) + Zustand (in-progress draft state) + Tailwind v4 + shadcn/ui. Phase 1 uses no AI SDK, no Dexie, no Tauri yet, but must not preclude them.
- `CLAUDE.md` §"Security Implications" — treat all user/LLM text as untrusted; strict XSS posture (no `dangerouslySetInnerHTML` on prompt content). Relevant to the escaping chokepoint (D-08).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield. No `src/`, no `package.json` yet. Phase 1 scaffolds the Vite + React + TS project per the locked stack.

### Established Patterns
- Stack conventions are pre-decided in `CLAUDE.md` (Zod for schemas, Zustand for session/UI state, Tailwind v4 + shadcn/ui for components). Follow them; no competing patterns exist yet.

### Integration Points
- This phase DEFINES the seams others plug into: the `PromptDraft` model and the deterministic serializer are the integration surface for Phase 2 (flags append at tail), Phase 3 (save/reload full draft state), and Phase 4 (palette chips reuse the chip path). Design these as the stable core.

</code_context>

<specifics>
## Specific Ideas

- Serializer output should read like a natural Midjourney prompt: `"<intent>, <chip>, <chip>"`.
- The escape function is a single shared utility (the chokepoint), not scattered per-field logic — explicitly so Phase 4's AI content reuses it.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Flags, library, AI palettes, and desktop are already separate roadmap phases.)

</deferred>

---

*Phase: 1-Manual Prompt Builder*
*Context gathered: 2026-06-26*
