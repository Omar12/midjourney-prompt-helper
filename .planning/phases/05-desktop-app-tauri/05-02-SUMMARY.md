---
phase: 05-desktop-app-tauri
plan: 02
subsystem: infra
tags: [tauri, csp, security, icons, desktop]

# Dependency graph
requires:
  - phase: 05-desktop-app-tauri
    plan: 01
    provides: src-tauri/ Tauri 2 scaffold with default tauri.conf.json
provides:
  - Production tauri.conf.json (productName, identifier app.mjprompthelper, build wiring, window 1440x900, D-02 CSP object)
  - Full Tauri icon set (icon.icns, icon.ico, 32x32.png, 128x128.png, 128x128@2x.png) unblocking `tauri build`
affects: [05-03]

# Tech tracking
tech-stack:
  added: []
  patterns: ["tauri.conf.json app.security.csp uses object form (per-directive keys), not a flat CSP string — matches Tauri v2 schema", "Desktop CSP is a strict superset of the web index.html CSP: adds customprotocol:/asset: to default-src, ipc: http://ipc.localhost to connect-src (Tauri IPC bus, required even with zero custom commands), and asset: http://asset.localhost to img-src"]

key-files:
  created:
    - public/icon-1024.png
  modified:
    - src-tauri/tauri.conf.json
    - src-tauri/icons/32x32.png
    - src-tauri/icons/128x128.png
    - src-tauri/icons/128x128@2x.png
    - src-tauri/icons/icon.icns
    - src-tauri/icons/icon.ico

key-decisions:
  - "connect-src limited to exactly 'ipc: http://ipc.localhost https://openrouter.ai' — no wildcard — per T-5-02-01 mitigation, so the locally-stored LLM API key cannot be exfiltrated to an arbitrary origin from the webview"
  - "Placeholder icon is a solid indigo (#6366f1) 1024x1024 square (no text — ImageMagick lacked a resolvable font in this environment); acceptable per plan since exact aesthetics don't matter and `npx tauri icon` is the authoritative generator"

requirements-completed: [PLT-01, PLT-02]

# Metrics
duration: 9min
completed: 2026-07-02
---

# Phase 05 Plan 02: Production tauri.conf.json + Icon Generation Summary

**Replaced the Tauri scaffold config with the Pattern 2 production config (identifier, 1440x900 window, D-02 CSP with the required `ipc:`/`http://ipc.localhost` IPC-bus allowlist) and generated the full desktop icon set from a 1024x1024 placeholder via `npx tauri icon`.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-02T16:58:00Z
- **Completed:** 2026-07-02T17:07:00Z
- **Tasks:** 2
- **Files modified:** 53 (tauri.conf.json, public/icon-1024.png, src-tauri/icons/* including Windows/iOS/Android variants emitted by the `tauri icon` tool)

## Accomplishments
- `src-tauri/tauri.conf.json` replaced with Pattern 2: `productName` "Midjourney Prompt Helper", `identifier` "app.mjprompthelper", `build.frontendDist` "../dist", `build.devUrl` "http://localhost:5173", window 1440x900 resizable, `bundle.targets` "default"
- CSP set to the object form with `connect-src: "ipc: http://ipc.localhost https://openrouter.ai"` — satisfies D-02 and prevents the blank-webview failure mode (Pitfall 1) while keeping the API-key allowlist minimal (no wildcard)
- No Tauri v1 key names present (`distDir`, `devPath`, `tauri.windows` all absent — confirmed via grep)
- `public/icon-1024.png` created as a 1024x1024 solid-color PNG source
- `npx tauri icon public/icon-1024.png` generated all five required icons (`icon.icns`, `icon.ico`, `32x32.png`, `128x128.png`, `128x128@2x.png`) plus additional Windows Store/iOS/Android variants the tool emits by default (harmless, unused by the desktop-only target)

## Task Commits

1. **Task 1: Replace tauri.conf.json with Pattern 2 production config** - `b6a9d8d` (feat)
2. **Task 2: Create placeholder source icon and generate all Tauri icon sizes** - `2d5215b` (feat)

## Files Created/Modified
- `src-tauri/tauri.conf.json` - Production config: identifier, build wiring, window size, D-02 CSP object, bundle.icon array
- `public/icon-1024.png` - 1024x1024 indigo placeholder source PNG for `tauri icon`
- `src-tauri/icons/32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico` - Regenerated from the placeholder (required by `bundle.icon`)
- `src-tauri/icons/64x64.png`, `Square*.png`, `StoreLogo.png`, `icon.png`, `android/*`, `ios/*` - Additional formats `tauri icon` generates by default; not referenced by `bundle.icon` but committed as-is (tool output, not hand-authored)

## Decisions Made
- Kept `connect-src` to exactly the three required sources (no `*`) per the T-5-02-01 threat mitigation — the API key in localStorage must not be reachable from an over-broad CSP allowlist.
- Used a plain solid-color 1024x1024 PNG (no "MJ" text overlay) for the placeholder icon: ImageMagick in this environment could not resolve a system font (`unable to read font`), and the plan explicitly states "the exact aesthetics do not matter — any valid 1024x1024 PNG unblocks `npx tauri icon`." A designed icon can replace this later per the plan's own note.
- Committed the full `tauri icon` output (including Windows/iOS/Android variants) rather than pruning to only the five files in `bundle.icon`, since these are unmodified tool output and pruning would require hand-editing generated assets — out of scope and adds no risk.

## Deviations from Plan

None - plan executed exactly as written. Font resolution issue for the icon text was worked around within the plan's own stated tolerance ("exact aesthetics do not matter").

## Issues Encountered

`npm run build` fails with TypeScript errors (`Cannot find module 'ai'` and `'@openrouter/ai-sdk-provider'`) in `src/domain/ai/adapter.test.ts` and `src/domain/ai/openrouter.ts`/`.test.ts`. This is the same pre-existing Phase 4 dependency gap documented in `05-01-SUMMARY.md` (Vercel AI SDK core package `ai` missing from `node_modules`/`package-lock.json`) — confirmed unrelated to this plan's changes (tauri.conf.json and icons touch none of these files). `npx vitest run` shows the same 3 pre-existing failures / 199 passing tests as in 05-01. Per the SCOPE BOUNDARY rule and the RULE 3 package-install exclusion, this is not auto-fixed here; it remains logged in `.planning/phases/05-desktop-app-tauri/deferred-items.md` from 05-01. This means the plan's verification step 5 (`npm run build exits 0`) does not pass — but for a reason entirely outside this plan's `files_modified` scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src-tauri/tauri.conf.json` is production-correct and `src-tauri/icons/` is fully populated — `npm run tauri build` is unblocked with respect to config/icons.
- The pre-existing `ai` package gap (see Issues Encountered) still blocks a clean `npm run build`/`tsc -b`; this should be resolved (via a scoped `npm install ai` task, subject to the package-legitimacy checkpoint) before or during Plan 05-03 if that plan relies on a successful production build.
- Plan 05-03 can proceed with packaging/build verification, keeping in mind the `ai` dependency gap is a known blocker for `tsc -b`-gated builds.

---
*Phase: 05-desktop-app-tauri*
*Completed: 2026-07-02*

## Self-Check: PASSED
All created/modified files confirmed present; both commit hashes confirmed in git log.
