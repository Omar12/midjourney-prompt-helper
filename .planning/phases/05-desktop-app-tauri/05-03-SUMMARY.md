---
phase: 05-desktop-app-tauri
plan: 03
subsystem: infra
tags: [tauri, vite, build, macos, desktop, checkpoint]

# Dependency graph
requires:
  - phase: 05-desktop-app-tauri
    plan: 02
    provides: Production tauri.conf.json (CSP, window, icons) unblocking `tauri build`
provides:
  - Native macOS .app bundle at src-tauri/target/release/bundle/macos/Midjourney Prompt Helper.app
  - Native macOS .dmg installer at src-tauri/target/release/bundle/dmg/
  - Fixed vite.config.ts build.target (safari15) compatible with `ai` SDK v6 destructuring syntax
  - Fixed tauri.conf.json bundle.targets ("all" instead of invalid "default")
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vite build.target for macOS-only Tauri apps must be safari15+ (not safari13/14) — esbuild 0.28.1 does not implement the destructuring-downlevel transform for safari10-14, only for safari15 and above. Verified empirically via direct esbuild.transform() calls."
    - "Tauri 2.11 tauri.conf.json bundle.targets accepts only \"all\" or an array of target strings (e.g. [\"app\",\"dmg\"]) per the CLI's config.schema.json — \"default\" (used in 05-RESEARCH.md and Plan 02) is not a valid schema value and fails `tauri build` at config-parse time."

key-files:
  created: []
  modified:
    - vite.config.ts
    - src-tauri/tauri.conf.json
    - src-tauri/Cargo.toml
    - dist/index.html
    - dist/assets/* (regenerated build output)

key-decisions:
  - "Raised build.target from safari13 to safari15 (not just safari14) after empirically testing esbuild.transform() across safari10-16: safari10-14 all fail the destructuring-downlevel transform in esbuild 0.28.1, safari15+ succeeds. Since the app is macOS-only (D-04) and safari15 corresponds to macOS Monterey (2021+), this is an acceptable compatibility floor for a locally-run dev build."
  - "Fixed bundle.targets from \"default\" to \"all\" as a Rule 3 blocking-issue fix — the Tauri 2.11 schema rejects \"default\" outright (`config.schema.json` only allows \"all\" or an array of target strings). This value originated in 05-RESEARCH.md and was carried into Plan 02's tauri.conf.json; both were incorrect against the installed Tauri CLI version."

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-07-02
---

# Phase 05 Plan 03: Production macOS Build (Task 1 of 2) Summary

**Fixed two blocking build-config bugs (Vite esbuild target, Tauri bundle.targets schema value) to produce a working native macOS `.app`/`.dmg` bundle; Task 2 (D-05 human UAT parity checkpoint) is now awaiting human verification.**

## Performance

- **Duration:** 12 min (Task 1 only; Task 2 is a blocking human checkpoint, not yet executed)
- **Started:** 2026-07-02T17:17:00Z
- **Completed:** 2026-07-02T17:29:00Z (Task 1)
- **Tasks:** 1 of 2 complete (Task 2 is `checkpoint:human-verify`, gate=blocking)
- **Files modified:** 9 (vite.config.ts, src-tauri/tauri.conf.json, src-tauri/Cargo.toml, dist/index.html, dist/assets/* regenerated, dist/icon-1024.png)

## Accomplishments

- `npm run build` (tsc -b && vite build) exits 0
- `npx vitest run` — 218/218 tests passed, 22 test files
- `npm run tauri build` exits 0 — produced both `.app` and `.dmg` bundles:
  - `src-tauri/target/release/bundle/macos/Midjourney Prompt Helper.app`
  - `src-tauri/target/release/bundle/dmg/Midjourney Prompt Helper_0.1.0_aarch64.dmg`
- `grep -rq "isTauri\|__TAURI__" src/` exits non-zero — src/ confirmed clean of desktop-specific branches (PLT-01 static check satisfied)
- Diagnosed and fixed two build-blocking config bugs (see Deviations below)

## Task Commits

1. **Task 1: Run web build smoke then tauri build to produce the macOS .app** — `f618ae8` (fix)
   - Includes the vite.config.ts and tauri.conf.json fixes required to get the build green, plus regenerated dist/ output and a minor Cargo.toml change auto-applied by cargo during compilation.

## Files Created/Modified

- `vite.config.ts` — `build.target` changed from `safari13` to `safari15` for the non-Windows (macOS) branch
- `src-tauri/tauri.conf.json` — `bundle.targets` changed from `"default"` (invalid) to `"all"` (valid per Tauri 2.11 schema)
- `src-tauri/Cargo.toml` — cargo auto-appended `features = []` to the `tauri-build` and `tauri` dependency entries during the release build (no functional change)
- `dist/index.html`, `dist/assets/*`, `dist/icon-1024.png` — regenerated production build output reflecting the fixed config (dist/ is tracked in this repo)

## Decisions Made

- **Safari target floor is safari15, not safari14.** The plan's preconditions note suggested safari14 might be the fix, but empirical testing (`esbuild.transform()` called directly against safari10 through safari16) showed esbuild 0.28.1 only supports the destructuring-downlevel transform starting at safari15. Since this is a macOS-only desktop target (D-04 scope fence), safari15 (macOS Monterey, released 2021) is a reasonable and low-risk floor for a locally-run, unsigned dev build.
- **bundle.targets "default" → "all".** This value was inherited from 05-RESEARCH.md's Pattern 2 example and carried into Plan 02's production tauri.conf.json, but the installed Tauri CLI (2.11.4) schema (`config.schema.json`) only accepts `"all"` or an array of target strings — `"default"` fails config parsing before any build step runs. This is a Rule 3 blocking-issue fix, not an architectural change: it does not alter which bundle formats are produced beyond what "default" was presumably intended to mean (all platform-appropriate targets for the current host, which on macOS resolves to `.app` + `.dmg`).
- **dist/ build output committed alongside the config fixes.** `dist/` is tracked in this repository (not gitignored) and was already stale/dirty at session start from prior uncommitted work. Since Task 1's `npm run build` regenerates it as a direct, expected consequence of running the build, the fresh output was committed together with the config fix rather than left dirty.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking build issue] Vite build.target safari13/14 could not downlevel destructuring syntax**
- **Found during:** Task 1, `npm run build` smoke step
- **Issue:** `npm run build` failed with ~650 esbuild errors ("Transforming destructuring to the configured target environment... is not supported yet") when `build.target` was `safari13` (as set in Plan 01) and remained broken when tried at `safari14` (as suggested in the plan's preconditions note). The errors were not limited to `ai`-SDK code — they occurred throughout the app's own source (zustand stores, serializers, React components), indicating an esbuild version-specific limitation rather than an `ai`-SDK-specific incompatibility.
- **Fix:** Empirically tested `esbuild.transform()` for a plain destructuring statement across safari10 through safari16 target strings; found safari10-14 all fail and safari15+ succeeds in the installed esbuild 0.28.1. Set `build.target` to `safari15` for the non-Windows branch, with an inline comment documenting the empirical finding.
- **Files modified:** `vite.config.ts`
- **Commit:** `f618ae8`

**2. [Rule 3 - Blocking build issue] tauri.conf.json bundle.targets "default" is not a valid schema value**
- **Found during:** Task 1, `npm run tauri build` step (after the Vite fix)
- **Issue:** `tauri build` failed immediately at config-parsing with: `"tauri.conf.json" error on bundle > targets: "default" is not valid under any of the schemas listed in the 'anyOf' keyword`. This value came from 05-RESEARCH.md's example config and Plan 02's tauri.conf.json — neither had been validated against the actual installed Tauri CLI schema.
- **Fix:** Inspected `node_modules/@tauri-apps/cli/config.schema.json` directly, confirmed the valid values are `"all"` or an array of target strings (e.g. `["app","dmg"]`), and changed `bundle.targets` to `"all"`.
- **Files modified:** `src-tauri/tauri.conf.json`
- **Commit:** `f618ae8`

No architectural changes were made. Both fixes were config-value corrections required to unblock the build, within the plan's stated SCOPE FENCE (vite.config.ts fix was explicitly pre-authorized; the tauri.conf.json fix is a Rule 3 blocking-issue correction of a value that prevented `tauri build` from running at all).

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary changes were introduced. Both fixes are build/tooling configuration corrections.

## Issues Encountered

None beyond the two build-blocking config bugs documented above, both resolved within Task 1.

## User Setup Required

**Task 2 (D-05 UAT parity checkpoint) requires human action before this plan can close.** See the checkpoint details below — the human must run the D-05 UAT flow on both the web target and the newly-built desktop `.app`, including a full quit/reopen cycle to confirm library persistence.

## Next Phase Readiness

- Task 1 (automated build) is fully complete and committed.
- Task 2 is a `checkpoint:human-verify` with `gate="blocking"` — it has NOT been executed or self-approved. It is awaiting explicit human verification per the plan's execution contract (auth/UAT gates cannot be automated).
- Once the human completes the D-05 UAT flow and types "approved" (or reports specific failures), a continuation agent should resume at Task 2, record the outcome, and close out Phase 5 (PLT-01, PLT-02, SC#1-3).

---
*Phase: 05-desktop-app-tauri*
*Completed: Task 1 only — 2026-07-02 (Task 2 pending human verification)*

## Self-Check: PASSED
All claimed files (vite.config.ts, src-tauri/tauri.conf.json, .app bundle at src-tauri/target/release/bundle/macos/Midjourney Prompt Helper.app) confirmed present on disk. Commit f618ae8 confirmed in git log.
