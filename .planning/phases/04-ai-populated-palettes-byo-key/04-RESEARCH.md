# Phase 4: AI-Populated Palettes + BYO Key — Research

**Researched:** 2026-06-29
**Domain:** Vercel AI SDK v7 + OpenRouter provider, client-side structured LLM output, per-category schema validation, BYO-key local storage
**Confidence:** HIGH (core stack verified from installed packages + type declarations; OpenRouter CORS behavior MEDIUM)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** OpenRouter is the only provider shipped in v1. Adapter must be structured so additional providers slot in later (KEY-04). PROV-01 (more adapters) is v2.
- **D-02:** Key + provider entry lives in a settings modal/dialog (gear icon). Modal holds: provider display, masked key input, clear-key control, and a plain-language privacy statement. Key entry/masking/clear must be obvious per CLAUDE.md.
- **D-03:** No model picker in v1 — app uses a sensible default model for OpenRouter.
- **D-04:** Six categories render as collapsible accordion sections in the left controls pane.
- **D-05:** Palette options are a SEPARATE area from the selected-chips ChipArea. Clicking an option promotes it into the existing chip flow as `source: 'palette'`. Promotion routes through the existing `addChip` path / sanitize chokepoint.
- **D-06:** AI suggestion trigger is a button next to the intent input ("Suggest options"). Single explicit action (not per-keystroke).
- **D-07:** A new suggestion REPLACES all palette options.
- **D-08:** Already-selected chips are PRESERVED across a re-suggest. Re-offered as "already selected" if new response returns same-label option. A palette refresh only swaps the available-options list, never the user's committed selections.
- **D-09:** During a suggestion call, only the palette area is disabled/skeletoned; rest of builder stays usable. Trigger is debounced/guarded. No blocking overlay.
- **D-10:** Distinct, actionable messages per failure cause: (a) missing/invalid key → point to settings, (b) network/timeout → offer retry, (c) malformed response/rate-limit → retry/try again.
- **D-11:** Errors surface as a transient toast/dismissible banner (not occupying the palette region). Pair with retry affordance.
- **D-12:** Partial results: validate per category, render what parsed, silently drop malformed categories. Fully-empty/invalid result falls back to error state (D-10/D-11).

### Claude's Discretion

- AI SDK wiring (exact package set, model-factory shape, adapter interface) — client-side only, one swappable adapter, key never sent anywhere but provider.
- Palette output Zod schema shape for per-category validation enabling D-12.
- Options-per-category count (cap for UI/cost).
- Key storage mechanism (web v1) — localStorage vs IndexedDB.
- System/prompt design for the AI call — treat all returned text as untrusted.
- Whether last suggestion persists across reload — default session-only.
- Settings-modal primitive — reuse @base-ui/react dialog or add via shadcn CLI.

### Deferred Ideas (OUT OF SCOPE)

- Additional provider adapters (Anthropic, OpenAI, Gemini, OpenAI-compatible/local) — PROV-01, v2.
- Per-category "suggest more / regenerate" — AI-05, v2.
- Model picker / per-call model override — v2.
- Persisting last suggestion across reload — session-only default unless cheap win found.
- OS-keychain / encrypted-at-rest key storage — Phase 5 (Tauri desktop).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | User can trigger an AI call that populates palettes with options relevant to the entered intent | `generateObject` from `ai` v7.0.5 + `createOpenRouter` from `@openrouter/ai-sdk-provider` v2.10.0; trigger button state covered by D-06/D-09 |
| AI-02 | AI returns categorized options for the core palettes (Style/Medium, Lighting, Camera & Lens, Composition, Color, Mood) | `PaletteResponseSchema` with 6 named fields; system prompt instructs model to populate each category |
| AI-03 | AI output is validated against a schema; malformed output degrades gracefully without wiping in-progress work | `z.array(PaletteOptionSchema).catch([])` per field; D-08 chip preservation via label-matching in state |
| AI-04 | AI calls are triggered explicitly (not per-keystroke) | Single button trigger with `isLoading` guard (D-09) |
| KEY-01 | User can enter and save an LLM API key, stored locally only | `localStorage.setItem('mj-ph-api-key', key)` — synchronous, no backend |
| KEY-02 | User can clear/remove the stored key | `localStorage.removeItem('mj-ph-api-key')` via clear-key control in settings modal |
| KEY-03 | The key is never sent to any first-party server (all LLM calls originate client-side) | `createOpenRouter({apiKey})` → `generateObject` → direct HTTPS fetch to `openrouter.ai` from the user's browser. No proxy. |
| KEY-04 | LLM integration goes through one provider adapter, designed so additional providers can be added later | `PaletteAdapter` interface; v1 ships `OpenRouterAdapter` only; new providers implement the same interface |
| BLD-02 | User can click palette chips to add them to the prompt | Palette option click → `addPaletteChip(label, category)` → sanitize → chip with `source:'palette'` + `paletteCategory` |
</phase_requirements>

---

## Summary

Phase 4 ships the headline feature: an AI suggestion flow that fills six categorized palettes from a plain-language intent, with the user clicking options to promote them into the existing chip/serializer pipeline. All LLM access runs client-side through OpenRouter's browser-friendly API using Vercel AI SDK v7's `generateObject`.

The critical technical concern is per-category graceful degradation (D-12/AI-03). The solution is Zod 4's `.catch([])` method on each category field: if the model returns malformed data for a category, that field silently falls back to `[]` rather than failing the entire parse. A fully-empty result after fallbacks triggers the error state. This eliminates the need for six separate API calls (one per category) and achieves D-12 without bespoke error-recovery logic.

The adapter pattern (KEY-04) is the primary extensibility seam: `PaletteAdapter` is a minimal interface (`generatePalettes(intent, key): Promise<PaletteCallResult>`). The v1 OpenRouter implementation is a single file under `src/domain/ai/`. Phase 5 Tauri transport and v2 providers slot into this interface without touching UI or state.

**Primary recommendation:** Use `generateObject` with a single `PaletteResponseSchema` (6 fields, each `z.array(PaletteOptionSchema).catch([])`), default model `google/gemini-2.0-flash` via OpenRouter, key in `localStorage`, and `@base-ui/react` Accordion + Dialog primitives already present in the installed library.

---

## Project Constraints (from CLAUDE.md)

| Directive | Category | Enforcement |
|-----------|----------|-------------|
| No `dangerouslySetInnerHTML` on AI output; treat all LLM output as untrusted text | Security / XSS | All palette labels route through `sanitize()` before entering chip state (existing chokepoint) |
| Strict Content-Security-Policy (set in `tauri.conf.json` for desktop; set for web too) | Security / CSP | CSP header must be set or meta tag added in Phase 4 (web) |
| Key never transmitted to any first-party server | Security / Key | `generateObject` called directly from browser to `openrouter.ai` HTTPS endpoint |
| Aggressive XSS prevention — no untrusted HTML rendering | Security / XSS | Palette options rendered as React text nodes only, never `innerHTML` |
| Make key entry, masking, and one-click clear obvious in UI | UX / Security | Settings modal with `<input type="password">` and explicit clear button |
| No telemetry — never log key or full prompts | Security / Privacy | No analytics calls; no `console.log` of key or prompt content |
| API key present in running client — any XSS can read it; `localStorage`/IndexedDB readable by any script | Security / Risk | XSS posture is the mitigating control; stated in UI copy per D-02 |
| CORS: some providers block browser-origin calls; OpenRouter/OpenAI-compatible gateways generally allow it | Architecture | D-01 chose OpenRouter specifically to avoid this; verify during implementation |
| `dangerouslyAllowBrowser` mindset forbidden | Architecture | Use AI SDK's unified client-side path only — no raw vendor SDKs |
| Vercel AI SDK (`ai` 7.x) + `@openrouter/ai-sdk-provider` locked | Tech stack | Already installed (see Package Legitimacy Audit) |
| `generateObject` with Zod schema | Tech stack | See Standard Stack and Code Examples |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| LLM API call (generateObject) | Browser / Client | — | Client-side only; no proxy; KEY-03 |
| API key storage and retrieval | Browser / Client | — | `localStorage` on same origin; no backend |
| Palette state (available options) | Browser / Client (Zustand) | — | Session UI state; not persisted |
| Palette schema validation | Browser / Client (Zod) | — | Runs in-process after generateObject returns |
| Chip promotion (palette → builder) | Browser / Client (Zustand) | — | Routes through existing addChip/sanitize |
| Settings modal | Browser / Client (React + @base-ui) | — | UI only; reads/writes localStorage |
| Error classification | Browser / Client (adapter) | — | Adapter maps provider errors to 3 D-10 types |
| Sanitization of AI-returned labels | Browser / Client (sanitize.ts) | — | Existing single chokepoint; unchanged |

---

## Standard Stack

### Core (new packages for this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | 7.0.5 | Vercel AI SDK core — `generateObject`, error classes | Locked in CLAUDE.md; unified LLM client for all providers |
| `@openrouter/ai-sdk-provider` | 2.10.0 | OpenRouter model factory for AI SDK | Locked in CLAUDE.md; browser CORS-friendly; one key → 400+ models |
| `zod` | 4.4.3 | Schema + runtime validation with `.catch()` fallback | Already installed; AI SDK v7 peer deps accept `^4.1.8` |

### Already Installed (used in this phase)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `zustand` | 5.0.14 | Palette state (available options, loading, error) | Extend existing `useBuildSession` or create `usePaletteSession` |
| `@base-ui/react` | 1.6.0 | Accordion (D-04) + Dialog (D-02 settings modal) | `./accordion` and `./dialog` both exported; no new packages needed |
| `lucide-react` | 1.21.0 | Icons: gear (settings trigger), spinner (loading), X (dismiss) | Already installed |

### Not Needed (deferred or wrong tier)

| Skipped | Reason |
|---------|--------|
| `@ai-sdk/anthropic`, `@ai-sdk/openai`, etc. | v2 providers; out of scope (PROV-01) |
| `ollama-ai-provider-v2` | Local models; v2 |
| Tauri keychain plugin | Phase 5 desktop build only |
| `useObject` (AI SDK UI hook) | Server-streaming hook; this app calls generateObject directly from browser event handler |

**Installation (as of research):** `ai` and `@openrouter/ai-sdk-provider` were installed as a side effect of the slopcheck legitimacy audit. `@ai-sdk/openai` was also installed by slopcheck (see note in Package Legitimacy Audit). Verify `package.json` contains these before running the install command:

```bash
npm install ai @openrouter/ai-sdk-provider
```

---

## Package Legitimacy Audit

> slopcheck was available (v0.6.1) and ran successfully. All three packages passed.

**Note:** slopcheck's audit step ran `npm install` internally, which modified `package.json` to include `ai`, `@openrouter/ai-sdk-provider`, and `@ai-sdk/openai` before this RESEARCH.md was written. The planner should treat these packages as already installed and skip a redundant install task — but should verify the `package.json` entries are present.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `ai` | npm | ~12 yrs (2014) | Very high | github.com/vercel/ai | [OK] | Approved |
| `@openrouter/ai-sdk-provider` | npm | ~2 yrs (Jul 2024) | High | github.com/OpenRouterTeam/ai-sdk-provider | [OK] | Approved |
| `@ai-sdk/openai` | npm | Established | Very high | github.com/vercel/ai | [OK] | Approved (installed by slopcheck; not required for Phase 4 which is OpenRouter-only, but harmless) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User Intent Text
      │
      ▼
[Suggest Button] ── guarded: isLoading || !hasKey
      │ click
      ▼
[PaletteAdapter.generatePalettes(intent, key)]
      │
      ├─→ createOpenRouter({apiKey: key})
      │         │
      │         ▼
      │   generateObject({
      │     model: openrouter.chat('google/gemini-2.0-flash'),
      │     schema: PaletteResponseSchema,   ← Zod .catch([]) per category
      │     system: PALETTE_SYSTEM_PROMPT,
      │     prompt: intent
      │   })
      │         │
      │   ┌─────┴──────┐
      │   │ ok         │ error
      │   ▼            ▼
      │  object    mapError() → PaletteError {type:'auth'|'network'|'malformed'}
      │   │              │
      │   │         [Toast / Banner]  (D-11)
      │   ▼
      │  Check: all arrays empty?
      │   ├── yes → PaletteError{type:'malformed'}
      │   └── no  → PaletteCallResult{ok:true, palettes}
      │
      ▼
[usePaletteSession.setPalettes(palettes)]   ← REPLACE (D-07)
      │
      ▼
[PaletteAccordion]  (6 collapsible sections, D-04)
      │
      ├── each option: { label, description }
      │       │ already selected? ← match against chips[].label (D-08)
      │       │
      │       ▼ click
      │   addPaletteChip(label, category)
      │       │
      │       ▼
      │   sanitize(label)        ← existing chokepoint (D-05)
      │       │
      │       ▼
      │   useBuildSession.chips  ← Chip{source:'palette', paletteCategory}
      │       │
      │       ▼
      │   serialize()  →  PreviewPane  (unchanged)
      │
      └── selected chips PRESERVED on re-suggest (D-08)
```

### Recommended Project Structure

```
src/
├── domain/
│   └── ai/
│       ├── adapter.ts          # PaletteAdapter interface + PaletteCallResult type
│       ├── adapter.test.ts     # mapError() unit tests (mock fetch)
│       ├── openrouter.ts       # OpenRouterAdapter implementation
│       ├── openrouter.test.ts  # generateObject mock tests
│       ├── schema.ts           # PaletteOptionSchema, PaletteResponseSchema
│       └── schema.test.ts      # .catch([]) fallback verification
├── state/
│   ├── buildSession.ts         # EXTEND: add addPaletteChip() method
│   └── paletteSession.ts       # NEW: palette options, loading, error state
├── ui/
│   └── ControlsPane/
│       ├── PaletteAccordion/
│       │   ├── PaletteAccordion.tsx   # 6-section collapsible (D-04)
│       │   └── PaletteOption.tsx      # individual clickable chip (D-05)
│       ├── IntentInput.tsx     # EXTEND: add SuggestButton + loading state
│       └── SettingsModal/
│           ├── SettingsModal.tsx      # @base-ui Dialog (D-02)
│           └── KeyInput.tsx           # masked input + clear button
├── hooks/
│   └── useKeyStorage.ts        # localStorage read/write/clear for API key
└── components/ui/
    └── accordion.tsx           # NEW: @base-ui/react Accordion wrapper (D-04)
```

### Pattern 1: generateObject Client-Side (No Proxy)

`generateObject` from the AI SDK uses the browser's native `fetch` under the hood. It calls the OpenRouter HTTPS endpoint directly from the user's browser. No server route or API proxy is involved.

```typescript
// Source: AI SDK v7 type declarations (verified in node_modules/ai/dist/index.d.ts)
// + OpenRouter provider README (github.com/OpenRouterTeam/ai-sdk-provider)
import { generateObject } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { PaletteResponseSchema } from './schema'

const openrouter = createOpenRouter({ apiKey: key })

const { object } = await generateObject({
  model: openrouter.chat('google/gemini-2.0-flash'),
  schema: PaletteResponseSchema,
  system: PALETTE_SYSTEM_PROMPT,
  prompt: intent,
})
// object is typed as z.infer<typeof PaletteResponseSchema>
```

### Pattern 2: Per-Category Graceful Degradation with `.catch([])`

[VERIFIED: node_modules/ai/dist/index.d.ts + node_modules/zod/package.json]

The key insight: Zod 4's `.catch(defaultValue)` attaches a fallback that fires when that field's parse fails, instead of propagating the error up to the parent object parse. This gives per-category graceful degradation in a single `generateObject` call.

```typescript
// Source: Zod v4 docs (.catch() API) — verified against zod 4.4.3 installed
import { z } from 'zod'

export const PaletteOptionSchema = z.object({
  label: z.string().min(1).max(60),
  description: z.string().max(120).optional(),
})

const EMPTY_OPTS: z.infer<typeof PaletteOptionSchema>[] = []

export const PaletteResponseSchema = z.object({
  styleMedium: z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  lighting:    z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  cameraLens:  z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  composition: z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  color:       z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  mood:        z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
})

export type PaletteMap = z.infer<typeof PaletteResponseSchema>
export type PaletteOption = z.infer<typeof PaletteOptionSchema>
```

After `generateObject` returns, count total options. If all 6 categories are empty, the adapter maps this to `PaletteError{type:'malformed'}`. Otherwise the valid categories render and malformed ones are silently absent.

**Why not 6 separate API calls?** Cost (6x tokens, 6x latency) with no benefit — the model can populate all 6 categories in one response. One call with per-field `.catch([])` is correct.

**Why not `safeParse` the raw JSON manually?** `generateObject` handles JSON extraction from the model response (including repair attempts). Reaching into raw text bypasses that and loses the schema inference. `.catch([])` is the right extension point.

### Pattern 3: Adapter Interface (KEY-04 Extensibility Seam)

```typescript
// Source: project convention (src/domain/ area pattern, see library/schema.ts)
// adapter.ts — the swap point for Phase 5 Tauri-HTTP and v2 providers

export interface PaletteAdapter {
  readonly providerId: string
  generatePalettes(intent: string, key: string): Promise<PaletteCallResult>
}

export type PaletteCallResult =
  | { ok: true; palettes: PaletteMap }
  | { ok: false; error: PaletteError }

export type PaletteError =
  | { type: 'auth';     message: string }  // 401/403 → point to settings
  | { type: 'network';  message: string }  // fetch failure → offer retry
  | { type: 'malformed'; message: string } // 429 / bad parse → try again
```

The Phase 5 Tauri transport swap replaces only the `generatePalettes` body (using Tauri's HTTP plugin instead of browser fetch). The UI and state never need to change.

### Pattern 4: Error Classification (D-10)

```typescript
// Source: AI SDK v7 type declarations — APICallError.statusCode verified
import { APICallError, NoObjectGeneratedError } from 'ai'

function mapError(err: unknown): PaletteCallResult {
  if (APICallError.isInstance(err)) {
    const status = err.statusCode
    if (status === 401 || status === 403) {
      return { ok: false, error: { type: 'auth', message: 'Invalid or missing API key. Check your settings.' } }
    }
    if (status === 429) {
      return { ok: false, error: { type: 'malformed', message: 'Rate limit reached. Try again in a moment.' } }
    }
    // Network-level failure (no status, or other 5xx)
    return { ok: false, error: { type: 'network', message: 'Could not reach OpenRouter. Check your connection.' } }
  }
  if (NoObjectGeneratedError.isInstance(err)) {
    return { ok: false, error: { type: 'malformed', message: 'Model returned an unreadable response. Try again.' } }
  }
  return { ok: false, error: { type: 'network', message: 'Unexpected error. Try again.' } }
}
```

**Confirmed error class properties** (verified against installed package runtime):
- `APICallError`: `.statusCode`, `.responseBody`, `.url`, `.isRetryable`, `.name`, `.cause`
- `NoObjectGeneratedError`: `.text`, `.response`, `.usage`, `.finishReason`, `.cause`
- Both have static `.isInstance(err)` type-guard method [VERIFIED: node_modules/ai/dist/index.js]

### Pattern 5: addPaletteChip Extension

The existing `addChip(label: string)` hardcodes `source: 'custom'`. Phase 4 needs a palette-aware variant that passes `source: 'palette'` and `paletteCategory`. The cleanest approach is an overloaded second method (not changing the existing one, to avoid breaking existing tests):

```typescript
// EXTEND buildSession.ts — add alongside existing addChip
addPaletteChip: (label: string, category: string) => {
  const trimmed = label.trim()
  if (!trimmed) return
  const sanitized = sanitize(trimmed)      // same sanitize chokepoint (D-05)
  if (!sanitized) return
  const { chips } = get()
  if (chips.some((c) => c.label === sanitized)) return  // same dedup gate
  set({
    chips: [
      ...chips,
      {
        id: crypto.randomUUID(),
        label: sanitized,
        source: 'palette' as const,
        paletteCategory: category,
        enabled: true,
      },
    ],
  })
},
```

### Pattern 6: D-08 Selected-State Matching on Re-suggest

When new palette options arrive (D-07 replace), the UI must mark options that are already selected chips as "already selected" rather than appearing as new unclicked options.

```typescript
// In PaletteOption component (or derived in usePaletteSession selector)
const selectedLabels = new Set(
  chips.filter(c => c.source === 'palette').map(c => c.label)
)
const isAlreadySelected = selectedLabels.has(sanitize(option.label))
```

This is a pure read from Zustand chips state — no additional state needed.

### Anti-Patterns to Avoid

- **Rendering AI labels with innerHTML / dangerouslySetInnerHTML:** AI content must render as React text nodes only. Even after sanitize(), never pass to `dangerouslySetInnerHTML`. [CLAUDE.md hard requirement]
- **Logging the API key or intent:** No `console.log(key)` or analytics calls including prompt content. [CLAUDE.md hard requirement]
- **Calling `generateObject` per-keystroke:** Only on explicit button click. Guard with `isLoading` flag to prevent concurrent calls. [AI-04, D-04, D-09]
- **Using `process.env.OPENROUTER_API_KEY` or Vite env vars for the key:** The key is user-supplied at runtime, not build-time. Read from `localStorage` at call time.
- **Importing `@ai-sdk/openai` and calling OpenAI directly in the browser:** OpenAI's direct endpoint may block browser CORS. OpenRouter is the D-01 choice specifically because it doesn't.
- **One Zod schema per category with 6 separate `generateObject` calls:** Correct for isolation, wrong for cost and latency. One call with `.catch([])` is the right design.
- **Using the `useObject` AI SDK UI hook:** That hook assumes a server-side streaming route (Next.js API route pattern). This is a client-only Vite SPA. Use `generateObject` directly in an async event handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON extraction from LLM response | Custom regex/JSON.parse on raw text | `generateObject` schema param | Model output is not always valid JSON; the SDK handles repair, retries, and schema enforcement |
| Provider-specific HTTP headers | Per-provider fetch wrappers | `createOpenRouter({apiKey})` model factory | OpenRouter adds `Authorization`, `HTTP-Referer`, content-type automatically |
| Response JSON healing | Custom repair logic for malformed JSON | OpenRouter `response-healing` plugin: `openrouter('model', {plugins:[{id:'response-healing'}]})` | 80%+ defect reduction per OpenRouter announcement; free for non-streaming calls |
| Type-safe schema validation | `JSON.parse` + manual type narrowing | Zod `PaletteResponseSchema.parse(object)` | Inferred TypeScript types flow into the UI with no manual casting |
| Per-field error fallback | Try/catch per field with manual defaults | Zod `.catch([])` on each array field | Single declaration; fallback is part of the schema, not scattered in catch blocks |
| Error type discrimination | `err.message.includes('401')` string matching | `APICallError.isInstance(err)` + `.statusCode` | Type-safe; stable across SDK versions; works with TypeScript narrowing |
| Accessible accordion | Custom disclosure component | `@base-ui/react` Accordion (`./accordion` export confirmed in v1.6.0) | Already installed; handles keyboard nav, ARIA, animation |
| Settings dialog | Custom modal | `@base-ui/react` Dialog (`./dialog` export confirmed in v1.6.0) | Already installed; follows established Phase 1 dialog pattern |

**Key insight:** The AI SDK's value is precisely in eliminating the fetch/JSON/retry/schema layers that would otherwise need hand-rolling per vendor. The `.catch([])` Zod pattern eliminates the need for a custom multi-try degradation loop.

---

## Common Pitfalls

### Pitfall 1: `generateObject` Is Not Deprecated — But Events Around It Are
**What goes wrong:** Reading `@deprecated` JSDoc on telemetry event types (`GenerateObjectStartEvent`, etc.) and concluding `generateObject` itself is deprecated. It is not.
**Why it happens:** AI SDK v7 renamed some internal telemetry event types; the JSDoc marks the old names deprecated, not the function.
**How to avoid:** `generateObject` is exported from `ai` v7.0.5 and its type declaration at line 7203 of `index.d.ts` has no `@deprecated` tag. Use it directly.
**Warning signs:** TypeScript error on import, or a codemod suggesting migration to `generateText` + `Output.object()`. Neither applies here; both APIs coexist.

### Pitfall 2: Zod 4 `.catch()` vs `.default()` — Different Behavior
**What goes wrong:** Using `.default([])` instead of `.catch([])` for graceful degradation.
**Why it happens:** `.default([])` only fires when the field is `undefined` (missing). If the model returns a non-array value (e.g., `null` or an object), `.default([])` does NOT catch it — the parse throws. `.catch([])` fires for any parse failure including type mismatches.
**How to avoid:** Always use `.catch(EMPTY_OPTS)` on array fields where AI output may be malformed.
**Warning signs:** Tests pass with `undefined` fields but fail with `null` or wrong-type fields.

### Pitfall 3: OpenRouter CORS — Confirmed Browser-Friendly But Not Officially Documented
**What goes wrong:** Assuming OpenRouter blocks browser-origin requests like direct OpenAI endpoints sometimes do.
**Why it happens:** The OpenRouter documentation does not explicitly state CORS headers are set. The CONTEXT.md (D-01) and CLAUDE.md both assert OpenRouter is browser-CORS-friendly based on community evidence — this is [ASSUMED] at HIGH confidence but not [VERIFIED] from an official CORS statement.
**How to avoid:** Test with a real key during Wave 0 or Phase 4 initial setup. If CORS fails, the fallback is the `openrouter.ai/api/v1` endpoint with a custom `fetch` that adds `mode: 'cors'` explicitly.
**Warning signs:** `TypeError: Failed to fetch` or `CORS policy` errors in browser console on the first real API call.

### Pitfall 4: `localStorage` Key Read Race During Initialization
**What goes wrong:** Reading the API key from `localStorage` during module initialization (at import time) instead of at call time, causing the key to be empty on first mount.
**Why it happens:** Module-level code runs before the user has a chance to enter a key. Some patterns initialize state from localStorage at store creation.
**How to avoid:** Read the key inside `generatePalettes()` at call time: `const key = localStorage.getItem('mj-ph-api-key') ?? ''`. The settings modal writes it; the adapter reads it fresh on each call.
**Warning signs:** Key appears blank even after user entered it; requires page reload to work.

### Pitfall 5: All `.catch([])` Fields Fire Simultaneously → Silent Total Failure
**What goes wrong:** The model returns completely wrong JSON (e.g., a string or a top-level array). All 6 `.catch([])` fallbacks fire. `generateObject` returns `{ styleMedium:[], lighting:[], ... }`. No error is thrown — the call "succeeded" with zero options.
**Why it happens:** `.catch([])` silently swallows the error. The adapter has no way to know from the `object` alone that the model failed completely.
**How to avoid:** After `generateObject` resolves, count total options: `Object.values(object).flat().length`. If `=== 0`, return `PaletteError{type:'malformed'}` instead of `{ok:true}`.
**Warning signs:** Suggestion button appears to succeed (spinner stops) but all palette sections show empty.

### Pitfall 6: D-08 Same-Label Matching Misses Sanitized Labels
**What goes wrong:** The "already selected" match compares raw palette option label against the stored chip label, but the chip label was sanitized when added.
**Why it happens:** `addPaletteChip` sanitizes the label before storing it. A new palette might return `"85mm f/1.8"` but the stored chip is `"85mm f/1.8"` (unchanged in this case) — however if the model returns `"85mm--portrait"`, the chip stored is `"85mm-portrait"` and the match fails.
**How to avoid:** In the "already selected" check, apply `sanitize()` to the incoming palette option label before comparing: `selectedLabels.has(sanitize(option.label))`.

---

## Code Examples

### Complete Adapter Implementation Sketch

```typescript
// Source: AI SDK v7 type declarations + OpenRouter provider README
// src/domain/ai/openrouter.ts
import { generateObject, APICallError, NoObjectGeneratedError } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { PaletteAdapter, PaletteCallResult } from './adapter'
import { PaletteResponseSchema } from './schema'

const DEFAULT_MODEL = 'google/gemini-2.0-flash'

const PALETTE_SYSTEM_PROMPT = `You are an expert Midjourney prompt assistant.
Given a user's creative intent, return 6-8 specific, Midjourney-compatible options for each of the six palette categories below.
Options must be concrete terms a Midjourney user would recognize (not generic adjectives).
Each option has a short label (max 30 chars) and a brief description of how it helps (max 80 chars).

Categories:
- styleMedium: artistic styles and media types (e.g. "oil painting", "cinematic", "ukiyo-e")
- lighting: lighting conditions and quality (e.g. "golden hour", "volumetric fog", "neon glow")
- cameraLens: camera and lens specs (e.g. "85mm portrait", "macro close-up", "wide angle")
- composition: compositional techniques (e.g. "rule of thirds", "bird's-eye view", "silhouette")
- color: color palettes and grading (e.g. "muted earth tones", "vibrant", "monochromatic blue")
- mood: emotional atmosphere (e.g. "ethereal", "dramatic tension", "serene and peaceful")`

function mapError(err: unknown): PaletteCallResult {
  if (APICallError.isInstance(err)) {
    const s = err.statusCode
    if (s === 401 || s === 403)
      return { ok: false, error: { type: 'auth', message: 'Invalid or missing API key. Open settings to update it.' } }
    if (s === 429)
      return { ok: false, error: { type: 'malformed', message: 'Rate limit reached. Wait a moment and try again.' } }
    return { ok: false, error: { type: 'network', message: 'Could not reach OpenRouter. Check your connection.' } }
  }
  if (NoObjectGeneratedError.isInstance(err))
    return { ok: false, error: { type: 'malformed', message: 'Model returned an unreadable response. Try again.' } }
  return { ok: false, error: { type: 'network', message: 'Unexpected error. Try again.' } }
}

export const openRouterAdapter: PaletteAdapter = {
  providerId: 'openrouter',

  async generatePalettes(intent, key) {
    if (!key) return { ok: false, error: { type: 'auth', message: 'No API key set. Open settings to add one.' } }
    const openrouter = createOpenRouter({ apiKey: key })
    try {
      const { object } = await generateObject({
        model: openrouter.chat(DEFAULT_MODEL),
        schema: PaletteResponseSchema,
        system: PALETTE_SYSTEM_PROMPT,
        prompt: intent,
      })
      const total = Object.values(object).reduce((n, arr) => n + arr.length, 0)
      if (total === 0) return { ok: false, error: { type: 'malformed', message: 'No suggestions returned. Try a different intent.' } }
      return { ok: true, palettes: object }
    } catch (err) {
      return mapError(err)
    }
  },
}
```

### localStorage Key Storage

```typescript
// Source: project convention; CLAUDE.md §"Persistence Strategy"
// src/hooks/useKeyStorage.ts
const KEY = 'mj-ph-api-key'

export function useKeyStorage() {
  const [key, setKeyState] = React.useState(() => localStorage.getItem(KEY) ?? '')

  const saveKey = (value: string) => {
    localStorage.setItem(KEY, value)
    setKeyState(value)
  }

  const clearKey = () => {
    localStorage.removeItem(KEY)
    setKeyState('')
  }

  return { key, saveKey, clearKey }
}
```

### Accordion Component Wrapper

```typescript
// @base-ui/react Accordion is available at ./accordion (confirmed v1.6.0)
// Follow same wrapping pattern as existing shadcn-style components (see alert-dialog.tsx)
// Use @base-ui/react Accordion.Root, Accordion.Item, Accordion.Header, Accordion.Trigger,
// Accordion.Panel — exact import path: '@base-ui/react/accordion'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject` as standalone structured-output API | `generateText` + `Output.object()` also available in v7 | AI SDK v7 (2026) | Both work; `generateObject` remains the cleaner API for pure structured calls; `generateText` + Output is preferred when mixing text and structure |
| Per-vendor SDK (openai, @anthropic-ai/sdk) with `dangerouslyAllowBrowser` | AI SDK unified client with provider factories | AI SDK v3+ | Unified interface; one call signature regardless of vendor |
| Zod 3 only in AI SDK | Zod 3 or Zod 4 (`^3.25.76 || ^4.1.8`) | AI SDK v7 peer deps | Project's Zod 4.4.3 is fully supported |

**Deprecated/outdated patterns:**
- `streamObject` for structured palette generation: Streaming partial objects adds UI complexity (partial renders) with no benefit for a button-triggered palette fill. Use non-streaming `generateObject`.
- `experimental_telemetry` option on `generateObject`: Renamed to `telemetry` in v7; old name still works via alias but emits a deprecation warning.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OpenRouter allows browser-origin CORS requests without server-side configuration | Standard Stack, Pitfall 3 | Phase 4 web build would fail at runtime; mitigation: test with a real key in Wave 0; fallback is a simple custom fetch wrapper |
| A2 | `google/gemini-2.0-flash` is a valid OpenRouter model string that supports structured outputs | Code Examples | generateObject would throw `NoSuchModelError` or a 404; fallback: `openai/gpt-4o-mini` is an equally valid structured-output model |
| A3 | `@base-ui/react` Accordion API is stable at v1.6.0 (imports, prop names, render pattern) | Don't Hand-Roll | Component won't render; mitigation: follow the same wrapping pattern as existing `alert-dialog.tsx` and check the @base-ui docs |

---

## Open Questions

1. **OpenRouter CORS — official confirmation**
   - What we know: CONTEXT.md and CLAUDE.md both assert OpenRouter is browser-CORS-friendly; community examples call it client-side; OpenRouter docs don't explicitly confirm.
   - What's unclear: Whether OpenRouter requires `HTTP-Referer` or `X-Title` headers for browser calls to not be blocked.
   - Recommendation: Add `HTTP-Referer: 'https://mj-prompt-helper'` and `X-Title: 'Midjourney Prompt Helper'` as optional headers in the createOpenRouter config for good citizenship; test a real API call in Wave 0 before building the full UI.

2. **`@base-ui/react` Accordion API surface**
   - What we know: The package exports `./accordion` at v1.6.0; the project already uses `alert-dialog` from the same library following a specific pattern (render prop, not asChild — see Phase 01-04 lesson).
   - What's unclear: Exact prop names and composition pattern for Accordion without reading the source.
   - Recommendation: Wave 0 task should read `node_modules/@base-ui/react/dist/accordion.js` type declarations or the @base-ui docs before writing the wrapper component.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Package install | ✓ | Confirmed (npm view ran) | — |
| `ai` package | AI SDK core | ✓ | 7.0.5 (installed by slopcheck) | — |
| `@openrouter/ai-sdk-provider` | OpenRouter calls | ✓ | 2.10.0 (installed by slopcheck) | — |
| `@base-ui/react` Accordion | D-04 palette UI | ✓ | 1.6.0 (`./accordion` export confirmed) | shadcn Accordion via CLI (adds Radix dep) |
| `@base-ui/react` Dialog | D-02 settings modal | ✓ | 1.6.0 (`./dialog` export confirmed) | shadcn Dialog via CLI |
| OpenRouter API key | Real API calls | User-supplied | — | Use a free-tier key for dev; or mock in tests |
| Internet access to openrouter.ai | Runtime calls | ✓ (assumed) | — | Tests use mocked fetch |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none — all required packages confirmed present

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/domain/ai/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | `generatePalettes(intent, key)` is called and returns palette data | unit (mock fetch) | `npx vitest run src/domain/ai/openrouter.test.ts` | ❌ Wave 0 |
| AI-02 | All 6 category fields present in returned palette map | unit | `npx vitest run src/domain/ai/schema.test.ts` | ❌ Wave 0 |
| AI-03 | Malformed category field falls back to `[]`, not throwing | unit | `npx vitest run src/domain/ai/schema.test.ts` | ❌ Wave 0 |
| AI-03 | All-empty result → `ok:false` error result | unit | `npx vitest run src/domain/ai/openrouter.test.ts` | ❌ Wave 0 |
| AI-03 | Re-suggest preserves selected chips (D-08) | unit | `npx vitest run src/state/paletteSession.test.ts` | ❌ Wave 0 |
| AI-04 | `isLoading=true` during call, guard prevents second concurrent call | unit | `npx vitest run src/state/paletteSession.test.ts` | ❌ Wave 0 |
| KEY-01 | `saveKey(value)` writes to localStorage `mj-ph-api-key` | unit | `npx vitest run src/hooks/useKeyStorage.test.ts` | ❌ Wave 0 |
| KEY-02 | `clearKey()` removes `mj-ph-api-key` from localStorage | unit | `npx vitest run src/hooks/useKeyStorage.test.ts` | ❌ Wave 0 |
| KEY-03 | No network call to any non-OpenRouter host | manual / network audit | Inspect browser DevTools network tab; no calls to `localhost` or first-party server | — |
| KEY-04 | `openRouterAdapter` satisfies `PaletteAdapter` interface | type check | `npx tsc --noEmit` | ❌ Wave 0 |
| BLD-02 | `addPaletteChip` adds chip with `source:'palette'` and `paletteCategory` | unit | `npx vitest run src/state/buildSession.test.ts` | ✅ (extend) |
| D-10 | 401 → `{type:'auth'}`, 429 → `{type:'malformed'}`, fetch failure → `{type:'network'}` | unit | `npx vitest run src/domain/ai/adapter.test.ts` | ❌ Wave 0 |
| D-12 | `null` category field → `[]` (not throw) | unit | `npx vitest run src/domain/ai/schema.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/domain/ai/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/domain/ai/adapter.ts` — PaletteAdapter interface + error types
- [ ] `src/domain/ai/adapter.test.ts` — mapError() tests with mocked APICallError/NoObjectGeneratedError
- [ ] `src/domain/ai/schema.ts` — PaletteOptionSchema + PaletteResponseSchema with .catch([])
- [ ] `src/domain/ai/schema.test.ts` — .catch([]) fallback tests (null field, wrong type, all empty)
- [ ] `src/domain/ai/openrouter.ts` — OpenRouterAdapter implementation
- [ ] `src/domain/ai/openrouter.test.ts` — mock generateObject calls
- [ ] `src/state/paletteSession.ts` — palette options state + isLoading + error
- [ ] `src/state/paletteSession.test.ts` — re-suggest replace behavior + chip preservation
- [ ] `src/hooks/useKeyStorage.ts` — localStorage read/write/clear
- [ ] `src/hooks/useKeyStorage.test.ts` — happy-dom localStorage tests
- [ ] Extend `src/state/buildSession.ts` with `addPaletteChip()`
- [ ] Extend `src/state/buildSession.test.ts` with palette chip tests

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No server auth; key is user-owned |
| V3 Session Management | No | No server sessions |
| V4 Access Control | No | Single-user local app |
| V5 Input Validation | Yes | Zod schema on LLM output; `sanitize()` on all AI labels before storing |
| V6 Cryptography | No | Key stored in plaintext localStorage (web v1); Phase 5 desktop adds OS keychain |
| V7 Error Handling | Yes | Error messages never expose the raw API key or stack trace in UI |
| V12 Files/Resources | No | No file uploads |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AI-returned label containing `::` or `--` injecting MJ syntax | Tampering | `sanitize()` chokepoint before chip storage; existing function handles this |
| AI-returned label rendered as HTML (XSS via prompt injection) | Tampering / EoP | React text nodes only; no `dangerouslySetInnerHTML` anywhere in palette components |
| API key leaked via `console.log` or error toast | Information Disclosure | No key logging; error messages use fixed strings, not raw error bodies |
| API key readable by any script on the origin (localStorage) | Information Disclosure | Accepted risk for web v1 per CLAUDE.md; mitigated by XSS prevention; stated to user in settings modal |
| CSP missing → XSS → key exfiltration | Elevation of Privilege | Add `<meta http-equiv="Content-Security-Policy">` in index.html: `default-src 'self'; connect-src 'self' https://openrouter.ai; script-src 'self'` |
| Concurrent `generateObject` calls (double-click spam) | DoS (cost) | `isLoading` guard in trigger button; no concurrent calls |

---

## Sources

### Primary (HIGH confidence)
- AI SDK v7 installed package `node_modules/ai/dist/index.d.ts` — `generateObject` signature, error class exports, `Output` API, `NoObjectGeneratedError`/`APICallError` properties and `.isInstance()` verified at runtime
- AI SDK v7 installed package `node_modules/ai/package.json` — peer dependency `zod: ^3.25.76 || ^4.1.8` confirms Zod 4.4.3 compatibility
- `@openrouter/ai-sdk-provider` v2.10.0 README (github.com/OpenRouterTeam/ai-sdk-provider) — `createOpenRouter({apiKey})`, `openrouter.chat('model')`, `generateObject` usage, response-healing plugin
- `@base-ui/react` v1.6.0 `package.json` — `./accordion` and `./dialog` exports confirmed present

### Secondary (MEDIUM confidence)
- ai-sdk.dev/docs/ai-sdk-core/generating-structured-data — `Output.object()` API, `NoObjectGeneratedError`, streaming vs non-streaming
- ai-sdk.dev/docs/reference/ai-sdk-errors — 32 error type names including `APICallError`, `LoadAPIKeyError`, `NoObjectGeneratedError`
- openrouter.ai/docs/guides/features/structured-outputs — structured output model recommendations; response-healing plugin existence
- openrouter.ai announcements (response-healing) — `google/gemini-2.0-flash` named most popular structured-output model on OpenRouter

### Tertiary (LOW confidence / ASSUMED)
- OpenRouter browser-CORS behavior — confirmed by CONTEXT.md D-01 rationale and CLAUDE.md §CORS note; no official CORS policy page found [ASSUMED: HIGH confidence]
- `google/gemini-2.0-flash` exact model string on OpenRouter — cited from openrouter.ai docs examples [ASSUMED: verify at openrouter.ai/models]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — packages installed and verified in node_modules
- Architecture: HIGH — generateObject signature verified from type declarations; adapter pattern follows established project domain conventions
- Pitfalls: HIGH — `.catch()` vs `.default()` and silent total-failure pitfalls derive from verified Zod 4 behavior
- OpenRouter CORS: MEDIUM — asserted by project context but no official CORS statement found in docs

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (AI SDK ships rapid majors; verify if `ai` version changes before planning)
