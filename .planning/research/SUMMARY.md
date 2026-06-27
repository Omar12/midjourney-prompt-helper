# Project Research Summary

**Project:** Midjourney Prompt Helper
**Domain:** Local-first, BYO-key web + desktop prompt-builder (single codebase, client-side multi-provider LLM)
**Researched:** 2026-06-26
**Confidence:** MEDIUM-HIGH (architecture, features, and pitfalls are HIGH; exact AI SDK v7 API surface and the live Midjourney flag matrix are MEDIUM and shift over time)

## Executive Summary

This is a **local-first single-page app with no backend**, shipped to both web and desktop from one codebase. The expert pattern is unambiguous and all four research tracks converge on it: build a **Vite + React + TypeScript SPA**, wrap that exact same `dist/` in **Tauri 2** for desktop, persist the prompt library in **IndexedDB via Dexie** (one storage path that works identically in the browser and inside Tauri's webview), and do all LLM work client-side through the **Vercel AI SDK** using `generateObject` + a **Zod** schema. The defining constraint — *one codebase, two targets* — is satisfied by treating the web SPA as the source of truth and Tauri as a thin native shell, and by hiding every platform-specific concern (storage, HTTP, clipboard, file I/O) behind a **hexagonal ports-and-adapters seam**.

The recommended approach is a **layered, unidirectional-data-flow architecture** with a pure domain core (prompt model + serializer + data-driven flag schema) surrounded by adapter ports. Two design decisions are load-bearing and must be honored from the first line of code: (1) **Midjourney flags are data, never hardcoded logic** — a versioned `flags.config.json` drives the UI, validation, and serialization, so a Midjourney version bump is a config edit, not a code change; and (2) **the structured `PromptDraft` model is canonical and the final prompt string is derived**, never stored as the source of truth, which keeps saved prompts re-editable and the serializer testable. The product's single differentiator is **intent -> AI-populated palettes**: the user types plain-language intent and an LLM returns categorized, schema-validated option lists they click to assemble.

The risk profile is unusual because there is **no server**, so every "secure it server-side" answer is off the table by design. The dangerous areas cluster tightly: **provider CORS variance** (Anthropic needs a special browser header, OpenAI's browser support is not guaranteed — the desktop build is the CORS escape hatch via native HTTP), **API-key leakage** from client storage (mitigated by strict CSP, log scrubbing, base-URL whitelisting, and OS keychain on desktop), **calling the LLM on every keystroke** (use an explicit "Suggest" trigger + cancellation + caching, since the user pays per token), **trusting raw LLM output** (always validate against a Zod schema and sanitize `::`/`--` out of suggestions), and **local persistence loss** (IndexedDB + `navigator.storage.persist()` + ship JSON export/import early as the *only* real backup). The highest-ROI test asset in the entire project is a **golden-string unit-test suite for the prompt serializer**.

## Key Findings

### Recommended Stack

A web SPA wrapped by a native shell, with all LLM and persistence concerns delegated to the user's own key (LLM) or a local store (persistence). Tauri 2 is chosen over Electron decisively (HIGH confidence) — ~3-12 MB installers vs 80-180 MB, far lower idle RAM, and a deny-by-default capability security model that matters greatly for a key-holding app. The AI SDK's `generateObject` + Zod schema is the core primitive that turns intent into validated palette data; switching providers is just swapping a model factory. See `STACK.md`.

**Core technologies:**
- **Vite 8 + React 19 + TypeScript 6** — SPA source of truth; the same `dist/` is served on web and loaded by Tauri.
- **Tauri 2.11** — desktop wrapper; small footprint, sandboxed frontend, native HTTP that bypasses browser CORS, OS keychain via Stronghold.
- **Vercel AI SDK (`ai` 7.x) + Zod 4** — unified client-side multi-provider LLM access; `generateObject` returns schema-validated structured palette data, no brittle JSON parsing.
- **Dexie 4 (IndexedDB)** — one persistence path for both targets; reactive `useLiveQuery` for the library view.
- **Zustand 5** — lightweight session/UI state (draft assembly, active provider, palette state).
- **Provider packages** — `@ai-sdk/openai|anthropic|google|mistral`, `@ai-sdk/openai-compatible` (the "any provider" escape hatch), `@openrouter/ai-sdk-provider` (one key, 400+ models — best low-friction default).

> **Avoid:** Electron (default), Next.js/any SSR (a server contradicts the no-backend constraint), Tauri Store/`fs` plugin for the library (desktop-only, forces branching persistence), and any "BYOK-via-our-proxy" service (reintroduces a backend).

### Expected Features

The competitive table-stakes bar is set by PromptFolder and IMI Prompt Builder (palettes + parameter controls + copy). Our differentiation is **LLM-suggested intent-driven palettes**, **local-first BYO-key**, and **web/desktop parity**. The authoritative Midjourney parameter inventory in `FEATURES.md` is the seed data for the versioned flag-definition file — flags split into always-applicable, version-gated (e.g. `--cref` is V6-only legacy, `--oref` is V7+), and reference-dependent weights (`--sw` needs `--sref`). See `FEATURES.md`.

**Must have (table stakes):**
- Plain-language intent input — the anchor of the whole flow.
- Palette pickers (style, lighting, camera/lens, composition, color, mood) with click-to-assemble chips.
- Live prompt preview + copy-to-clipboard — the product's entire output is a string.
- Core flag controls via UI (`--ar`, `--v`/`--niji`, `--stylize`, `--chaos`, `--no`, `--seed`), version-gated.
- Saved local library that restores **full builder state** on reload (not just the string).
- BYO LLM key entry + local storage + at least one provider adapter.

**Should have (competitive differentiators):**
- **Intent -> AI-populated palettes** — the headline feature; without it this is just another static builder.
- Version-aware flag intelligence (warn/auto-correct `--cref` vs `--oref`).
- Reference manager (`--sref`/`--cref`/`--oref` + weight sliders, sref-code storage).
- Multi-prompt `::` weight editor (incl. negatives) — power-user payoff few competitors expose well.
- Per-category "suggest more / regenerate"; import/parse an existing prompt back into the builder.
- Library JSON export/import — the only backup in a no-backend design.

**Defer (v2+):**
- Prompt variations / A-B diff generator; inline "explain this flag" learning layer.
- Curated community sref-code browser; prompt template/framework presets.

> **Anti-features (explicitly out of scope):** direct image generation / Discord-MJ automation, server-side accounts / cloud sync, server-hosted keys, "AI writes the whole prompt for you" (contradicts the suggest-not-author Core Value), massive static preset libraries, real-time collaboration.

### Architecture Approach

A layered, unidirectional-data-flow SPA: a pure, I/O-free **domain core** (prompt model + serializer + flag schema/validator) surrounded by **ports** (`LlmAdapter`, `PersistenceAdapter`, `ClipboardAdapter`) with web and desktop **adapters** behind each interface. The UI and domain depend only on interfaces; a single **composition root** detects the runtime (`__TAURI_INTERNALS__`) and wires the concrete adapters at startup. This one pattern simultaneously delivers three hard constraints: provider-flexible LLM, web-vs-desktop persistence, and BYO-key. See `ARCHITECTURE.md`.

**Major components:**
1. **Domain core** (`domain/`) — pure `PromptDraft` model, `serialize`/`parse`, and the data-driven flag schema + validator. The serializer and validator are the two pieces most worth testing exhaustively.
2. **Flag schema** (`flags.config.json` + a small set of value *kinds*: enum/range/toggle/text/ref) — the version-survival layer; UI, validation, and serialization all generated from it.
3. **Ports + adapters** — `LlmAdapter` (per-provider call shape + CORS metadata), `PersistenceAdapter` (Dexie/IndexedDB on web, Tauri file on desktop, with `exportAll`/`importAll`), `ClipboardAdapter`.
4. **State store + services** (Zustand) — canonical draft model; the prompt string is a derived selector. Impure services orchestrate ports; the suggestion service maps validated LLM JSON into palettes.
5. **Composition root** — the only runtime-aware module.

### Critical Pitfalls

1. **Provider CORS variance** — not all providers allow browser calls; Anthropic needs `anthropic-dangerous-direct-browser-access: true`, OpenAI's browser support isn't guaranteed. Build a provider adapter layer with per-provider metadata from day one; route desktop calls through Tauri native HTTP to bypass CORS entirely. Distinguish CORS / 401 / 429 in error handling.
2. **API-key leakage** — `localStorage` is readable by any script (XSS/supply-chain). Mitigate with strict CSP (locked `connect-src`), never logging request objects (add a test asserting the key never appears in output), base-URL whitelisting, and OS keychain (Stronghold) on desktop. Recommend users use scoped keys with spend caps.
3. **LLM-call-per-keystroke** — cost blowups on the user's key, 429s, and stale-result races. Use an explicit "Suggest" trigger (not live), AbortController + latest-request guard, and cache by normalized intent.
4. **Midjourney flag drift** — the spec changes every version; hardcoding emits invalid prompts on the next release. Flags must be versioned data keyed to the selected `--v`/`--niji`; preserve unknown flags on load of old prompts.
5. **Prompt-assembly correctness** — ordering (flags at end), `::` multi-prompt weight spacing, whitespace/duplicate normalization, and `::`/`--` injection from suggestions. Implement a deterministic ordered serializer with a **golden-string unit-test suite** (the highest-ROI tests in the project) and sanitize LLM suggestion strings.
6. **Persistence loss** — browser eviction (Safari ITP clears after ~7 days), quota caps, lossy migrations. Use IndexedDB (not localStorage) for the library, call `navigator.storage.persist()`, version the saved-data schema with forward-compatible migrations, and ship JSON export/import early as the real backup.

## Implications for Roadmap

The architecture research's dependency-driven build order is the strongest signal: it surfaces the riskiest/most-foundational pieces first and keeps every step demoable. The suggested phasing follows it, front-loading the pure domain core and the platform abstraction so features never pile up on platform-specific calls, and deliberately deferring desktop packaging to a wiring exercise rather than a rewrite.

### Phase 1: Domain Core + Platform Abstraction
**Rationale:** Pure, I/O-free, fully unit-testable — everything else consumes it. Building the ports interfaces now prevents Pitfall 7 (web/desktop divergence) before feature code can scatter platform calls.
**Delivers:** `PromptDraft` model, deterministic serializer with golden-string tests, `parse` (string -> model), and the empty `LlmAdapter`/`PersistenceAdapter`/`ClipboardAdapter` ports + composition root.
**Addresses:** the structural foundation for every must-have feature.
**Avoids:** Pitfall 5 (assembly correctness — serializer + tests), Pitfall 7 (platform abstraction).

### Phase 2: Data-Driven Flag Schema + Flag Controls UI
**Rationale:** The flag schema is the spine of both the flag UI and version gating; it must precede any flag control. Proves the data-driven claim early (a flag change = a JSON edit).
**Delivers:** `flags.config.json` (seeded from the FEATURES.md inventory), the value-kind validator, and schema-driven flag controls (ar, v/niji, stylize, chaos, no, seed) that show/hide by selected version.
**Uses:** Zod for schema/validation; the FlagDefinition kinds (enum/range/toggle/text/ref).
**Avoids:** Pitfall 4 (flag drift).

### Phase 3: State Store + Manual Prompt Assembler + Copy
**Rationale:** Delivers a shippable thin slice — a user can build and copy a complete prompt *by hand* with no LLM yet. Proves the assembly loop end-to-end.
**Delivers:** Zustand store (buildSession/palettes/settings), click-to-assemble chips, live derived preview, copy-to-clipboard.
**Addresses:** table-stakes builder mechanic + copy output.
**Avoids:** Pitfall 5 (live preview of the exact copied string).

### Phase 4: Local Persistence + Library
**Rationale:** Adds the #2 reason users return (reuse) on top of a working manual builder, on web first.
**Delivers:** IndexedDB/Dexie persistence adapter, save/list/reload/delete (restoring full builder state), `navigator.storage.persist()`, schema-versioned records, and JSON export/import.
**Uses:** Dexie + `dexie-react-hooks`.
**Avoids:** Pitfall 8 (persistence loss — IndexedDB, persist(), export/import, migrations).

### Phase 5: LLM Integration + AI-Populated Palettes
**Rationale:** Adds the headline differentiator on top of a proven manual builder. This is the highest-uncertainty phase (provider quirks + output reliability).
**Delivers:** first `LlmAdapter` (e.g. OpenRouter or OpenAI), `generateObject` + Zod palette schema, suggestion service + mapper (validate/sanitize), PaletteBrowser, explicit "Suggest" trigger with debounce/cancellation/caching, BYO-key entry.
**Implements:** the suggestion data-flow; the core product value.
**Avoids:** Pitfall 1 (CORS — adapter metadata), Pitfall 3 (call-per-keystroke), Pitfall 6 (trusting LLM output — schema validation + sanitization).

### Phase 6: Provider Flexibility + Key Security Hardening
**Rationale:** Fulfills the provider-flexible constraint and closes the key-leakage risk before broad use.
**Delivers:** additional provider adapters (Anthropic w/ browser header, Google, openai-compatible), settings UI (provider/model/key), strict CSP with locked `connect-src`, base-URL whitelisting, log scrubbing + key-never-logged test.
**Avoids:** Pitfall 1 (multi-provider CORS), Pitfall 2 (key leakage).

### Phase 7: Desktop Packaging (Tauri)
**Rationale:** Deliberately last — the ports built in phases 1/4/5/6 make this a wiring exercise, not a rewrite. Unlocks the CORS escape hatch and keychain key storage.
**Delivers:** Tauri shell wrapping the same `dist/`, Tauri FS + clipboard + native-HTTP adapters, Stronghold/OS-keychain key storage, per-OS webview testing.
**Avoids:** Pitfall 2 (desktop key in keychain not plaintext), Pitfall 7 (verified parity on real target webviews).

### Phase Ordering Rationale

- **Dependency-driven:** the pure domain core (serializer + flag schema) is the highest-leverage, lowest-dependency piece; everything consumes it, so it goes first. Flag schema precedes flag UI; ports precede adapters.
- **Demoable at every step:** user value lands at Phase 3 (manual builder), again at Phase 4 (library), again at Phase 5 (AI). No phase is a dead-end refactor.
- **Risk front-loading:** platform abstraction (Phase 1) and data-driven flags (Phase 2) are installed before feature code can violate them — both are cheap now, expensive to retrofit (per the tech-debt and recovery tables in PITFALLS.md).
- **Desktop last by design:** Tauri is a thin shell over ports that already exist, so it's wiring, not rewrite.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:plan-phase --research-phase <N>`):
- **Phase 5 (LLM Integration):** MEDIUM confidence on exact AI SDK v7 `generateObject` signatures and per-provider structured-output support; confirm against current AI SDK docs and verify CORS behavior per provider in the web build.
- **Phase 2 (Flag Schema):** the live Midjourney parameter/version matrix shifts frequently — re-verify ranges, defaults, and version-gating (e.g. `--cref` vs `--oref`, quality values) against current MJ docs when seeding the config.
- **Phase 7 (Desktop Packaging):** Tauri native-HTTP CORS bypass, Stronghold key storage, and per-OS webview rendering differences warrant a focused pass.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Domain Core):** pure TypeScript + serializer/validator — well-understood, test-driven.
- **Phase 3 (State + Assembler):** plain React + Zustand component state.
- **Phase 4 (Persistence):** Dexie/IndexedDB is a documented, standard path; export/import is straightforward.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Framework/wrapper/persistence verified against npm registry and official docs; only exact AI SDK v7 method signatures are MEDIUM. |
| Features | HIGH | MJ parameter inventory and competitor feature set from multiple sources incl. official-doc-derived references; "AI suggests options" UX is MEDIUM (synthesized). |
| Architecture | HIGH | Hexagonal ports/adapters, data-driven flags, and canonical-model/derived-string are well-established patterns; the exact MJ flag surface is MEDIUM by design (hence data-driven). |
| Pitfalls | HIGH | CORS behavior, storage eviction, and the MJ parameter model verified against primary sources; exact MJ version-compat matrix is MEDIUM. |

**Overall confidence:** MEDIUM-HIGH — the build approach is well-grounded; the two MEDIUM items (AI SDK v7 API specifics, live MJ flag matrix) are both expected-to-drift and explicitly handled by the data-driven design.

### Gaps to Address

- **AI SDK v7 exact API:** confirm `generateObject` + Zod usage and provider factory signatures against current docs at the start of Phase 5; the concept is stable, the surface may have shifted.
- **Per-provider browser CORS:** must be probed empirically per provider during Phase 5/6 — there is no client-side fix for a non-CORS provider in the web build; route those to the desktop native-HTTP path.
- **Live Midjourney flag matrix:** re-verify ranges/defaults/version-gating when seeding `flags.config.json` (Phase 2); add a "verified against MJ version X (date)" freshness marker in the UI.
- **Structured-output support on exotic OpenAI-compatible endpoints:** some may lack JSON mode — design a `generateText` + tolerant-parse fallback.
- **Schema migration strategy:** define the saved-prompt `schemaVersion` migration approach in Phase 4 so old prompts (and unknown flags) survive future flag-schema changes.

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`) — current versions for all stack packages (June 2026).
- Tauri v2 official docs — Store plugin, capabilities/security model, webview architecture: https://v2.tauri.app/
- AI SDK docs — structured data / `generateObject`, provider management, OpenAI-compatible + OpenRouter providers: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- Dexie.org — hybrid-runtime (Tauri/Electron/PWA) support: https://dexie.org/
- Midjourney official docs — Parameter List, Multi-Prompts & Weights, Style/Character/Omni Reference: https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List
- Anthropic CORS / `anthropic-dangerous-direct-browser-access` header — Simon Willison (2024-08-23): https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/
- Browser storage quotas/eviction/`navigator.storage.persist()` — MDN + web.dev: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- PromptFolder competitor feature set: https://promptfolder.com/midjourney-prompt-helper/

### Secondary (MEDIUM confidence)
- Tauri-vs-Electron comparisons (2026) — bundle size, RAM, security figures (corroborated across multiple sources): buildmvpfast.com, dolthub.com.
- Midjourney parameter reference mirror (`--oref`/`--ow` V7-only, ranges) — https://blakecrosley.com/guides/midjourney
- IMI Prompt Builder deep dive (competitor): https://www.imiprompt.com/
- OpenAI `dangerouslyAllowBrowser` / key-in-frontend risk: https://backmesh.com/blog/openai-api-mistakes/
- IndexedDB / localStorage limits — RxDB: https://rxdb.info/articles/indexeddb-max-storage-limit.html

### Tertiary (LOW confidence)
- "AI suggests options" UX flow — synthesized from competitor behavior, fewer authoritative sources; validate during Phase 5.

---
*Research completed: 2026-06-26*
*Ready for roadmap: yes*
