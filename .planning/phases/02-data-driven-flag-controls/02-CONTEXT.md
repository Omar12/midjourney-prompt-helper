# Phase 2: Data-Driven Flag Controls - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A user can set Midjourney technical flags (`--ar`, `--v`/`--niji`, `--stylize`, `--chaos`, `--no`, `--seed`) through UI controls (sliders, dropdowns, toggles) that are **generated from versioned flag-definition data**, with the selected model version gating which flags appear and their valid values. Selected flags render into the live preview and copied string in valid Midjourney syntax, ordered at the prompt tail.

**In scope:** version-scoped flag definition data (FLG-01); UI controls for the six core flags (FLG-02); aspect-ratio presets + custom `w:h` (FLG-03); version selector that gates available flags/values (FLG-04); flags serialized into the prompt tail in valid syntax (FLG-05).
**Out of scope (other phases):** save/library/backup (Phase 3); AI-populated palettes + BYO key (Phase 4); desktop/Tauri (Phase 5). Also out of scope per REQUIREMENTS v2: `--sref`/`--cref`/`--oref` reference manager, multi-prompt `::` weight editor, version-aware validation warnings (VAL-01).

</domain>

<decisions>
## Implementation Decisions

### Flag Panel Placement (UI layout)
- **D-01:** Flags live as a **third always-visible section in the left controls pane**, below intent + chips. No collapsible panel, no tabs — consistent with the Phase 1 two-pane layout (controls left, sticky preview right). Always on screen.
- **D-02:** Within the section, controls are a **flat list in a fixed logical order**: version → aspect ratio → stylize → chaos → seed → no. No nested groups, no "More options" expander, no labeled subgroups.
- **D-03:** Inherits Phase 1's responsive behavior — two-pane collapses to single column on narrow viewports (Claude/UI-phase discretion); the flag section stacks with the rest of the left pane.

### Default Emission Policy (serializer output — FLG-05)
- **D-04:** **Omit every flag until explicitly set.** An untouched flag section appends nothing to the prompt tail. Midjourney applies its own server-side defaults (version, 1:1, etc.), so the app does not pin defaults into the string. Keeps the copied prompt clean.
- **D-05:** Each flag has an **explicit set/unset state** with a clear/remove control (e.g. ×/off) to return it to omitted. State is explicit, not inferred from value.
- **D-06:** **No silent auto-omit by value.** A flag set to a value that happens to equal Midjourney's default (e.g. `--stylize 0`) **still emits**. Setting and clearing are distinct from value — "set to default-looking value" is NOT the same as "unset".

### Claude's Discretion (deferred to research/planning)
- **Version coverage at launch** — which MJ versions ship in the flag-definition data (V6, V6.1, V7, niji 6, etc.). Pick a sensible current set; data-driven so easily extended (FLG-01).
- **Version-switch conflict behavior** — what happens to an already-set flag/value when switching to a version that doesn't support it (drop / disable / warn). User did not lock this; choose a non-destructive default (prefer preserving the user's in-progress work; e.g. hide the control but retain the value, or drop with a quiet note). Note: VAL-01 (validation warnings) is explicitly v2/out of scope, so keep switch handling simple.
- **Control style per flag** — sliders vs number steppers for stylize (0–1000) / chaos (0–100) / seed; preset chips vs dropdown for aspect ratio. Roadmap names "sliders, dropdowns, toggles" as the palette; planner/UI-phase picks per flag.
- **Aspect-ratio preset set** — which presets to offer alongside custom `w:h` entry (FLG-03).
- **Flag-definition data shape** — exact TypeScript/Zod structure of the version-scoped flag config; must drive the UI generically (FLG-01) and feed `FlagValueSchema { flagId, value }` already present in the model.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & requirements
- `.planning/ROADMAP.md` §"Phase 2: Data-Driven Flag Controls" — phase goal, success criteria, requirement set (FLG-01..05).
- `.planning/REQUIREMENTS.md` §"Flags" — exact requirement text (FLG-01..05). Also §"v2 Requirements" (REF-01, WGT-01, VAL-01) and §"Out of Scope" to keep flag scope bounded.
- `.planning/PROJECT.md` — core value, constraints, "Data-driven MJ flag definitions" key decision.

### Phase 1 foundations this phase extends
- `.planning/phases/01-manual-prompt-builder/01-CONTEXT.md` — Phase 1 decisions: two-pane layout (D-09), serializer contract (D-01..04), sanitize chokepoint (D-05..08).
- `src/domain/prompt/model.ts` — `PromptDraftSchema.flags: FlagValueSchema[]` (`{ flagId, value }`) is the pre-built extension point flags populate. `schemaVersion` literal — bump if reshaped.
- `src/domain/prompt/serialize.ts` — has the explicit "Phase 2 extension point: flags appended at the tail here" comment. Flags render after intent + chips; serializer must stay deterministic/pure (D-04).
- `src/state/buildSession.ts` — Zustand session store; currently holds intent + chips only. Phase 2 adds flag state + set/unset actions here.

### Tech stack (locked)
- `CLAUDE.md` §"Technology Stack" — TypeScript + Vite + React 19 + Zod + Zustand + Tailwind v4 + shadcn/ui (note: actual deps use `@base-ui/react` + `shadcn` CLI, `lucide-react`, `class-variance-authority`). No AI SDK / Dexie / Tauri yet.
- `CLAUDE.md` §"Security Implications" — treat user-supplied flag text (custom `w:h`, `--no` value) as untrusted; route through sanitize/validation, no `dangerouslySetInnerHTML`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/prompt/model.ts`: `FlagValueSchema { flagId, value }` and `PromptDraftSchema.flags` array already exist — flags slot in without a model reshape.
- `src/components/ui/*`: shadcn-style primitives present (`button`, `input`, `badge`, `textarea`, `alert-dialog`). Flag controls (slider, select/dropdown) likely need adding via the shadcn CLI.
- `src/domain/prompt/sanitize.ts`: the single escaping chokepoint — reuse for any free-text flag input.

### Established Patterns
- Two-pane layout: `src/ui/ControlsPane/*` (left) and `src/ui/PreviewPane/*` (right). New flag section is a new component under `ControlsPane/`.
- State via Zustand (`useBuildSession`); pure serializer reads draft → string. Keep flag controls as controlled inputs writing to the store; preview re-derives.

### Integration Points
- **Serializer tail:** `serialize.ts` line ~31 extension point — emit set flags after chips in valid MJ syntax, deterministic order.
- **Session store:** add flag values + set/unset actions to `buildSession.ts`.
- **Flag config data:** new module (e.g. `src/domain/flags/`) holding version-scoped definitions that drive both the UI controls and the serializer's per-flag syntax — the FLG-01 "not hardcoded in UI logic" requirement.

</code_context>

<specifics>
## Specific Ideas

- Prompt tail must read as valid Midjourney syntax (e.g. `<intent>, <chips> --ar 16:9 --stylize 250`), flags space-separated after the descriptor list.
- Flag definitions are the single source of truth for which flags exist, their valid values per version, and how each renders to syntax — the UI is generated from this data, never the reverse (FLG-01).
- "Set to default value still emits" (D-06) is a deliberate predictability choice over a cleaner-but-surprising auto-omit.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Reference flags (`--sref`/`--cref`/`--oref`), `::` weights, and version-aware validation warnings are already tracked as v2 requirements (REF-01, WGT-01, VAL-01) in REQUIREMENTS.md, not introduced here.

</deferred>

---

*Phase: 2-Data-Driven Flag Controls*
*Context gathered: 2026-06-27*
