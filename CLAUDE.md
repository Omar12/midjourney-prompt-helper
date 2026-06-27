<!-- GSD:project-start source:PROJECT.md -->
## Project

**Midjourney Prompt Helper**

A Midjourney prompt builder for image creators who want comprehensive, well-structured prompts without memorizing Midjourney's vocabulary and flags. Users describe their intent in plain language; an LLM populates palettes of relevant options (cameras, media types, styles, enhancers), and users click to assemble a final prompt — including full Midjourney technical flags. Runs as both a web app and a desktop app, stores everything locally, and keeps a saved library of past prompts.

**Core Value:** The user can go from a vague idea to a copyable, complete Midjourney prompt — assembled from AI-suggested options they choose — faster than writing it by hand.

### Constraints

- **Tech stack**: Single codebase must ship both a web app and a desktop app — favors a web stack with a desktop wrapper (e.g. Tauri/Electron + browser).
- **Persistence**: Local-only — no server database, no auth backend.
- **Security**: User's LLM API key stored locally; never transmitted to any first-party server (there is none).
- **Dependencies**: LLM provider is user-selected ("bring your own key") — integration must be provider-flexible, not locked to one vendor.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Executive Recommendation
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
| Criterion | Tauri 2 | Electron | Why it matters here |
|-----------|---------|----------|---------------------|
| Installer / bundle size | ~3-12 MB (native webview) | ~80-180 MB (bundles Chromium + Node) | Desktop download friction for a small utility. |
| Idle RAM | ~30-90 MB | ~200-450 MB | This is a lightweight tool, not an IDE. |
| Security model | Frontend sandboxed; system access opt-in via Rust commands + capability permissions; no Node in the renderer | Renderer can reach Node/IPC; large historical RCE surface; needs careful hardening | A key-holding app should expose the *minimum* native surface. Tauri's deny-by-default is the right posture. |
| Native secret storage | Stronghold plugin + OS keychain plugins available | Available via extra packages | Lets desktop store the API key in the OS keychain instead of web storage. |
| Cross-codebase fit | Wraps the same Vite `dist/` unchanged | Same | Both preserve single codebase. |
## Persistence Strategy — One Path for Both Targets
- **Prompt library + palette cache → IndexedDB via Dexie.** Same code, both targets. No size limits worth worrying about for text records, transactional, queryable.
- **App preferences / last-used provider → IndexedDB (Dexie) or `localStorage`.** Either is fine; keep it in one place.
- **API key → see security section.** Default to web storage for simplicity; harden on desktop with the OS keychain.
## Provider-Flexible Client-Side LLM Integration
- A Zod schema describes the palette output (e.g. `{ cameras: string[], mediaTypes: string[], styles: string[], enhancers: string[] }`, ideally with `{label, value}` objects and short descriptions).
- `generateObject({ model, schema, prompt })` returns data already validated against that schema — no brittle JSON parsing, and the UI binds directly to typed fields.
- Switching providers changes only which model factory is used; the schema and UI are untouched. This is the AI SDK's core value and the reason to prefer it over hand-rolled fetch-per-vendor code.
## Installation
# Scaffold (creates Vite React-TS app wrapped by Tauri)
# Core LLM + schema
# Persistence + state
# UI
# shadcn/ui components added via its CLI as needed
# Desktop secret-storage hardening (optional, desktop build only)
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
- The key lives on the user's device and is sent directly to their chosen provider's HTTPS endpoint. There is no first-party server, so the project never sees or stores the key — this is the privacy upside and should be stated plainly in the UI.
- The key is, by necessity, present in the running client. Any XSS in the app can read it. **Therefore aggressive XSS prevention is a hard requirement:** no `dangerouslySetInnerHTML` on untrusted content, a strict Content-Security-Policy (Tauri lets you set CSP in `tauri.conf.json`; set one for web too), and treat all LLM output as untrusted text when rendering palette options.
- `localStorage` / IndexedDB (web default): readable by any script in the origin. Acceptable for a local-only single-user tool *if* XSS is controlled, but flag it to the user. Do not sync it anywhere.
- **Desktop hardening (recommended for the Tauri build):** store the key in the OS keychain via a Tauri keychain plugin, or encrypted-at-rest via the **Stronghold** plugin. This keeps the key out of plain webview storage and out of casual disk inspection.
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
## Sources
- npm registry (`npm view`) — current versions for all packages above (HIGH).
- Tauri v2 official docs — Store plugin, capabilities/security model, webview architecture (HIGH): https://v2.tauri.app/
- Tauri-vs-Electron comparisons (2026) — bundle size, RAM, security figures, corroborated across multiple sources (MEDIUM, figures are indicative): tech-insider.org, gethopp.app, pkgpulse.com, buildmvpfast.com
- AI SDK docs — structured data / `generateObject`, provider management, OpenAI-compatible + community (OpenRouter) providers (HIGH on concept, MEDIUM on v7 specifics): https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data , https://ai-sdk.dev/providers/openai-compatible-providers , https://ai-sdk.dev/providers/community-providers/openrouter
- Dexie.org — hybrid-runtime (Tauri/Electron/PWA) support statement (HIGH): https://dexie.org/
- Vercel BYOK docs — confirms gateway BYOK is server-oriented, reinforcing the "call direct from client, no proxy" choice (MEDIUM): https://vercel.com/docs/ai-gateway/authentication-and-byok/byok
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
