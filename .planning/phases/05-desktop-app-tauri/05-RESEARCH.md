# Phase 5: Desktop App (Tauri) - Research

**Researched:** 2026-07-02
**Domain:** Tauri v2 desktop wrapper over existing Vite/React SPA
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Keep the API key in `localStorage` on both web and desktop (existing `src/hooks/useKeyStorage.ts` path, unchanged). No OS-keychain this phase.
- **D-02:** Strict, shared CSP applied to BOTH the desktop (`tauri.conf.json`) and the web build (`index.html` meta tag). Baseline: `default-src 'self'`; `connect-src 'self' https://openrouter.ai` (plus Tauri IPC sources on desktop — researcher to confirm exact string).
- **D-03:** Keep the AI SDK's default browser fetch unchanged on desktop. OpenRouter is CORS-friendly; no Tauri HTTP-plugin transport needed.
- **D-04:** Build and verify the macOS target only for v1. Windows/Linux deferred.
- **D-05:** Verify cross-target parity via manual UAT — run the same acceptance flow (builder → flags → library save/reload → AI suggest) on both the web build and the desktop app.

### Claude's Discretion
- Tauri scaffold approach (`create-tauri-app` vs adding `@tauri-apps/cli` to existing project)
- `tauri.conf.json` specifics: identifier, product name, window size/title, icons, build wiring
- Dev vs production CSP — dev-server may need looser or different policy
- IndexedDB durability confirmation inside macOS WKWebView

### Deferred Ideas (OUT OF SCOPE)
- OS-keychain / Stronghold key hardening
- Tauri HTTP-plugin transport / CORS bypass
- Windows / Linux build targets
- Code signing, notarization, auto-updater
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLT-01 | The app runs as a web app and as a desktop app from a single codebase | Tauri wraps the existing `dist/` with no frontend forking; confirmed approach in Standard Stack section |
| PLT-02 | Local persistence works identically on web and desktop behind one storage abstraction | Dexie/IndexedDB runs unchanged in WKWebView; IndexedDB persists across app restarts per Tauri maintainer confirmation |
</phase_requirements>

---

## Summary

Phase 5 is a wiring exercise: add Tauri 2 as a wrapper around the existing Vite SPA build. The `src/` frontend is untouched; Tauri points its webview at the `dist/` output (production) or `http://localhost:5173` (dev). The storage adapter (Dexie/IndexedDB), localStorage key path, and OpenRouter browser-fetch transport all run inside the WKWebView without modification — these seams were built in Phases 1–4 precisely for this moment.

The two primary work items are: (1) scaffolding `src-tauri/` and wiring `tauri.conf.json` to the existing Vite build, and (2) setting the strict CSP in `tauri.conf.json` that covers both the Tauri IPC bus and the OpenRouter external origin. Everything else — capability permissions, IndexedDB durability, API key path — requires no new code.

**Primary recommendation:** Use `npm install -D @tauri-apps/cli` + `npx tauri init` to add Tauri to the existing project (not `create-tauri-app`, which scaffolds a new frontend and would fork the codebase). Point `frontendDist` at `../dist` and `devUrl` at `http://localhost:5173`. Apply the production CSP via `tauri.conf.json`, with `ipc: http://ipc.localhost` added to `connect-src` alongside `https://openrouter.ai`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Desktop window / app lifecycle | Tauri Rust core (`src-tauri/`) | — | Tauri owns the native window, title, size, and app bundle |
| UI rendering / all features | Browser (WKWebView) | — | The entire React SPA runs unchanged inside the webview; no Tauri Rust commands needed |
| IndexedDB / Dexie persistence | Browser (WKWebView) | — | `window.indexedDB` is the same API inside WKWebView; `dexieAdapter` is untouched |
| localStorage key storage | Browser (WKWebView) | — | `localStorage` is available inside WKWebView; `useKeyStorage.ts` is untouched |
| OpenRouter fetch calls | Browser (WKWebView) | — | Browser-fetch CORS is honoured by OpenRouter; Tauri HTTP plugin not used (D-03) |
| CSP enforcement (production) | Tauri config (`tauri.conf.json`) | `index.html` meta tag (web build) | Tauri injects its CSP at build time; web build uses the meta tag; both must align |
| CSP enforcement (dev) | `index.html` meta tag | — | Dev mode loads from Vite dev server; `tauri.conf.json` CSP is only injected in production |
| App icons / bundle metadata | Tauri config / `src-tauri/icons/` | — | Icon generation, identifier, productName live entirely in `src-tauri/` |

---

## Standard Stack

### Core (new additions this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/cli` | 2.11.4 | Dev CLI: `tauri init`, `tauri dev`, `tauri build` | The Tauri build toolchain; required devDep for any Tauri project |
| `@tauri-apps/api` | 2.11.1 | JS runtime bindings (window, event, IPC) | Standard Tauri runtime API; required even if no custom IPC commands are used |

[VERIFIED: npm registry] — both packages confirmed via `npm view` returning `dist-tags.latest`; created 2021-04-13; published by `GitHub Actions <npm-oidc-no-reply@github.com>` (official Tauri GitHub Actions publisher). slopcheck: both `[OK]`.

### No New Supporting Libraries

All supporting libraries for this phase are already installed: Dexie 4.4.4, Zustand 5.0.14, `@openrouter/ai-sdk-provider`, `ai`. No additional npm dependencies are needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npx tauri init` on existing project | `create-tauri-app` | `create-tauri-app` scaffolds a NEW frontend (forks the codebase) — wrong for this phase. `tauri init` adds only `src-tauri/` alongside the existing `src/`. |
| Tauri HTTP plugin for fetch | Browser fetch (current) | HTTP plugin bypasses CORS but is an unnecessary Rust dep; OpenRouter is CORS-friendly (confirmed Phase 4 D-01). |

**Installation (net-new packages only):**
```bash
npm install -D @tauri-apps/cli@^2.11.4
npm install @tauri-apps/api@^2.11.1
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@tauri-apps/cli` | npm | ~5 yrs (2021-04-13) | High (official Tauri CLI) | github.com/tauri-apps/tauri | [OK] | Approved |
| `@tauri-apps/api` | npm | ~5 yrs (2021-04-13) | High (official Tauri JS API) | github.com/tauri-apps/tauri | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No postinstall scripts found on either package. Both are published via GitHub Actions OIDC from the official `tauri-apps` org.

---

## Architecture Patterns

### System Architecture Diagram

```
User
  │
  ▼
macOS .app bundle
  │
  ├─► Tauri Rust core (src-tauri/src/lib.rs)
  │     • Creates native window (WKWebView)
  │     • No custom commands (zero IPC surface)
  │     • Reads tauri.conf.json for window config + CSP
  │
  └─► WKWebView (the existing React SPA)
        │
        ├─► Vite dist/ assets (tauri://localhost/*)
        │     • All UI: builder, flags, library, AI palettes
        │     • Zustand state, Zod schemas
        │
        ├─► IndexedDB (Dexie)  ──── persists to macOS app container
        │     • mj-prompt-library database
        │     • StorageAdapter (adapter.ts) UNCHANGED
        │
        ├─► localStorage        ──── persists to macOS app container
        │     • mj-ph-api-key
        │     • useKeyStorage.ts UNCHANGED
        │
        └─► fetch → https://openrouter.ai
              • generateObject over browser fetch
              • openrouter.ts UNCHANGED
```

### Recommended Project Structure After Phase 5

```
/
├── src/                    # React SPA — UNCHANGED (no desktop branching)
├── dist/                   # Vite build output — Tauri wraps this
├── src-tauri/              # NEW: Tauri Rust project
│   ├── Cargo.toml          # Rust manifest
│   ├── Cargo.lock          # Rust lock file
│   ├── build.rs            # tauri_build::build()
│   ├── tauri.conf.json     # Tauri config (window, CSP, build wiring)
│   ├── src/
│   │   ├── main.rs         # Desktop entry point — calls app_lib::run()
│   │   └── lib.rs          # App logic (nearly empty; no custom commands)
│   ├── icons/              # App icons (generated by `tauri icon`)
│   │   ├── icon.icns       # macOS icon
│   │   ├── icon.ico        # Windows icon (generated but not bundled)
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   └── 128x128@2x.png
│   └── capabilities/
│       └── default.json    # Default capabilities (no custom permissions needed)
├── index.html              # Web build CSP (meta tag) — aligns with tauri.conf.json
├── vite.config.ts          # Extended: server.strictPort, watch ignored, TAURI_ENV_* prefix
└── package.json            # New "tauri" script added
```

---

## Pattern 1: Adding Tauri to an Existing Vite Project

**What:** Run `tauri init` (not `create-tauri-app`) to generate `src-tauri/` alongside the existing `src/`. Answer the init prompts with the project-specific values.

**When to use:** Any time you have an existing Vite project and want to add a desktop wrapper without forking the frontend.

**Exact commands:**
```bash
# 1. Install CLI + runtime API
npm install -D @tauri-apps/cli@^2.11.4
npm install @tauri-apps/api@^2.11.1

# 2. Scaffold src-tauri/
npx tauri init
# Prompts and answers:
#   App name: Midjourney Prompt Helper
#   Window title: Midjourney Prompt Helper
#   Web assets location (relative to src-tauri/): ../dist
#   URL of dev server: http://localhost:5173
#   Frontend dev command: npm run dev
#   Frontend build command: npm run build

# 3. Generate app icons from a 1024x1024 source PNG
npx tauri icon path/to/icon-1024.png
```
[CITED: https://v2.tauri.app/start/create-project/]
[CITED: https://v2.tauri.app/start/frontend/vite/]

---

## Pattern 2: `tauri.conf.json` for This Project

**What:** The complete v2 config skeleton correctly wired to the existing Vite setup, with the D-02 CSP.

**Key v2 schema changes from v1 (for historical awareness):**
- `build.distDir` → `build.frontendDist`
- `build.devPath` → `build.devUrl`
- `tauri.*` section → `app.*` section

**Concrete `tauri.conf.json` for this project:**
```json
{
  "productName": "Midjourney Prompt Helper",
  "version": "0.1.0",
  "identifier": "app.mjprompthelper",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Midjourney Prompt Helper",
        "width": 1440,
        "height": 900,
        "resizable": true
      }
    ],
    "security": {
      "csp": {
        "default-src": "'self' customprotocol: asset:",
        "connect-src": "ipc: http://ipc.localhost https://openrouter.ai",
        "script-src": "'self' 'unsafe-inline'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' asset: http://asset.localhost data: blob:"
      }
    }
  },
  "bundle": {
    "active": true,
    "targets": "default",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```
[CITED: https://v2.tauri.app/reference/config/]
[CITED: https://v2.tauri.app/start/frontend/vite/]

---

## Pattern 3: CSP Analysis for D-02

**Production CSP (tauri.conf.json `app.security.csp`):**

The CSP object above is the correct production desktop CSP. Key rationale per directive:

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self' customprotocol: asset:` | Covers Tauri's custom protocol sources for local assets |
| `connect-src` | `ipc: http://ipc.localhost https://openrouter.ai` | `ipc:` + `http://ipc.localhost` = Tauri's IPC bus (required even with no custom commands); `https://openrouter.ai` = AI calls |
| `script-src` | `'self' 'unsafe-inline'` | Matches web build CSP; React + Vite SPA requires `'unsafe-inline'` |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind v4 / shadcn inline styles |
| `img-src` | `'self' asset: http://asset.localhost data: blob:` | Adds Tauri asset protocol sources to the web build's `data: blob:` |

Tauri automatically appends its nonces/hashes to bundled code at compile time — no manual nonce management needed. [CITED: https://v2.tauri.app/security/csp/]

**Web build CSP (`index.html` meta tag — already in place):**
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; connect-src 'self' https://openrouter.ai;
           script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
           img-src 'self' data: blob:">
```
This is already correct in `index.html` (confirmed by reading the file). No changes needed for the web CSP. [VERIFIED: codebase grep — confirmed in both `index.html` and `dist/index.html`]

**Dev mode CSP:** In `tauri dev` mode, the webview loads from `http://localhost:5173` (the Vite dev server). The `tauri.conf.json` CSP is **only injected into production builds** (compiled Rust build). During dev, the `index.html` meta tag CSP applies. The existing meta tag does NOT include `ipc: http://ipc.localhost` — this is acceptable because IPC is not used from JS in this app. If Tauri needs its IPC in dev mode for internal use, it bypasses the meta tag CSP via native WebView hooks. No dev-mode CSP relaxation is needed. [ASSUMED — Tauri internal IPC bypass in dev mode not explicitly documented; LOW risk since app has no custom commands]

---

## Pattern 4: vite.config.ts Changes for Tauri

**What:** Three additions to the existing `vite.config.ts` to make it Tauri-compatible.

**Why:** `strictPort` ensures `devUrl: http://localhost:5173` is always valid; `watch.ignored` prevents Tauri Rust recompile from triggering Vite HMR; `clearScreen: false` keeps Tauri's build logs visible; `TAURI_ENV_*` env prefix exposes Tauri build environment to the frontend; `build.target` targets the correct JS engine per platform.

```typescript
// Source: https://v2.tauri.app/start/frontend/vite/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // --- Tauri additions below ---
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // macOS uses Safari/WebKit; target safari13 for WKWebView compatibility
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
```

---

## Pattern 5: package.json Script Addition

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "preview": "vite preview",
  "tauri": "tauri"
}
```

Usage: `npm run tauri dev` (starts Vite dev server + Tauri window), `npm run tauri build` (builds `.app` bundle for macOS).

---

## Pattern 6: Minimal `src/lib.rs` (No Custom Commands)

Since this app uses no Tauri Rust commands, `lib.rs` is minimal:

```rust
// Source: tauri init scaffold (standard minimal template)
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

The webview does everything via browser APIs. Zero additional Rust code is needed.

---

## Anti-Patterns to Avoid

- **Using `create-tauri-app`:** Creates a fresh frontend scaffold — forks and duplicates the existing `src/`. Use `tauri init` on the existing project instead.
- **Branching `src/` code for desktop vs web:** If any file under `src/` gains `if (isTauri())` checks, that is a red flag. The seams (StorageAdapter, useKeyStorage, openrouter.ts) were built so no branching is needed.
- **Adding Tauri plugins not needed:** `tauri-plugin-fs`, `tauri-plugin-http`, `tauri-plugin-stronghold` are all deferred. Introducing them now widens the attack surface with no benefit.
- **Omitting `ipc: http://ipc.localhost` from connect-src:** Without these, Tauri's internal IPC bus is blocked by the CSP, breaking the webview. This is required even when no custom Rust commands are defined.
- **Using v1 config key names:** `distDir` (use `frontendDist`), `devPath` (use `devUrl`), `tauri.windows` (use `app.windows`). The v2 schema is a breaking change from v1.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Desktop window management | Custom native code | `tauri.conf.json` `app.windows` | Tauri handles window creation, sizing, and title |
| Icon generation (all sizes/formats) | Manually resize PNGs | `npx tauri icon <source.png>` | Generates all required icon formats from one 1024x1024 source |
| CORS bypass for external fetch on desktop | Tauri HTTP plugin + Rust proxy | Browser fetch (unchanged) | OpenRouter allows browser origins; zero new code |
| App bundle / `.app` packaging | Custom packaging scripts | `npm run tauri build` | Tauri handles the full macOS `.app` bundle |

**Key insight:** The entire value of the Tauri wrapper is that all these concerns are handled by configuration, not code. Resist any urge to write Rust.

---

## Common Pitfalls

### Pitfall 1: Forgetting `ipc: http://ipc.localhost` in `connect-src`

**What goes wrong:** The webview fails to load or shows a blank white screen; browser console shows CSP violation for `ipc:` or `http://ipc.localhost`.
**Why it happens:** Tauri's IPC uses a custom protocol that must be explicitly allowed in `connect-src`. The web build CSP doesn't include it (correctly — it's desktop-only), so it's easy to copy the web CSP verbatim to `tauri.conf.json` and forget the IPC entries.
**How to avoid:** Use the CSP object format in `tauri.conf.json` (separate keys per directive) rather than a flat string; easier to diff against the `index.html` meta tag and spot the delta.
**Warning signs:** Blank webview on first `tauri dev` run; CSP violation errors in the Tauri dev console.

### Pitfall 2: Port Mismatch Between `devUrl` and Vite's Actual Port

**What goes wrong:** `tauri dev` opens a window showing "This site can't be reached" or a Tauri error screen.
**Why it happens:** If Vite's port is taken (another dev server running), Vite picks a random port. `devUrl` is hardcoded to 5173. The window loads a dead URL.
**How to avoid:** Add `server.strictPort: true` to `vite.config.ts` — Vite will error instead of silently shifting ports, making the mismatch obvious.
**Warning signs:** `tauri dev` shows connection refused; Vite console says "Port 5173 is in use, trying another port."

### Pitfall 3: `src-tauri/` Triggering Vite HMR Loop

**What goes wrong:** The Rust compiler output files in `src-tauri/target/` cause Vite to detect changes and HMR-reload constantly during `tauri dev`.
**Why it happens:** Vite watches the whole project directory by default; `src-tauri/target/` contains many generated files that change during the Rust build.
**How to avoid:** Add `server.watch.ignored: ['**/src-tauri/**']` to `vite.config.ts`.
**Warning signs:** Constant "page reloading" during Rust compilation in `tauri dev`.

### Pitfall 4: Icon Files Missing at Build Time

**What goes wrong:** `tauri build` fails with "icon not found" or similar bundle error.
**Why it happens:** `tauri init` creates `src-tauri/icons/` with placeholder icon PNGs, but `bundle.icon` in `tauri.conf.json` references specific filenames. If `tauri icon` was not run or run with a wrong-size source, the icons are missing or wrong format.
**How to avoid:** Run `npx tauri icon <source-1024x1024.png>` before the first `tauri build`. The `src-tauri/icons/` directory must contain all files listed in `bundle.icon`.
**Warning signs:** `tauri build` error mentioning "icon" or "bundle"; missing `.icns` file.

### Pitfall 5: IndexedDB Database Name Collision (Non-Issue — Documented for Clarity)

**What goes worried about:** "Will the desktop app and a Chrome tab share the same IndexedDB?" No — IndexedDB is origin-scoped. In the Tauri production build, the webview runs under `tauri://localhost` (a separate origin from `http://localhost:5173`). The two origins have separate IndexedDB stores. **A user who saves prompts in the web build will NOT see them in the desktop app.** This is expected behavior: the two targets are independent local stores.
**Why this matters:** If a user runs both targets, library entries do not auto-sync. The JSON export/import (LIB-05, already shipped) is the migration path. This is NOT a bug but should be mentioned in the UAT so the tester uses each target independently.
**Warning signs:** None — it is working correctly. The tester should populate each target's library independently during D-05 UAT.

### Pitfall 6: `'unsafe-inline'` in CSP and Tailwind/React

**What goes wrong:** Removing `'unsafe-inline'` from `script-src` or `style-src` breaks the app in the Tauri webview.
**Why it happens:** Vite's React production build may produce `<script>` inline content; Tailwind v4 uses inline styles in some patterns. Tauri appends nonces to bundled scripts automatically, but the meta tag on `index.html` must match.
**How to avoid:** Keep `'unsafe-inline'` in both `script-src` and `style-src` for v1. This matches the already-working web build CSP. Hardening (removing `'unsafe-inline'` via nonces) is a separate future pass.

---

## Runtime State Inventory

Not applicable. This phase adds new files (`src-tauri/`) and modifies config files (`vite.config.ts`, `package.json`). There is no rename, rebrand, or data migration. Existing runtime state (IndexedDB `mj-prompt-library`, `localStorage` key `mj-ph-api-key`) is preserved unchanged.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `cargo` / Rust toolchain | `tauri build` Rust compilation | ✓ | cargo 1.96.0, rustc 1.96.0 | — |
| Xcode / CLT (macOS) | macOS `.app` bundle linking | ✓ | Xcode 26.3, Build 17C529 | — |
| `@tauri-apps/cli` | `npx tauri dev` / `tauri build` | ✓ (in package.json ^2.11.4) | 2.11.4 | — |
| `@tauri-apps/api` | Tauri JS runtime bindings | ✓ (in package.json ^2.11.1) | 2.11.1 | — |
| Source icon PNG (1024×1024) | `npx tauri icon` icon generation | ✗ (not present) | — | Create or provide a 1024×1024 PNG; `tauri icon` generates all required sizes |

**Missing dependencies with no fallback:**
- Source 1024×1024 icon PNG (needed before `tauri build`) — planner must include an icon creation/provision task

**Missing dependencies with fallback:**
- `@tauri-apps/cli` and `@tauri-apps/api` — install in Wave 0

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (already installed) |
| Config file | `vite.config.ts` (vitest configured inline — no separate file observed) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLT-01 | Same codebase builds both web app and desktop app | Build smoke | `npm run build` succeeds (web); `npm run tauri build` succeeds (desktop) | ❌ Wave 0 — these are shell commands, not unit tests |
| PLT-01 | No desktop-specific branches in `src/` | Static grep | `grep -r "isTauri\|__TAURI__" src/` returns empty | ❌ Wave 0 — inline build task verification |
| PLT-02 | Library persists across desktop app restarts | Manual UAT | Save prompt, quit `.app`, reopen, verify library entry present | Manual only |
| PLT-02 | `StorageAdapter` interface unchanged | Unit (existing) | `npx vitest run` (existing adapter tests) | ✅ Existing |
| SC#1 | Desktop app launches as native macOS app | Manual UAT | Open `src-tauri/target/release/bundle/macos/*.app`, verify window appears | Manual only |
| SC#2 | All features work identically on desktop | Manual UAT | D-05 parity script: builder → flags → library save/reload → AI suggest | Manual only |
| SC#3 | Parity of saved library across targets | Manual UAT | Save on web, verify same adapter interface; save on desktop, verify persists across restarts | Manual only |
| D-02 | CSP in `tauri.conf.json` includes `ipc:` and `https://openrouter.ai` | Config check | `grep "ipc:" src-tauri/tauri.conf.json` | ❌ Wave 0 — verify after tauri init |
| D-02 | CSP in `index.html` includes `https://openrouter.ai` | Config check | `grep "openrouter.ai" index.html` | ✅ Already present |

### D-05 Manual UAT Parity Checklist

The primary validation artifact for Phase 5 is a manual UAT run on BOTH targets:

**Web target** (`npm run preview` or `npm run dev`):
- [ ] Intent input accepts text
- [ ] AI suggest button triggers palette population (requires valid OpenRouter key)
- [ ] Palette chips clickable; appear in builder
- [ ] Flag controls (AR, version, stylize, etc.) work
- [ ] Save prompt to library; verify it appears in library list
- [ ] Reload page; verify library entry persists
- [ ] Reload a saved prompt; verify builder state restored (intent, chips, flags)
- [ ] Copy prompt to clipboard

**Desktop target** (launch `src-tauri/target/release/bundle/macos/*.app`):
- [ ] App window opens (correct title: "Midjourney Prompt Helper")
- [ ] All items from web UAT above pass identically
- [ ] Quit app; reopen; verify library entry still present (cross-restart persistence)
- [ ] AI suggest works (OpenRouter browser fetch passes through WKWebView)
- [ ] No CSP errors in macOS system console

### Sampling Rate

- **Per task commit:** `npx vitest run` (existing unit tests must stay green — no regressions to `src/`)
- **Per wave merge:** `npm run build` (web build must succeed before `tauri build`)
- **Phase gate:** Full D-05 manual UAT on both targets before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src-tauri/` directory (generated by `npx tauri init`) — covers PLT-01 scaffold
- [ ] `src-tauri/icons/` populated (generated by `npx tauri icon`) — covers `tauri build` icon requirement
- [ ] `npm run tauri` script in `package.json` — covers PLT-01 build invocation
- [ ] `vite.config.ts` Tauri additions (strictPort, watch.ignored, envPrefix, build.target) — covers Pitfall 2/3
- [ ] `tauri.conf.json` CSP validated — covers D-02

*(If no existing unit tests are broken by this phase, no new unit test files are required — all new behavior is verified by the build pipeline and manual UAT.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this app |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user local app |
| V5 Input Validation | Yes (inherited) | Zod schemas on LLM output (already in Phase 4); no new input surfaces |
| V6 Cryptography | No | No crypto operations this phase (OS-keychain deferred) |
| V1 Architecture (CSP) | Yes | D-02: strict CSP in both `tauri.conf.json` and `index.html` meta tag |

### Known Threat Patterns for Tauri + BYO-Key

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS reads `localStorage` API key | Information Disclosure | Strict CSP (`script-src 'self' 'unsafe-inline'`); no `dangerouslySetInnerHTML`; treat all LLM output as untrusted text (inherited from Phase 4) |
| Malicious script loaded via relaxed `connect-src` | Tampering | `connect-src` limited to `ipc: http://ipc.localhost https://openrouter.ai`; no wildcard |
| Tauri capability over-grant | Elevation of Privilege | Deny-by-default: no Tauri plugins installed, default capabilities only. Zero IPC surface from JS. |
| LLM-injected prompt in palette label triggers XSS | Tampering | All palette option labels pass through `sanitize()` chokepoint (Phase 1 D-08, inherited) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ipc: http://ipc.localhost` in `connect-src` is required in production even when no custom Tauri commands are defined | Pattern 2, Pitfall 1 | If wrong: app works without it (low risk). If right and omitted: blank webview in production. Safe to include. |
| A2 | `tauri.conf.json` CSP is not injected during `tauri dev` (dev loads from Vite dev server, meta tag applies) | Pattern 3 (dev mode) | If wrong: CSP enforcement may differ in dev vs prod, potentially masking issues. Recommend testing CSP compliance on the production build, not just dev. |
| A3 | The two IndexedDB origins (`http://localhost:5173` dev / `tauri://localhost` prod) are separate; web and desktop library stores do not share data | Pitfall 5 | If wrong: data might bleed between origins (would be a Tauri behavior change). Low risk — confirmed by browser origin isolation; document in UAT. |

---

## Open Questions

1. **Icon source asset**
   - What we know: `tauri icon` requires a 1024×1024 PNG source. The `src-tauri/icons/` placeholder from `tauri init` is generic.
   - What's unclear: Does this project have a designed icon, or should the planner include a task to create a minimal placeholder?
   - Recommendation: Plan an "icon creation" task — even a simple colored square PNG suffices to unblock `tauri build`. A designed icon can be swapped in later.

2. **App identifier**
   - What we know: `tauri.conf.json` requires a unique reverse-domain `identifier` (e.g., `app.mjprompthelper`).
   - What's unclear: No CLAUDE.md or PROJECT.md specifies an identifier. The example above uses `app.mjprompthelper`.
   - Recommendation: Planner picks the identifier; `app.mjprompthelper` is a reasonable default. This only matters for production code signing (deferred).

3. **Window dimensions**
   - What we know: The app is a two-pane SPA; 1440×900 is a common desktop target.
   - What's unclear: No CLAUDE.md spec for window size.
   - Recommendation: Default to `width: 1440, height: 900, resizable: true`. User can resize.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 `build.distDir` | Tauri v2 `build.frontendDist` | Tauri v2 (2024) | Key rename — v1 docs will mislead |
| Tauri v1 `build.devPath` | Tauri v2 `build.devUrl` | Tauri v2 (2024) | Key rename |
| Tauri v1 `tauri.windows` | Tauri v2 `app.windows` | Tauri v2 (2024) | Top-level section reorganized |
| Tauri v1 `allowlist.*` | Tauri v2 capabilities in `src-tauri/capabilities/*.json` | Tauri v2 (2024) | Permission model redesigned; v1 allowlist docs are obsolete |
| `TAURI_*` env prefix (v1) | `TAURI_ENV_*` env prefix (v2) | Tauri v2 (2024) | Vite `envPrefix` must include `TAURI_ENV_*` |

**Deprecated/outdated:**
- Any blog post or tutorial referencing `tauri.conf.json` with a `tauri.windows` or `build.distDir` key is a v1 guide — do not follow.
- `tauri-apps/create-tauri-app` templates referencing `@tauri-apps/cli@^1` are outdated.

---

## Sources

### Primary (HIGH confidence)
- [Tauri v2 official docs — Create Project / Add to existing](https://v2.tauri.app/start/create-project/) — scaffold approach, `tauri init` command
- [Tauri v2 Vite integration guide](https://v2.tauri.app/start/frontend/vite/) — exact `tauri.conf.json` build block, `vite.config.ts` additions, package.json script
- [Tauri v2 Reference Config](https://v2.tauri.app/reference/config/) — complete v2 schema, all key names and types
- [Tauri v2 CSP docs](https://v2.tauri.app/security/csp/) — CSP object format, `ipc: http://ipc.localhost`, nonce auto-injection
- [Tauri v2 Capabilities docs](https://v2.tauri.app/security/capabilities/) — deny-by-default posture, default capabilities
- [Tauri v2 Project Structure](https://v2.tauri.app/start/project-structure/) — `src-tauri/` directory layout and file purposes
- npm registry — `@tauri-apps/cli@2.11.4`, `@tauri-apps/api@2.11.1` confirmed via `npm view`
- Codebase — `index.html`, `vite.config.ts`, `package.json`, `src/persistence/adapter.ts`, `src/persistence/db.ts`, `src/hooks/useKeyStorage.ts`, `src/domain/ai/openrouter.ts` all read directly

### Secondary (MEDIUM confidence)
- [Tauri GitHub Discussion #6360 — Persistent IndexedDB](https://github.com/tauri-apps/tauri/discussions/6360) — maintainer confirmation that IndexedDB persists across restarts; macOS-specific behavior not confirmed but inference is sound given WKWebView data storage semantics

### Tertiary (LOW confidence)
- Web search results on Tauri WKWebView + IndexedDB — general ecosystem confirmation that IndexedDB works in Tauri webview; no macOS-specific `navigator.storage.persist()` behavior documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified, slopcheck [OK], official docs cited
- Architecture: HIGH — wiring exercise with no novel patterns; confirmed by reading all integration seams
- Tauri config: HIGH — verified against official v2 docs with exact keys
- CSP: MEDIUM — `ipc: http://ipc.localhost` confirmed from official example; dev-mode CSP behavior inferred
- Pitfalls: HIGH — three of six pitfalls derived from official docs; three from common Tauri community patterns
- IndexedDB durability: MEDIUM — Tauri maintainer confirmation exists but macOS-specific behavior not isolated

**Research date:** 2026-07-02
**Valid until:** 2026-09-01 (Tauri 2.x is stable; config schema unlikely to change at patch level)
