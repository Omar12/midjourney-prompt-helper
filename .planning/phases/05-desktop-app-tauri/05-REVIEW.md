---
phase: 05-desktop-app-tauri
reviewed: 2026-07-02T18:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - vite.config.ts
  - src-tauri/tauri.conf.json
  - src-tauri/capabilities/default.json
  - src-tauri/src/lib.rs
  - src-tauri/src/main.rs
  - src-tauri/build.rs
  - src-tauri/Cargo.toml
  - package.json
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-02T18:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the Tauri desktop wrapper scaffold and config added in Phase 05: `vite.config.ts` build-target changes, `src-tauri/tauri.conf.json` (production CSP, window, bundle config), `src-tauri/capabilities/default.json`, the minimal Rust scaffold (`lib.rs`, `main.rs`, `build.rs`, `Cargo.toml`), and the `package.json` dependency additions.

No secrets, hardcoded credentials, or command-injection-style patterns were found. The `connect-src` CSP directive is correctly scoped to `ipc: http://ipc.localhost https://openrouter.ai` with no wildcard — this is the critical control for this BYO-key app and it is implemented correctly. The Tauri capability file grants only `core:default` with no `fs`/`shell`/`http` allowlisting, which is appropriately least-privilege. The Rust scaffold is intentionally minimal (no custom commands) and contains no issues beyond stock `create-tauri-app` boilerplate.

Two Warnings were found relating to CSP permissiveness that goes beyond what the shipped build appears to need, and one dependency-version note. No Critical issues were found.

## Warnings

### WR-01: `script-src 'unsafe-inline'` weakens the desktop CSP's XSS mitigation beyond what appears necessary

**File:** `src-tauri/tauri.conf.json:25`
**Issue:** CLAUDE.md states aggressive XSS prevention is a "hard requirement" for this app because any XSS can read the locally-stored LLM API key, and calls out "a strict Content-Security-Policy" as the primary control. `script-src` is set to `'self' 'unsafe-inline'`. `'unsafe-inline'` for `script-src` (as opposed to `style-src`) is the more dangerous of the two — it permits execution of inline `<script>` tags and inline event-handler attributes, which is exactly the injection vector a strict CSP is meant to close. The production build output (`dist/index.html`) only loads a single bundled `<script type="module" src="/assets/...">` and contains no inline scripts, so `'unsafe-inline'` in `script-src` does not appear to be required by the shipped build. This value was carried over unchanged from the pre-existing web CSP (`index.html`, added in phase 04-04) into the new desktop CSP in this phase, so it was an opportunity to tighten it that wasn't taken.
**Fix:** Drop `'unsafe-inline'` from `script-src` (test that the production Vite/React build still loads correctly without it — Vite's module script tags do not require it). If some UI library requires inline script for hydration, prefer a hash- or nonce-based CSP source instead of a blanket `'unsafe-inline'`.
```json
"script-src": "'self'"
```

### WR-02: Placeholder crate metadata (`authors`, `license`, `repository`) left empty in `Cargo.toml`

**File:** `src-tauri/Cargo.toml:5-7`
**Issue:** `authors = ["you"]`, `license = ""`, and `repository = ""` are stock `create-tauri-app` placeholders. These values surface in the built app's metadata/installer (e.g., macOS bundle Info.plist, Windows installer properties) and an empty `license` string is unusual for a shippable desktop artifact — it can also trigger warnings from packaging tools that expect a valid SPDX identifier.
**Fix:** Set real values before a distributable build is cut:
```toml
authors = ["Omar Martinez"]
license = "MIT"  # or actual project license
repository = "https://github.com/<org>/midjourney_prompt_helper"
```

## Info

### IN-01: `ai` dependency pinned to v6, while project stack docs specify v7.x

**File:** `package.json:20`
**Issue:** `CLAUDE.md`'s Technology Stack section pins `ai` to `7.0.x` (and all `@ai-sdk/*` packages to the matching major, since "the `ai` core and provider packages are versioned in lockstep"). `package.json` restores `"ai": "^6.0.218"`, a major-version behind the documented target. This was restored in this phase to unblock the build (commit `265cf13`) rather than newly introduced, but it leaves the dependency set inconsistent with the project's own stack documentation and matching-major-version guidance.
**Fix:** Track an explicit follow-up to upgrade `ai` (and any `@ai-sdk/*`/`@openrouter/ai-sdk-provider` version coupling) to the 7.x line documented in CLAUDE.md, or update CLAUDE.md's stack table if v6 is now the intentional target.

### IN-02: `img-src` and `default-src` CSP directives allow both `asset:`/`customprotocol:` schemes without documented justification for `customprotocol:`

**File:** `src-tauri/tauri.conf.json:23`
**Issue:** `default-src` includes `customprotocol:` in addition to `asset:`. The `05-02-SUMMARY.md` decision note documents the `asset:`/`ipc:` additions but does not mention `customprotocol:`. This is a commonly-copied Tauri boilerplate value (used for the deep-link/custom-protocol handler on some platforms) but isn't used by anything in this app (no custom protocol handler is registered anywhere in the Rust scaffold). It's not a security hole by itself, but it's an unused allowlist entry that widens `default-src` without a corresponding feature.
**Fix:** Remove `customprotocol:` from `default-src` unless/until a custom protocol handler is actually registered, keeping the allowlist minimal and self-documenting:
```json
"default-src": "'self' asset:",
```

### IN-03: `bundle.targets: "all"` produces every platform-appropriate installer format with no narrowing to what's actually distributed

**File:** `src-tauri/tauri.conf.json:33`
**Issue:** This is a valid schema value (correctly fixed from the invalid `"default"` in `05-03`), but `"all"` means `tauri build` will produce every bundle format available for the host platform (e.g., on macOS this yields both `.app` and `.dmg`, and would also attempt other formats if run on Linux/Windows hosts). Since D-04 scopes this to a macOS-only, unsigned dev build, an explicit array (e.g., `["app", "dmg"]`) would make the intended output self-documenting and prevent unexpected bundle formats if this config is ever built on a different host OS in CI.
**Fix:**
```json
"targets": ["app", "dmg"],
```

---

_Reviewed: 2026-07-02T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
