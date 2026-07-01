# Phase 5: Desktop App (Tauri) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 5-Desktop App (Tauri)
**Areas discussed:** Desktop key storage, CSP posture, Provider transport, Build targets & parity check

---

## Desktop Key Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Keep localStorage | Same code both targets, zero new surface, true wiring exercise. Keychain is recommended hardening not required; SC doesn't demand it. Defer keychain/Stronghold. | ✓ |
| Harden to OS keychain | Tauri keychain/Stronghold on desktop only. More secure at rest, but splits the key path web-vs-desktop and adds Rust plumbing — beyond wiring. | |

**User's choice:** Keep localStorage
**Notes:** XSS controlled via strict CSP (D-02); keychain becomes a deferred hardening item.

---

## CSP Posture

| Option | Description | Selected |
|--------|-------------|----------|
| Strict, shared | `default-src 'self'; connect-src 'self' https://openrouter.ai`, same policy web + desktop. Meets CLAUDE.md hard requirement, one policy. | ✓ |
| Desktop-only strict | Strict CSP in tauri.conf.json only; web CSP later. Faster now, web XSS surface stays unhardened. | |

**User's choice:** Strict, shared
**Notes:** OpenRouter is the only outbound origin the CSP must permit.

---

## Provider Transport

| Option | Description | Selected |
|--------|-------------|----------|
| Keep browser fetch | AI SDK default fetch unchanged; OpenRouter CORS-ok so it works in the webview. Zero new code, full parity. | ✓ |
| Route via Tauri HTTP | Tauri HTTP plugin (Rust-side, bypasses CORS). Only pays off for future direct-vendor adapters (PROV-01, v2) — premature. | |

**User's choice:** Keep browser fetch

---

## Build Targets & Parity Check

| Option | Description | Selected |
|--------|-------------|----------|
| macOS + manual UAT | Build/verify macOS (dev platform); verify parity by running the same UAT on web + desktop. Signing/notarization/updater deferred. | ✓ |
| All 3 OS + CI | Build macOS/Windows/Linux + CI matrix. Broader reach but Windows/Linux need own toolchains/testing — heavier than a v1 wiring phase. | |

**User's choice:** macOS + manual UAT

---

## Claude's Discretion

- Tauri scaffold approach (`create-tauri-app` vs adding `@tauri-apps/cli` to the existing project).
- `tauri.conf.json` specifics (identifier, product name, window, icons, dev/build command wiring).
- Dev vs production CSP relaxation.
- Confirm IndexedDB durability (PLT-03, already shipped) behaves in the Tauri webview during UAT.

## Deferred Ideas

- OS-keychain / Stronghold key hardening (desktop security pass).
- Tauri HTTP-plugin transport / CORS bypass (needed only for direct-vendor adapters, v2).
- Windows / Linux build targets.
- Code signing, notarization, auto-updater (release engineering).
