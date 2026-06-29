# Phase 4: AI-Populated Palettes + BYO Key - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

A user enters a plain-language intent and their own LLM API key, then triggers an **explicit** AI suggestion (not per-keystroke) that fills six categorized palettes (Style/Medium, Lighting, Camera & Lens, Composition, Color, Mood) with relevant options. The user clicks palette options to promote them into the prompt as chips and deselects them. All LLM access runs **client-side** through **one provider adapter** designed so more providers can be added later (v2), with AI output **Zod-validated per category** so malformed/failed responses degrade gracefully without wiping in-progress work.

**In scope:** local-only key entry/save/clear (KEY-01/02/03); one provider adapter, designed for extension (KEY-04); explicit AI trigger populating palettes from intent (AI-01); six categorized core palettes (AI-02); per-category schema validation + graceful degradation (AI-03); explicit (non-per-keystroke) triggering (AI-04); click palette options to add/remove as chips (BLD-02).

**Out of scope (other phases / v2):** additional provider adapters — Anthropic/OpenAI/Gemini/local (PROV-01, v2); per-category "suggest more / regenerate" scoped to one palette (AI-05, v2); desktop/Tauri build + CORS bypass via Tauri HTTP (Phase 5). The key shares the web origin with the rest of the app — strict XSS posture is a hard requirement (CLAUDE.md security section).

</domain>

<decisions>
## Implementation Decisions

### Provider & Key Setup (KEY-01..04)
- **D-01:** **OpenRouter is the only provider shipped in v1**, behind the single adapter. Chosen for lowest friction (one key → 400+ models), browser-CORS friendliness (avoids the documented web-build CORS gotcha for direct vendor endpoints), and non-technical-user fit. The adapter must still be structured so additional providers slot in later without reshaping callers (KEY-04). PROV-01 (more adapters) stays v2.
- **D-02:** **Key + provider entry lives in a settings modal/dialog** (e.g. a gear-icon trigger), keeping the two-pane builder uncluttered. The modal holds: provider display, a **masked** key input, a **clear-key** control, and the plain-language privacy statement ("your key is stored locally and sent only to your chosen provider — there is no first-party server"). Key entry/masking/clear must be obvious per CLAUDE.md security guidance.
- **D-03:** **No model picker in v1** — the app uses a sensible default model for OpenRouter; model selection is deferred (v2 power feature). Keeps first-suggestion friction minimal and suggestion quality consistent.

### Palette Display (AI-02, BLD-02)
- **D-04:** **Six categories render as collapsible accordion sections** in the left controls pane (one per category: Style/Medium, Lighting, Camera & Lens, Composition, Color, Mood). Accordions keep the pane compact given 6 categories × many options. (Note: this differs from the always-visible flat pattern of Phase 2 flags — deliberate, because palette volume is much larger.)
- **D-05:** **Palette options are a SEPARATE area from the selected-chips ChipArea; clicking an option promotes it into the existing chip flow** as `source: 'palette'`. Clear distinction between "available AI suggestions" and "what I've picked". Promotion routes through the existing `addChip` path so AI labels inherit the sanitize chokepoint (P1 D-08) — but a palette-aware add is needed (existing `addChip` hardcodes `source: 'custom'`; see code_context).
- **D-06:** **The AI suggestion trigger is a button next to the intent input** ("Suggest options" or similar). Intent is the input to the call, so the trigger sits with it. Single explicit action satisfies AI-04 (not per-keystroke).

### Re-suggest Behavior (AI-03, AI-04)
- **D-07:** **A new suggestion REPLACES all palette options** (not merge/append). Palettes always reflect the latest intent; avoids clutter and cross-run duplicates.
- **D-08:** **Already-selected chips are always PRESERVED across a re-suggest, and re-offered as "already selected" if the new response returns a same-label option.** This is the concrete AI-03 "never wipe in-progress work" guarantee: a palette refresh only swaps the available-options list, never the user's committed selections. Requires same-label matching between new palette options and current selected chips.
- **D-09:** **During a suggestion call, only the palette area is disabled/skeletoned; the rest of the builder (intent, chips, flags, copy) stays fully usable.** The trigger is debounced/guarded to prevent concurrent double-fires. No blocking overlay.

### Failure UX (AI-03)
- **D-10:** **Distinct, actionable messages per failure cause** — differentiate (a) missing/invalid key → point the user to settings, (b) network/timeout → offer retry, (c) malformed response / rate-limit → retry / try again. The adapter maps provider errors into these categories.
- **D-11:** **Errors surface as a transient toast / dismissible banner** (not occupying the palette region). Note for planner: pair the toast with a retry affordance so a transient toast doesn't strand the user without a way to re-trigger (the trigger button by the intent input already serves as the durable retry path).
- **D-12:** **Partial results: validate per category, render what parsed, silently drop malformed categories.** Zod-validates each of the six categories independently; valid categories show, invalid ones are skipped. A fully-empty/invalid result falls back to the error state (D-10/D-11). Maximizes usefulness and never wipes in-progress work — the AI-03 degradation requirement made concrete.

### Claude's Discretion (deferred to research/planning)
- **AI SDK wiring** — CLAUDE.md locks the **Vercel AI SDK (`ai` 7.x) with `@openrouter/ai-sdk-provider`** and `generateObject` against a Zod palette schema. Exact package set, model-factory shape, and the adapter interface are planner's call, subject to: client-side only (no proxy), one swappable adapter (KEY-04), key never sent anywhere but the provider (KEY-03). The AI SDK is **not yet installed** — add it.
- **Palette output Zod schema shape** — the `generateObject` schema for the six categories (e.g. `{ category: option[] }` with `{label, value/description}` per option). Must validate per-category to enable D-12 partial-success, and feed labels through sanitize on promotion (D-05).
- **Options-per-category count** — how many suggestions each palette returns (cap for UI/cost). Pick a sensible default; not user-locked.
- **Key storage mechanism (web)** — `localStorage` vs IndexedDB for the key; CLAUDE.md accepts web storage for v1 with XSS controlled, and defers OS-keychain hardening to the Phase 5 desktop build. Planner picks; flag the XSS/local-storage tradeoff in UI copy.
- **System/prompt design for the AI call** — the instruction that turns intent into categorized options. Planner/researcher drafts; treat all returned text as untrusted.
- **Whether the last suggestion persists** across reload / into saved library entries — not raised; default to session-only palette state unless research shows a cheap win. (Selected chips already persist via the existing `PromptDraft`/library path.)
- **Settings-modal primitive** — reuse `@base-ui/react` dialog / existing `alert-dialog` or add a dialog via shadcn CLI; planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & requirements
- `.planning/ROADMAP.md` §"Phase 4: AI-Populated Palettes + BYO Key" — phase goal, 5 success criteria, requirement set (AI-01..04, BLD-02, KEY-01..04).
- `.planning/REQUIREMENTS.md` §"AI Suggestions" (AI-01..04), §"Provider / API Key" (KEY-01..04), §"Builder Core" (BLD-02) — exact requirement text. Also §"v2 Requirements" (PROV-01, AI-05, VAL-01) and §"Out of Scope" to keep scope bounded.
- `.planning/PROJECT.md` — core value, BYO-key + local-only + provider-flexible constraints, "User brings own LLM API key" / "AI suggests options, user assembles" key decisions.

### Tech stack & security (locked — MUST follow)
- `CLAUDE.md` §"Technology Stack" / §"Provider-Flexible Client-Side LLM Integration" — locks **Vercel AI SDK (`ai` 7.x)** + **`@openrouter/ai-sdk-provider`**, `generateObject` with a Zod schema. Pin `@ai-sdk/*` to the major matching `ai`. AI SDK + OpenRouter provider are NOT yet installed.
- `CLAUDE.md` §"Security Implications — API Key Stored Locally" — **hard requirements:** key never leaves the device except to the chosen provider over HTTPS (no first-party server); aggressive XSS prevention (no `dangerouslySetInnerHTML` on AI output; treat all LLM output as untrusted text); strict CSP; obvious key masking + one-click clear; no telemetry/logging of key or prompts. Directly governs D-02, D-05, D-12.
- `CLAUDE.md` §"Security Implications" (CORS note) — direct vendor browser calls may be CORS-blocked; OpenRouter/OpenAI-compatible gateways generally allow browser origins. Rationale for D-01 choosing OpenRouter on the web build. **Verify CORS for OpenRouter during implementation.**
- `CLAUDE.md` §"What NOT to Use" — no per-vendor SDK sprawl / `dangerouslyAllowBrowser`; no "BYOK via our proxy". Use the AI SDK's unified client-side path.

### Phase 1–3 foundations this phase extends
- `.planning/phases/01-manual-prompt-builder/01-CONTEXT.md` — two-pane layout (D-09); `addChip` sanitize chokepoint (D-05/D-08) that AI labels MUST route through; serializer deterministic/pure.
- `src/domain/prompt/model.ts` — `ChipSchema` already has `source: z.enum(['custom','palette'])` and `paletteCategory` (built for this phase). `PromptDraftSchema` unchanged — palette chips reuse the existing chip path; no schema reshape expected (do NOT bump `schemaVersion` without a breaking reason).
- `src/state/buildSession.ts` — `addChip(label)` currently hardcodes `source: 'custom'` and dedups by sanitized label. Phase 4 needs a palette-aware add (carries `source: 'palette'` + `paletteCategory`) reusing the same sanitize + dedup gate; plus palette-options state + selected-matching for D-08.
- `src/domain/prompt/sanitize.ts` — the single escaping chokepoint; AI-supplied labels route through it on promotion (D-05).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/prompt/model.ts`: `ChipSchema.source: 'palette'` + `paletteCategory` already exist — AI-promoted chips slot in with no model change.
- `src/state/buildSession.ts`: `addChip` + `sanitize` + dedup logic is the template for a palette-aware add; `chips`/`removeChip`/`toggleChip` already drive selected state.
- `src/components/ui/*`: shadcn-style primitives present — `badge` (palette option chips), `button`, `input` (key field — use a password/masked variant), `alert-dialog`/`sheet` (basis for the settings modal). An accordion primitive (D-04) likely needs adding via the shadcn CLI.
- `src/ui/ControlsPane/*`: left-pane sections (`IntentInput`, `ChipArea`, `ChipInput`, `FlagControls/`) — palette accordions are a new sibling section here; trigger button sits with `IntentInput` (D-06).

### Established Patterns
- Two-pane layout (`ControlsPane` left / `PreviewPane` right); Zustand session store + pure serializer re-deriving preview. Palette state is new session/UI state (Zustand), separate from persisted library data.
- Domain logic lives under `src/domain/<area>/` with colocated `*.test.ts` (see `flags/`, `library/`, `prompt/`). The provider adapter + palette schema should follow this (e.g. `src/domain/ai/` or `src/ai/`) with tests.
- No AI/network code exists yet — Phase 4 introduces the first outbound HTTP. Build it behind one adapter so v2 providers and the Phase 5 desktop (Tauri HTTP / CORS bypass) swap the transport without touching UI/state.

### Integration Points
- **Trigger → call:** intent text → adapter `generateObject` (Zod palette schema) → per-category validated options into palette state (D-07 replace, D-12 partial).
- **Promote:** palette option click → palette-aware `addChip` (`source:'palette'`, `paletteCategory`) → sanitize → existing selected-chip flow → serializer re-derives preview (BLD-02).
- **Key:** settings modal reads/writes key + provider to local storage; adapter reads key at call time; clear-key wipes it (KEY-01/02/03).
- **Selected-vs-options matching:** on re-suggest, match new option labels against current selected chips to render "already selected" (D-08).

</code_context>

<specifics>
## Specific Ideas

- OpenRouter specifically because it sidesteps the browser-CORS gotcha on the web build AND gives non-technical users one key for many models (D-01) — the lowest-friction path to the product's headline feature working in a browser.
- The hard line on AI-03: a re-suggest or a failure may swap the *available options*, but must NEVER remove a chip the user already clicked or wipe their intent/flags (D-08, D-09, D-12).
- Key UX must visibly reassure: masked input, obvious clear button, and a plain statement that there is no server and the key only goes to the user's chosen provider (D-02) — this privacy posture is a selling point, state it in the UI.

</specifics>

<deferred>
## Deferred Ideas

- **Additional provider adapters** (Anthropic, OpenAI, Gemini, OpenAI-compatible/local) — PROV-01, already v2. The KEY-04 single adapter is built to accept them later; not implemented now.
- **Per-category "suggest more / regenerate"** scoped to one palette — AI-05, already v2. This phase ships only the all-palettes explicit trigger.
- **Model picker / per-call model override** — raised and deferred (D-03); revisit as a v2 power feature.
- **Persisting the last suggestion** across reload or into saved library entries — noted as Claude's-discretion default-to-session-only; promote to a real feature only if research shows it's cheap and wanted.
- **OS-keychain / encrypted-at-rest key storage** — desktop hardening, belongs to Phase 5 (Tauri); web v1 uses local web storage with XSS controlled.

</deferred>

---

*Phase: 4-AI-Populated Palettes + BYO Key*
*Context gathered: 2026-06-28*
