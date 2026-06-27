# Stack Research

**Domain:** Local-first, web + desktop single-codebase tool with client-side (BYO-key) multi-provider LLM calls
**Researched:** 2026-06-26
**Confidence:** HIGH on framework/wrapper/persistence, MEDIUM on exact AI SDK v7 API surface (see notes)

## Executive Recommendation

Build one **Vite + React + TypeScript** single-page app. Ship it as a web app directly, and wrap that exact same frontend in **Tauri 2** for the desktop build. Persist the prompt library in **IndexedDB via Dexie** (works identically in the browser and inside Tauri's webview — one persistence path, no branching). Do all LLM work client-side through the **Vercel AI SDK** (`ai`), using its provider packages plus the OpenAI-compatible provider so the user can bring a key from essentially any vendor. Use **`generateObject` + a Zod schema** to turn plain-language intent into categorized palette options — that single primitive is the core of the product.

The defining constraint — *one codebase produces both web and desktop* — is satisfied by treating the web SPA as the source of truth and Tauri as a thin native shell. Every recommendation below protects that property.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 6.0.x | Language | Type safety across UI, persistence, and LLM schema — Zod-inferred types flow from the LLM call into the UI with no manual typing. |
| Vite | 8.1.x | Build tool / dev server | The standard SPA bundler and Tauri's officially recommended frontend tooling. Same `dist/` is served on the web and loaded by Tauri — one build, two targets. |
| React | 19.2.x | UI framework | Largest ecosystem, first-class Tauri support, and the AI SDK's UI hooks are React-first. Palette-clicking UI is plain component state — no framework strain. |
| Tauri | 2.11.x (`@tauri-apps/api`, `@tauri-apps/cli`) | Desktop wrapper | Native OS webview + Rust core. ~3-12 MB installers vs Electron's 80-180 MB, far smaller attack surface, capability-based permission model. See Tauri-vs-Electron analysis below. |
| Vercel AI SDK | `ai` 7.0.x | Unified LLM client | One interface across providers; swap vendor by swapping a model factory. `generateObject` returns schema-validated structured data — exactly what palette population needs. Runs client-side (fetch-based, isomorphic). |
| Zod | 4.4.x | Schema + validation | Defines the palette output schema for `generateObject` *and* validates persisted library records. Single source of truth for shapes; inferred TS types for free. |
| Dexie | 4.4.x | IndexedDB wrapper | Clean async API over IndexedDB. Officially targets hybrid runtimes (PWA, Tauri, Electron). Same code persists the prompt library on web and desktop. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@ai-sdk/openai` | 4.0.x | OpenAI provider | User brings an OpenAI key. Also the reference for structured-output behavior. |
| `@ai-sdk/anthropic` | 4.0.x | Anthropic/Claude provider | User brings an Anthropic key. |
| `@ai-sdk/google` | 4.0.x | Google Gemini provider | User brings a Gemini key. |
| `@ai-sdk/mistral` | 4.0.x | Mistral provider | Optional first-party vendor coverage. |
| `@ai-sdk/openai-compatible` | 3.0.x | Generic OpenAI-API provider | The "any provider" escape hatch — point at any base URL implementing the OpenAI Chat API (local servers, niche vendors, proxies). Keeps BYO-key promise truly open. |
| `@openrouter/ai-sdk-provider` | 2.10.x | OpenRouter aggregator | One user key unlocks 400+ models across vendors — the lowest-friction "any provider" path for non-technical users. Strong default to offer in the UI. |
| `ollama-ai-provider-v2` | 3.6.x | Local Ollama models | Optional: lets desktop users run fully local, zero-cost, zero-key models. Nice differentiator, defer to later. |
| `dexie-react-hooks` (`useLiveQuery`) | 4.4.x | Reactive persistence | Library view auto-updates when saved prompts change — no manual refetch wiring. |
| `zustand` | 5.0.x | Session/UI state | Holds the in-progress prompt assembly, selected provider, and palette state. Lightweight; avoids Redux ceremony. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Tailwind CSS | 4.3.x | Styling; v4 is config-light (CSS-first). Fast for building a dense palette/flag-control UI. |
| shadcn/ui (Radix primitives) | latest | Accessible, copy-in components (dialogs, popovers, toggles) for the palette pickers and flag controls. Not a dependency lock-in — you own the code. |
| Tauri Rust toolchain | stable | Required only for desktop builds (`cargo`, platform webview deps). Web build needs none of it. |
| Biome or ESLint + Prettier | latest | Lint/format. Biome is faster and single-binary; either is fine. |

## Tauri vs Electron — Explicit Decision

**Recommendation: Tauri 2. Confidence: HIGH.**

For an app whose entire job is to hold a user's LLM API key and make network calls with it, the security and footprint differences are decisive, not cosmetic:

| Criterion | Tauri 2 | Electron | Why it matters here |
|-----------|---------|----------|---------------------|
| Installer / bundle size | ~3-12 MB (native webview) | ~80-180 MB (bundles Chromium + Node) | Desktop download friction for a small utility. |
| Idle RAM | ~30-90 MB | ~200-450 MB | This is a lightweight tool, not an IDE. |
| Security model | Frontend sandboxed; system access opt-in via Rust commands + capability permissions; no Node in the renderer | Renderer can reach Node/IPC; large historical RCE surface; needs careful hardening | A key-holding app should expose the *minimum* native surface. Tauri's deny-by-default is the right posture. |
| Native secret storage | Stronghold plugin + OS keychain plugins available | Available via extra packages | Lets desktop store the API key in the OS keychain instead of web storage. |
| Cross-codebase fit | Wraps the same Vite `dist/` unchanged | Same | Both preserve single codebase. |

**The one real Tauri tradeoff:** it uses the OS's native webview (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux) rather than a bundled Chromium. Rendering/JS-API behavior can differ slightly across platforms, so the desktop build must be tested on each target — you do not get Electron's "identical Chromium everywhere" guarantee. For a form-and-list UI like this, that risk is low and acceptable. Choose Electron only if you later need a Chromium-exclusive API or a mature plugin with no Tauri equivalent.

## Persistence Strategy — One Path for Both Targets

The single-codebase constraint makes branching persistence (`if (isTauri) ... else ...`) the thing to avoid. IndexedDB is available in both the browser and Tauri's webview, so:

- **Prompt library + palette cache → IndexedDB via Dexie.** Same code, both targets. No size limits worth worrying about for text records, transactional, queryable.
- **App preferences / last-used provider → IndexedDB (Dexie) or `localStorage`.** Either is fine; keep it in one place.
- **API key → see security section.** Default to web storage for simplicity; harden on desktop with the OS keychain.

Do **not** make the desktop build depend on the Tauri Store plugin or `fs` plugin for the library, because that code cannot run on the web. Reach for Tauri-native storage only for the desktop-only key-hardening upgrade.

## Provider-Flexible Client-Side LLM Integration

The architecture is a small **provider registry**: a map from provider id → a function that takes the user's key (and optional base URL) and returns an AI SDK model. The rest of the app calls one function — `populatePalettes(intent)` — that runs `generateObject` against whichever model is selected.

Pattern:
- A Zod schema describes the palette output (e.g. `{ cameras: string[], mediaTypes: string[], styles: string[], enhancers: string[] }`, ideally with `{label, value}` objects and short descriptions).
- `generateObject({ model, schema, prompt })` returns data already validated against that schema — no brittle JSON parsing, and the UI binds directly to typed fields.
- Switching providers changes only which model factory is used; the schema and UI are untouched. This is the AI SDK's core value and the reason to prefer it over hand-rolled fetch-per-vendor code.

Coverage tiers to expose in the UI:
1. **OpenRouter** (one key, hundreds of models) — best default for "any provider."
2. **First-party providers** (OpenAI, Anthropic, Google, Mistral) — for users who already have a vendor key.
3. **OpenAI-compatible base-URL** — catch-all for anything else, including self-hosted.
4. **Ollama (local)** — optional later, desktop-only, no key.

Caveat (MEDIUM confidence): `generateObject` relies on the provider supporting structured output / JSON mode. The major providers above do, but exotic OpenAI-compatible endpoints may not — fall back to `generateText` + tolerant parsing, or a tool-call shaped prompt, for those.

## Installation

```bash
# Scaffold (creates Vite React-TS app wrapped by Tauri)
npm create tauri-app@latest    # choose: TypeScript/JS -> Vite -> React

# Core LLM + schema
npm install ai@^7 zod@^4 \
  @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google @ai-sdk/mistral \
  @ai-sdk/openai-compatible @openrouter/ai-sdk-provider

# Persistence + state
npm install dexie@^4 dexie-react-hooks zustand

# UI
npm install tailwindcss@^4
# shadcn/ui components added via its CLI as needed

# Desktop secret-storage hardening (optional, desktop build only)
npm install @tauri-apps/plugin-stronghold
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React | Svelte / SvelteKit (SPA mode) | If smallest bundle and minimal runtime matter more than ecosystem/hiring; Svelte pairs very well with Tauri. Cost: AI SDK UI helpers are React-centric, and Tauri webview already negates much of React's size concern. |
| Tauri 2 | Electron | Only if you need a Chromium-only API or a mature Electron-only plugin; accept the size/RAM/security cost. |
| Dexie / IndexedDB | Tauri SQL plugin + SQLite | Better for large/relational desktop data — but it is desktop-only and breaks the single persistence path. Not worth it for a text prompt library. |
| Dexie / IndexedDB | `localStorage` only | Fine for a handful of records; lacks querying/transactions and has a small quota. Use only for trivial preferences. |
| Vercel AI SDK | Per-vendor official SDKs (openai, @anthropic-ai/sdk) | If you need a vendor-specific feature the AI SDK hasn't surfaced. Cost: you re-implement the unified abstraction and structured-output handling per vendor — the opposite of the BYO-multi-provider goal. |
| Vercel AI SDK | LangChain.js | Overkill — agent/chain machinery this app does not need; heavier and more abstraction than a single structured call warrants. |
| OpenRouter | Direct vendor keys | Direct keys avoid OpenRouter's markup/latency hop; offer both. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Electron (as default) | 10-15x larger bundle, far higher idle RAM, larger RCE/IPC attack surface for a key-holding app | Tauri 2 |
| Next.js / any SSR framework | A server contradicts the local-only, no-backend constraint; SSR adds a runtime you must host | Vite SPA |
| Tauri Store/`fs` plugin for the prompt library | Desktop-only API; cannot run on the web build, forces branching persistence | Dexie/IndexedDB (works in both) |
| `dangerouslyAllowBrowser` mindset from the raw OpenAI SDK | Encourages scattering vendor SDKs client-side; the AI SDK already runs in-browser via fetch with a unified interface | Vercel AI SDK provider packages |
| Any "BYO-key via our proxy" service (incl. server-gateway BYOK patterns) | Reintroduces a backend and routes the user's key/prompts through a third party — violates the no-server, key-stays-local design | Direct client-side calls from the user's machine to their chosen provider |
| Redux Toolkit | Heavy for a single-user local tool | Zustand + dexie-react-hooks |

## Security Implications — API Key Stored Locally, Client-Side Calls

This is the highest-risk area of the project and must be designed deliberately, not bolted on.

**Inherent realities of BYO-key + client-side calls:**
- The key lives on the user's device and is sent directly to their chosen provider's HTTPS endpoint. There is no first-party server, so the project never sees or stores the key — this is the privacy upside and should be stated plainly in the UI.
- The key is, by necessity, present in the running client. Any XSS in the app can read it. **Therefore aggressive XSS prevention is a hard requirement:** no `dangerouslySetInnerHTML` on untrusted content, a strict Content-Security-Policy (Tauri lets you set CSP in `tauri.conf.json`; set one for web too), and treat all LLM output as untrusted text when rendering palette options.

**Storage choices, weakest to strongest:**
- `localStorage` / IndexedDB (web default): readable by any script in the origin. Acceptable for a local-only single-user tool *if* XSS is controlled, but flag it to the user. Do not sync it anywhere.
- **Desktop hardening (recommended for the Tauri build):** store the key in the OS keychain via a Tauri keychain plugin, or encrypted-at-rest via the **Stronghold** plugin. This keeps the key out of plain webview storage and out of casual disk inspection.

**Other guardrails:**
- Browser CORS: some providers (notably certain Anthropic/OpenAI direct endpoints) restrict browser-origin calls. The desktop (Tauri) build can bypass this via Tauri's HTTP plugin / Rust-side fetch, which is *not* subject to browser CORS. The web build may need providers that allow browser origins (OpenRouter and OpenAI-compatible gateways generally do). **Verify CORS per provider during implementation** — this is a likely web-build gotcha.
- Never log the key or full prompts to any telemetry. There should be no telemetry.
- Make key entry, masking, and a one-click "clear key" obvious in the UI.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ai` 7.x | `@ai-sdk/*` 4.x, `@ai-sdk/openai-compatible` 3.x | The AI SDK ships rapid majors; the `ai` core and provider packages are versioned in lockstep. Pin all `@ai-sdk/*` to the major that matches `ai`, and upgrade them together. |
| `ai` 7.x | `zod` 4.x | AI SDK consumes Zod schemas for `generateObject`; v4 Zod is current. Confirm the SDK's stated Zod range when pinning. |
| Tauri 2.11 | Vite 8, React 19 | Standard `create-tauri-app` combo; Tauri is frontend-agnostic and just serves the Vite build. |
| Dexie 4.x | Browser + Tauri webview + Electron | Explicitly supports hybrid runtimes; no special config needed in Tauri. |
| Tailwind 4.x | Vite 8 | v4 uses the Vite plugin / CSS-first config; different setup from v3 — follow v4 docs, not older guides. |

> Version note: this environment's npm registry (June 2026) reports `ai@7.0.3`, `@ai-sdk/openai@4.0.1`, `@ai-sdk/anthropic@4.0.0`, `zod@4.4.3`, `vite@8.1.0`, `react@19.2.7`, `typescript@6.0.3`, `dexie@4.4.4`, `@tauri-apps/api@2.11.1`, `tailwindcss@4.3.1`. The conceptual API (`generateObject` + Zod + provider factories, browser-capable fetch) has been stable across AI SDK majors, but the **exact v7 method signatures should be confirmed against current AI SDK docs at implementation time** — hence MEDIUM confidence on API specifics.

## Sources

- npm registry (`npm view`) — current versions for all packages above (HIGH).
- Tauri v2 official docs — Store plugin, capabilities/security model, webview architecture (HIGH): https://v2.tauri.app/
- Tauri-vs-Electron comparisons (2026) — bundle size, RAM, security figures, corroborated across multiple sources (MEDIUM, figures are indicative): tech-insider.org, gethopp.app, pkgpulse.com, buildmvpfast.com
- AI SDK docs — structured data / `generateObject`, provider management, OpenAI-compatible + community (OpenRouter) providers (HIGH on concept, MEDIUM on v7 specifics): https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data , https://ai-sdk.dev/providers/openai-compatible-providers , https://ai-sdk.dev/providers/community-providers/openrouter
- Dexie.org — hybrid-runtime (Tauri/Electron/PWA) support statement (HIGH): https://dexie.org/
- Vercel BYOK docs — confirms gateway BYOK is server-oriented, reinforcing the "call direct from client, no proxy" choice (MEDIUM): https://vercel.com/docs/ai-gateway/authentication-and-byok/byok

---
*Stack research for: local-first web+desktop Midjourney prompt builder with BYO-key client-side LLM*
*Researched: 2026-06-26*
