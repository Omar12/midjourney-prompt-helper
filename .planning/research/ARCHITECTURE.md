# Architecture Research

**Domain:** Local-first, BYO-key web + desktop prompt-builder (Midjourney)
**Researched:** 2026-06-26
**Confidence:** HIGH (architecture patterns, schema design, persistence abstraction); MEDIUM (exact current Midjourney flag surface — it changes per version, which is precisely why this design is data-driven)

## Standard Architecture

This is a **local-first single-page app** with no backend. Every concern that would normally be a server call (LLM inference, persistence) is either delegated to the user's own provider key (LLM) or to a local store (persistence). The cleanest way to structure it is a **layered, unidirectional-data-flow SPA**: a pure domain core (prompt model + flag schema) surrounded by adapter ports (LLM, persistence, clipboard) that have web and desktop implementations behind one interface.

The guiding principle: **the UI and the domain core never import a concrete provider or storage backend.** They depend only on interfaces (`LlmAdapter`, `PersistenceAdapter`, `ClipboardAdapter`). A small composition root wires the right concrete implementation at startup based on the runtime (browser vs Tauri). This is what lets one codebase ship to web and desktop, and what lets a new LLM vendor be added without touching the assembler or palettes.

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION (UI)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Intent   │ │ Palette  │ │ Prompt   │ │ Flag     │ │ Library  │    │
│  │ Input    │ │ Browser  │ │ Assembler│ │ Controls │ │ Panel    │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │
├───────┼────────────┼────────────┼────────────┼────────────┼──────────┤
│       │       APPLICATION STATE (single source of truth)  │          │
│  ┌────┴────────────┴────────────┴────────────┴────────────┴─────┐    │
│  │  buildSession (draft prompt)  │  palettes  │  library index   │    │
│  │  settings (active provider, key ref, model)                   │    │
│  └────┬───────────────┬───────────────┬───────────────┬─────────┘    │
├───────┼───────────────┼───────────────┼───────────────┼──────────────┤
│       │          DOMAIN CORE (pure, no I/O)             │             │
│  ┌────┴─────┐  ┌───────┴───────┐  ┌────┴─────────┐  ┌──┴──────────┐  │
│  │ Prompt   │  │ Flag Schema    │  │ Suggestion   │  │ Serializer  │  │
│  │ Model    │  │ + Validator    │  │ Mapper       │  │ (model→str) │  │
│  └──────────┘  └───────────────┘  └──────────────┘  └─────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                       PORTS (interfaces)                              │
│  ┌────────────────┐  ┌────────────────────┐  ┌──────────────────┐    │
│  │ LlmAdapter     │  │ PersistenceAdapter │  │ ClipboardAdapter │    │
│  └───────┬────────┘  └─────────┬──────────┘  └────────┬─────────┘    │
├──────────┼─────────────────────┼──────────────────────┼─────────────┤
│          │     ADAPTERS (concrete, runtime-selected)   │             │
│  OpenAI / Anthropic /   IndexedDB (web) /        navigator.clipboard  │
│  Google / Ollama /      Tauri FS (desktop)       / Tauri clipboard    │
│  OpenAI-compatible                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Intent Input | Capture plain-language intent + dispatch a "suggest" action | Controlled form component |
| LLM Suggestion Service | Build a structured prompt, call active `LlmAdapter`, parse a categorized-options JSON response into palette data | App-layer service calling a port; uses JSON/structured-output mode |
| Palette State | Hold suggested options per category (cameras, media, styles, enhancers); track which are picked | Slice of the central store |
| Prompt Assembler | Combine selected segments + weights + flags into the live draft model; render preview | Derived/selector + serializer |
| Flag Controls | Render UI widgets from the **flag schema** (sliders, toggles, enums, text); write flag values into draft | Schema-driven dynamic form |
| Flag Schema + Validator | Single source of truth describing every MJ parameter as data; validates/clamps values | JSON/TS config + pure validator |
| Library Store | Persist, list, load, delete named saved prompts | App service over `PersistenceAdapter` |
| Serializer | Deterministically turn the prompt model into the final MJ string (and parse a string back) | Pure function pair |
| Clipboard/Export | Copy final string; export/import library as JSON | `ClipboardAdapter` + file APIs |
| Settings | Active provider, model, encrypted/local key reference | Store slice + secure storage |

## Recommended Project Structure

```
src/
├── domain/                    # Pure, no I/O, no framework — the heart
│   ├── prompt/
│   │   ├── model.ts           # PromptDraft, Segment, Flag value types
│   │   ├── serialize.ts       # model → MJ string
│   │   └── parse.ts           # MJ string → model (for re-import/edit)
│   ├── flags/
│   │   ├── schema.ts          # FlagDefinition type + loader
│   │   ├── flags.config.json  # DATA-DRIVEN flag definitions (the key file)
│   │   └── validate.ts        # clamp/validate values against schema
│   └── suggestions/
│       └── mapper.ts          # LLM JSON → Palette[] (+ category contract)
├── ports/                     # Interfaces only — the seams
│   ├── LlmAdapter.ts
│   ├── PersistenceAdapter.ts
│   └── ClipboardAdapter.ts
├── adapters/                  # Concrete implementations behind ports
│   ├── llm/
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── google.ts
│   │   ├── openai-compatible.ts   # covers Ollama/LM Studio/OpenRouter/etc.
│   │   └── registry.ts            # id → factory map
│   ├── persistence/
│   │   ├── indexeddb.ts           # web (Dexie)
│   │   └── tauri-fs.ts            # desktop (JSON file)
│   └── clipboard/
│       ├── web.ts
│       └── tauri.ts
├── state/                     # Central store (Zustand/Redux-Toolkit)
│   ├── buildSession.ts
│   ├── palettes.ts
│   ├── library.ts
│   └── settings.ts
├── services/                  # App-layer orchestration (impure, uses ports)
│   ├── suggestionService.ts
│   └── libraryService.ts
├── ui/                        # Components/views only
│   ├── IntentInput/
│   ├── PaletteBrowser/
│   ├── PromptAssembler/
│   ├── FlagControls/          # renders from flag schema
│   └── LibraryPanel/
├── platform/
│   └── composition-root.ts    # detects runtime, wires adapters
└── main.tsx
```

### Structure Rationale

- **`domain/` is pure and dependency-free.** It is unit-testable without a browser, an API key, or a desktop shell. The serializer and flag validator are the two pieces most worth testing exhaustively.
- **`ports/` + `adapters/` is the hexagonal seam** that delivers three of the project's hard constraints at once: provider-flexible LLM, web-vs-desktop persistence, and BYO-key. UI/state depend on `ports/`, never on `adapters/`.
- **`flags.config.json` is isolated and data-only** so a Midjourney version bump is a config edit (or even a user-editable file), not a code change.
- **`composition-root.ts` is the only file that knows the runtime.** Everything else is runtime-agnostic.

## Architectural Patterns

### Pattern 1: Hexagonal Ports & Adapters (Dependency Inversion)

**What:** Define narrow interfaces (`ports/`) for every external concern; provide swappable concrete implementations (`adapters/`). The composition root injects the right one.
**When to use:** Whenever the same logical operation has multiple backends — here it applies three times (LLM vendor, storage medium, clipboard).
**Trade-offs:** A little upfront indirection, hugely cheaper to add a 4th LLM provider or a mobile target later. For a 3-constraint app like this it pays off immediately.

```typescript
// ports/LlmAdapter.ts — the single seam every provider implements
export interface SuggestRequest {
  intent: string;
  categories: string[];        // ["camera","mediaType","style","enhancer"]
  maxPerCategory: number;
  model: string;
  apiKey: string;
}
export interface SuggestionPalette { category: string; options: string[]; }

export interface LlmAdapter {
  readonly id: string;                       // "openai" | "anthropic" | ...
  readonly label: string;
  listModels?(apiKey: string): Promise<string[]>;
  suggest(req: SuggestRequest): Promise<SuggestionPalette[]>;
}
```

### Pattern 2: Data-Driven (Schema-Driven) Flag Definitions

**What:** Every Midjourney parameter is described as a row of data — name, syntax token, value kind, range, default, applicable model versions. The Flag Controls UI is *generated* from this list, the validator clamps from it, and the serializer reads token/format from it. No flag is referenced by hardcoded `if` logic.
**When to use:** Any time the rule set is externally owned and version-volatile (Midjourney owns it and changes it). This is the project's explicitly stated requirement.
**Trade-offs:** The serializer must handle a small fixed set of *value kinds* (enum, range, toggle, text, list, weighted-ref) rather than per-flag code. That generality is the whole win: new flags that fit an existing kind need zero code.

```typescript
// domain/flags/schema.ts
export type FlagKind =
  | "enum"        // --ar 16:9, --v 7        (choices)
  | "range"       // --stylize 0..1000       (numeric, clamp + step)
  | "toggle"      // --tile                  (presence-only, no value)
  | "text"        // --no cars, trees        (free text, comma list)
  | "ref";        // --sref <url> --sw 100   (reference + paired weight)

export interface FlagDefinition {
  id: string;                 // "aspectRatio"
  token: string;              // "--ar"     (what gets serialized)
  aliases?: string[];         // ["--aspect"]
  label: string;              // "Aspect Ratio"
  kind: FlagKind;
  group: "composition" | "style" | "quality" | "reference" | "exclude";
  default?: unknown;
  // kind-specific constraints (only the relevant ones are set):
  choices?: { value: string; label: string }[];      // enum
  min?: number; max?: number; step?: number;          // range
  pairedWeight?: { token: string; min: number; max: number; default: number }; // ref
  appliesToVersions?: string[];   // e.g. ["7","6.1"] — hide for niji, etc.
  order: number;              // serialization + UI ordering
  help?: string;
}
```

```jsonc
// domain/flags/flags.config.json  (excerpt — this file is the version-survival layer)
[
  { "id":"aspectRatio","token":"--ar","kind":"enum","group":"composition","order":10,
    "choices":[{"value":"1:1","label":"Square"},{"value":"16:9","label":"Wide"},{"value":"9:16","label":"Tall"}] },
  { "id":"version","token":"--v","kind":"enum","group":"style","order":20,
    "choices":[{"value":"7","label":"v7"},{"value":"6.1","label":"v6.1"}],"default":"7" },
  { "id":"stylize","token":"--stylize","kind":"range","group":"style","order":30,
    "min":0,"max":1000,"step":5,"default":100 },
  { "id":"chaos","token":"--chaos","kind":"range","group":"style","order":40,"min":0,"max":100,"default":0 },
  { "id":"weird","token":"--weird","kind":"range","group":"style","order":50,"min":0,"max":3000,"default":0 },
  { "id":"tile","token":"--tile","kind":"toggle","group":"composition","order":60 },
  { "id":"exclude","token":"--no","kind":"text","group":"exclude","order":200 },
  { "id":"styleRef","token":"--sref","kind":"ref","group":"reference","order":120,
    "pairedWeight":{"token":"--sw","min":0,"max":1000,"default":100} }
]
```

### Pattern 3: Unidirectional State with Derived Serialization

**What:** One central store holds the draft model; the final prompt string is a *derived selector*, never stored as the source of truth. Picking a palette option, dragging a segment, or moving a flag slider all mutate the model; the preview re-derives.
**When to use:** Editors where many inputs converge on one output artifact. Avoids the classic bug of the preview drifting out of sync with the controls.
**Trade-offs:** Serialization runs on every change — trivial cost here (a prompt is tiny). Storing the model (not the string) also makes saved-library items re-editable.

```typescript
// derived — never stored
const finalPrompt = serialize(draft, flagSchema);
```

### Pattern 4: Runtime Composition Root

**What:** A single startup function detects whether it runs inside Tauri (`window.__TAURI__`) or a plain browser and binds the matching persistence/clipboard adapters.
**When to use:** Multi-target single codebase.
**Trade-offs:** None significant; keeps every other module ignorant of the host.

```typescript
const isTauri = "__TAURI_INTERNALS__" in window;
const persistence = isTauri ? new TauriFsPersistence() : new IndexedDbPersistence();
```

## Data Flow

### Suggestion Flow (intent → palettes)

```
[User types intent + clicks Suggest]
      ↓
IntentInput dispatch → suggestionService.suggest(intent)
      ↓
reads settings (provider id, model, key) → resolves LlmAdapter via registry
      ↓
LlmAdapter.suggest()  →  user's chosen LLM provider (client-side fetch, BYO key)
      ↓
raw JSON  →  suggestions/mapper.ts  →  SuggestionPalette[]
      ↓
palettes slice updated  →  PaletteBrowser re-renders
```

### Assembly + Save Flow (picks → string → library)

```
[User clicks options / sets flags]
      ↓
buildSession mutations (segments, weights, flag values)
      ↓
serialize(draft, schema)  →  live preview string
      ↓
[User clicks Copy]   → ClipboardAdapter.write(string)
[User clicks Save]   → libraryService.save({name, draft})
                            ↓
                     PersistenceAdapter.put(record)   → IndexedDB | Tauri file
      ↓
library index slice updated → LibraryPanel re-renders
[Load] → PersistenceAdapter.get(id) → hydrate buildSession (re-editable)
```

### State Management

```
Central store (settings | palettes | buildSession | library)
      ↓ subscribe
UI components  ──actions──►  reducers/mutations  ──►  store
                                   │
                        services (impure) call ports for I/O,
                        then write results back into the store
```

### Key Data Flows

1. **BYO-key never leaves the client:** the key lives in settings storage and is passed directly into the provider adapter's `fetch` call. No first-party server exists, so there is nowhere for it to leak server-side.
2. **Model is canonical, string is derived:** saved library records store the structured `PromptDraft`, so old prompts remain editable and re-serializable even after the flag schema updates.

## Prompt-Assembly Model (state representation)

The draft is a structured object, not a string. This is what makes weighted multi-prompts, ordered flags, and re-editing tractable.

```typescript
// domain/prompt/model.ts
export interface Segment {
  id: string;
  text: string;             // a description fragment ("cinematic lighting")
  weight?: number;          // multi-prompt weight; serialized as "text::weight"
  source: "user" | "palette";
  category?: string;        // if it came from a palette
  enabled: boolean;         // toggle without deleting
}

export interface FlagValue {
  flagId: string;           // FK → FlagDefinition.id
  value: unknown;           // shape depends on FlagDefinition.kind
  weight?: number;          // for "ref" kind paired weight
}

export interface PromptDraft {
  id: string;
  name?: string;
  segments: Segment[];      // ORDER matters → render order in the prompt
  flags: FlagValue[];       // serialized in FlagDefinition.order, not array order
  createdAt: string;
  updatedAt: string;
}
```

**Serialization rules the serializer encodes:**
- Segments render in array order, joined by `, `. A segment with `weight` becomes `text::weight`. Negative weights (e.g. `::-0.5`) are allowed — Midjourney supports them for de-emphasis. Disabled segments are skipped.
- A bare `::` with weights between phrases is how MJ does multi-prompts; the serializer emits `seg1::2 seg2::1` form when any weight is present.
- Flags render after all description text, in `FlagDefinition.order`, each as `token value` (or just `token` for toggles, or `token value pairedToken weight` for refs).
- `--no` aggregates all exclude entries into one comma list.

### Recommended saved-prompt record (persistence shape)

```typescript
// what PersistenceAdapter stores
export interface SavedPrompt {
  schemaVersion: number;     // bump when PromptDraft shape changes → enables migration
  draft: PromptDraft;        // canonical structured form (re-editable)
  rendered: string;          // denormalized final string (fast list preview / copy)
  flagSchemaVersion?: string;// which MJ flag config produced it (provenance)
}
```

## Persistence Abstraction (web vs desktop)

One interface, two implementations, selected at the composition root.

```typescript
// ports/PersistenceAdapter.ts
export interface PersistenceAdapter {
  list(): Promise<SavedPrompt[]>;
  get(id: string): Promise<SavedPrompt | null>;
  put(p: SavedPrompt): Promise<void>;
  delete(id: string): Promise<void>;
  exportAll(): Promise<string>;        // JSON blob for backup/portability
  importAll(json: string): Promise<void>;
}
```

| Target | Implementation | Notes |
|--------|----------------|-------|
| Web | IndexedDB via **Dexie** | Survives reloads, handles larger libraries than localStorage, structured queries. Use localStorage only for tiny settings, not the library. |
| Desktop | Tauri FS plugin writing one JSON file in app-data dir | Human-readable, easy backup, no native DB dependency. Tauri's official `plugin-fs` + `plugin-store` cover this. |

Both implementations satisfy the same async contract, so the library service is identical across targets. The `exportAll`/`importAll` pair gives users a manual sync/backup path that compensates for the deliberate lack of cloud sync.

## Recommended Build Order (dependency-driven)

This ordering surfaces the riskiest/most-foundational pieces first and keeps each step demoable.

1. **Domain core: PromptDraft model + serializer + flag schema/validator.** Pure, no I/O, fully unit-testable. Everything else consumes this. *Highest leverage, lowest dependency.*
2. **Flag schema config + schema-driven FlagControls UI.** Proves the data-driven claim early; a flag change becomes a JSON edit.
3. **State store + Prompt Assembler UI (manual entry, no LLM yet).** You can already build and copy a complete prompt by hand — a shippable thin slice.
4. **Persistence port + IndexedDB adapter + Library (save/load/delete/export).** Local library works on web.
5. **LLM port + first provider adapter + Suggestion service + PaletteBrowser.** Adds the AI-suggestion value on top of a working manual builder.
6. **Additional provider adapters + settings UI (provider/model/key).** Fulfills provider-flexibility.
7. **Desktop packaging: Tauri shell + Tauri FS/clipboard adapters.** Composition root swaps adapters; reuses everything above.

Rationale: the app delivers user value at step 3 (manual builder), again at 4 (library), again at 5 (AI). Desktop (7) is deliberately last because the ports built in 4–6 make it a wiring exercise, not a rewrite.

## Scaling Considerations

This is a single-user, local-only tool, so "scale" means library size and prompt complexity, not concurrent users.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Tens of prompts | localStorage would technically work, but start on IndexedDB/Dexie anyway to avoid a later migration. |
| Hundreds–thousands of prompts | IndexedDB indexes on name/updatedAt; paginate/virtualize the library list. Tauri JSON file still fine (load once, keep in memory). |
| Very large libraries (desktop) | If the single JSON file gets unwieldy, switch the Tauri adapter to SQLite (`plugin-sql`) behind the *same* `PersistenceAdapter` interface — no other code changes. |

### Scaling Priorities

1. **First bottleneck:** library list rendering — fix with list virtualization, not architecture changes.
2. **Second bottleneck:** desktop single-file write churn — fix by debouncing writes or moving that adapter to SQLite behind the existing port.

## Anti-Patterns

### Anti-Pattern 1: Hardcoding Midjourney flags in component/serializer logic

**What people do:** `if (flag === 'ar') renderArSlider()`, string-concatenate flags with bespoke code per parameter.
**Why it's wrong:** Every Midjourney version bump becomes a code change across UI + serializer + validator; the explicit project requirement is that flags survive version changes without code edits.
**Do this instead:** Drive UI, validation, and serialization from `flags.config.json` via a small set of value *kinds*. Adding a flag that fits an existing kind = a JSON row.

### Anti-Pattern 2: Storing the final prompt string as the source of truth

**What people do:** Keep `prompt: string` in state and parse it on every edit.
**Why it's wrong:** Loses structure (weights, which palette a segment came from, flag identity), makes re-editing saved prompts brittle, and couples preview to parsing.
**Do this instead:** Canonical structured `PromptDraft`; derive the string. Store both in the library (`draft` canonical + `rendered` denormalized for fast preview).

### Anti-Pattern 3: Importing a concrete LLM/storage backend into UI or domain

**What people do:** `import { OpenAI } from 'openai'` inside a React component or the assembler.
**Why it's wrong:** Welds the app to one vendor/runtime and breaks BYO-key flexibility and the web/desktop split.
**Do this instead:** Depend on `LlmAdapter` / `PersistenceAdapter` interfaces; wire concrete classes only in the composition root.

### Anti-Pattern 4: Trusting raw LLM output as palette data

**What people do:** Render whatever the model returns directly into palettes.
**Why it's wrong:** Models return prose, extra categories, or malformed JSON; the UI breaks or shows garbage.
**Do this instead:** Request structured/JSON output, then run it through `suggestions/mapper.ts` which validates the category contract, trims, dedupes, and drops anything off-schema before it reaches state.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| LLM providers (OpenAI, Anthropic, Google, Ollama/OpenAI-compatible) | Client-side `fetch` from inside the provider adapter, BYO key passed per-request | Browser CORS + the SDKs' `dangerouslyAllowBrowser` flag apply; many users will hit CORS, so prefer plain `fetch` to provider REST endpoints or document a local proxy/Ollama. Desktop (Tauri) can bypass browser CORS via its HTTP plugin — a real advantage of the desktop target. |
| Midjourney | None — no API integration; output is a copyable string the user pastes into Midjourney themselves | Out of scope by design. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ State | actions / subscriptions | UI never calls ports directly; it dispatches to services. |
| Services ↔ Ports | interface method calls | Only services (impure layer) touch ports. |
| Domain ↔ everything | pure function calls | Domain imports nothing from adapters/state/ui. |
| Composition root ↔ adapters | constructs concretes once | The only runtime-aware module. |

## Sources

- Midjourney Parameter List (official docs) — https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List (HIGH for existence of flags; exact ranges shift per version — confirmed --stylize 0–1000/def 100, --chaos 0–100, --weird 0–3000 via secondary sources)
- Chaos / Variety (official) — https://docs.midjourney.com/hc/en-us/articles/32099348346765-Chaos-Variety
- Tauri v2 vs Electron comparison (2026) — https://www.buildmvpfast.com/blog/tauri-v2-vs-electron-desktop-apps-2026 and https://www.dolthub.com/blog/2025-11-13-electron-vs-tauri/ (MEDIUM — supports single-codebase web+desktop choice and Tauri FS/store plugins)
- Vercel AI SDK + browser BYO key / `dangerouslyAllowBrowser` — https://github.com/vercel/ai and https://github.com/anthropics/anthropic-sdk-typescript/issues/248 (HIGH — confirms client-side provider calls with user-supplied keys are a supported, named pattern)
- Dexie (IndexedDB wrapper) — https://dexie.org (HIGH — standard web local-persistence choice)

---
*Architecture research for: local-first BYO-key Midjourney prompt builder (web + desktop)*
*Researched: 2026-06-26*
