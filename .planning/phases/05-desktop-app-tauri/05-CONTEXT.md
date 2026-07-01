# Phase 5: Desktop App (Tauri) - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Wrap the existing Vite `dist/` in Tauri 2 so the **same web codebase** ships a native desktop app at **full feature parity** (builder, flags, library, AI). This is a **wiring exercise over adapter seams already built, not a rewrite** — the `StorageAdapter` (Dexie/IndexedDB) runs unchanged in the Tauri webview, and OpenRouter (CORS-friendly) works with the existing browser transport. Delivers PLT-01 (one codebase → web + desktop) and PLT-02 (local persistence identical on both targets behind one storage abstraction).

**In scope:** Tauri 2.11 scaffold wrapping the current `dist/`; native macOS build launchable as a desktop app; feature parity for builder/flags/library/AI; library persistence verified identical web-vs-desktop behind the existing `StorageAdapter`; strict CSP in `tauri.conf.json` (and applied to the web build).

**Out of scope (deferred / other phases):** OS-keychain / Stronghold key hardening; Tauri HTTP-plugin transport / CORS bypass (only needed for future direct-vendor adapters, PROV-01 v2); Windows/Linux build targets; code signing, notarization, auto-updater.

</domain>

<decisions>
## Implementation Decisions

### Desktop Key Storage (PLT-02 adjacent, security)
- **D-01:** **Keep the API key in `localStorage` on both web and desktop** (existing `src/hooks/useKeyStorage.ts` path, unchanged). Same code both targets = true wiring exercise. CLAUDE.md marks OS-keychain as *recommended hardening*, not required; no success criterion demands it, and XSS is controlled via the strict CSP (D-02). OS-keychain / Stronghold stays a deferred hardening item.

### CSP Posture (hard security requirement)
- **D-02:** **Strict, shared CSP applied to BOTH the desktop (`tauri.conf.json`) and the web build.** Baseline: `default-src 'self'`; `connect-src 'self' https://openrouter.ai` (the only outbound origin — OpenRouter). One policy to maintain, satisfies CLAUDE.md's hard CSP requirement for both targets. Planner/researcher confirms the exact `connect-src` origins OpenRouter needs and any Vite/Tauri dev-server CSP relaxations required only in dev.

### Provider Transport
- **D-03:** **Keep the AI SDK's default browser fetch unchanged on desktop.** OpenRouter is CORS-friendly (Phase 4 D-01), so `generateObject` works as-is inside the Tauri webview. Zero new transport code, full parity. Tauri HTTP-plugin routing only pays off for future direct-vendor adapters (PROV-01, v2) — premature here.

### Build Targets & Parity Verification (SC #1/#2/#3)
- **D-04:** **Build and verify the macOS target for v1** (the dev platform). Windows/Linux builds deferred.
- **D-05:** **Verify cross-target parity via manual UAT** — run the same acceptance flow (builder → flags → library save/reload → AI suggest) on both the web build and the desktop app, confirming identical behavior and that the saved library persists locally on desktop behind the same `StorageAdapter`. Signing/notarization/auto-updater are deferred release-engineering, not part of this phase.

### Claude's Discretion (deferred to research/planning)
- **Tauri scaffold approach** — `create-tauri-app` vs adding `@tauri-apps/cli` to the existing Vite project and pointing it at the current `dist/`/dev server. Planner's call; must not fork or duplicate the frontend.
- **`tauri.conf.json` specifics** — app identifier, product name, window size/title, icons, `beforeDevCommand`/`beforeBuildCommand`/`devUrl`/`frontendDist` wiring to the existing Vite build. Standard Tauri config; planner fills in.
- **Dev vs build CSP** — whether the Vite dev server needs a looser CSP than the production strict policy (D-02); apply strict in production regardless.
- **IndexedDB durability on desktop** — PLT-03 (`navigator.storage.persist()`) already shipped; confirm it behaves in the Tauri webview during UAT, no new work expected.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 5: Desktop App (Tauri)" — goal (wiring exercise, full parity), 3 success criteria, requirements PLT-01/PLT-02, depends on Phase 3 + Phase 4.
- `.planning/REQUIREMENTS.md` §"Platform" (PLT-01, PLT-02; PLT-03 already shipped) — exact requirement text; §"Out of Scope" to keep bounded.
- `.planning/PROJECT.md` — "Web + desktop from one codebase" and local-only key decisions/constraints.

### Tech stack & security (locked — MUST follow)
- `CLAUDE.md` §"Technology Stack" — locks **Tauri 2.11** (`@tauri-apps/api`, `@tauri-apps/cli`) wrapping the same Vite `dist/`; React 19 / Vite 8 combo confirmed compatible.
- `CLAUDE.md` §"Tauri vs Electron — Explicit Decision" — Tauri chosen; capability-based permissions, minimum native surface for a key-holding app.
- `CLAUDE.md` §"Security Implications — API Key Stored Locally" — **hard requirements:** strict CSP (set in `tauri.conf.json` AND for web) — governs D-02; key never leaves device except to the chosen provider; no telemetry. Desktop OS-keychain/Stronghold hardening is *recommended* (basis for deferring D-01).
- `CLAUDE.md` §"Security Implications" (CORS note) — Tauri HTTP plugin can bypass browser CORS, but OpenRouter allows browser origins, so browser fetch suffices (basis for D-03).
- `CLAUDE.md` §"Persistence Strategy" — Dexie/IndexedDB is the single persistence path for both targets; runs unchanged in the Tauri webview (basis for the wiring-exercise framing).

### Phase 3–4 foundations this phase wraps (do NOT reshape)
- `src/persistence/adapter.ts` — the `StorageAdapter` interface (the "same storage abstraction" of PLT-02/SC#3).
- `src/persistence/db.ts` — `dexieAdapter` (Dexie `mj-prompt-library`, v1 schema); runs as-is in the webview.
- `.planning/phases/04-ai-populated-palettes-byo-key/04-CONTEXT.md` — OpenRouter single-provider + CORS rationale (D-01/D-03 upstream), `localStorage` key path, and the explicit deferral of OS-keychain hardening to this phase.
- `src/hooks/useKeyStorage.ts` — current `localStorage` key path kept unchanged (D-01).
- `src/domain/ai/openrouter.ts` — `createOpenRouter` + `generateObject` over browser fetch; transport kept as-is (D-03).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/persistence/{adapter.ts,db.ts}`: the storage seam PLT-02/SC#3 hinge on — Dexie/IndexedDB works in the Tauri webview with no adapter change.
- `src/hooks/useKeyStorage.ts`: `localStorage`-backed key store, reused unchanged on desktop (D-01).
- `src/domain/ai/openrouter.ts`: AI SDK + OpenRouter over browser fetch — no transport rewrite (D-03).
- The whole `dist/` Vite build is the frontend Tauri wraps; nothing in `src/` should fork for desktop.

### Established Patterns
- Single Vite SPA build serves both targets (CLAUDE.md "one build, two targets"). Tauri config points at the existing `dist/` / dev server.
- No Rust/native commands exist yet — this phase introduces the Tauri shell; keep native surface minimal (deny-by-default, no keychain/HTTP plugins per D-01/D-03).

### Integration Points
- Tauri wrapper → existing Vite `dist/` (frontend unchanged).
- Strict CSP set in `tauri.conf.json` **and** the web build config (D-02) — new, must allow `https://openrouter.ai` in `connect-src`.
- Parity check runs the existing acceptance flow against both the web build and the packaged macOS app (D-05).

</code_context>

<specifics>
## Specific Ideas

- Frame this phase to the executor as **wiring, not rewrite**: if a task starts changing `src/` frontend/domain logic to make desktop work, that's a smell — the seams (storage adapter, CORS-friendly provider, `localStorage` key) were built in Phases 1–4 precisely so desktop is a wrapper.
- The single new outbound origin the CSP must permit is `https://openrouter.ai` — nothing else calls out.

</specifics>

<deferred>
## Deferred Ideas

- **OS-keychain / Stronghold key hardening** on desktop — recommended by CLAUDE.md; deferred as a security-hardening pass. Revisit if desktop threat model warrants it.
- **Tauri HTTP-plugin transport / CORS bypass** — only needed for future direct-vendor adapters (PROV-01, v2); not required while OpenRouter is the sole provider.
- **Windows / Linux build targets** — v1 ships macOS; add other targets when there's demand.
- **Code signing, notarization, auto-updater** — release-engineering; deferred beyond this wiring phase.

None of these block Phase 5 — discussion stayed within the wiring scope.

</deferred>

---

*Phase: 5-Desktop App (Tauri)*
*Context gathered: 2026-06-30*
