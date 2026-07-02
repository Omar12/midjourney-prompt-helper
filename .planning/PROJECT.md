# Midjourney Prompt Helper

## What This Is

A Midjourney prompt builder for image creators who want comprehensive, well-structured prompts without memorizing Midjourney's vocabulary and flags. Users describe their intent in plain language; an LLM populates categorized palettes of relevant options (style/medium, lighting, camera & lens, composition, color, mood), and users click to assemble a final prompt — including version-gated Midjourney technical flags. Runs as both a web app and a native desktop app (Tauri), stores everything locally, and keeps a saved library of past prompts with JSON backup.

## Core Value

The user can go from a vague idea to a copyable, complete Midjourney prompt — assembled from AI-suggested options they choose — faster than writing it by hand.

_Still the right priority after v1.0. Shipping confirmed the "AI suggests, user assembles" split is the differentiator; the manual builder underneath it stands on its own even without a key._

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- [x] Hand-build a complete, correctly-formatted prompt (canonical model + deterministic serializer + escape chokepoint + live preview) — *Phase 1 (BLD-01/03/04/05/06/07, ASM-01/02/03)*
- [x] Set Midjourney technical flags (`--ar`/`--v`/`--niji`/`--stylize`/`--chaos`/`--no`/`--seed`) via version-gated, data-driven UI controls rendered into valid syntax — *Phase 2 (FLG-01..05)*
- [x] Save / list / reload full builder state / delete prompts in a local library, plus JSON export/import backup — *Phase 3 (LIB-01..05, PLT-03)*
- [x] Enter intent + own LLM key, trigger explicit AI suggestion filling six categorized palettes behind a provider adapter + schema validation with graceful degradation — *Phase 4 (AI-01..04, BLD-02, KEY-01..04)*
- [x] Run as web app and native desktop app from one codebase, library persisting behind one storage abstraction — *Phase 5 (PLT-01, PLT-02)*

_All 31 v1 requirements validated with code evidence (v1.0 milestone audit, PASSED)._

### Active

<!-- Current scope. Building toward these. Hypotheses until shipped and validated. -->

- (None — v1.0 shipped. Next milestone scope defined via `/gsd:new-milestone`.)

Candidate v2 themes carried from REQUIREMENTS.md (now archived): reference manager (`--sref`/`--cref`/`--oref`), multi-prompt `::` weight editor, per-palette "suggest more", version-aware flag validation/warnings, import an existing prompt string back into builder state, additional LLM provider adapters (Anthropic/OpenAI/Gemini/local).

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. Reasoning re-audited at v1.0; all still valid. -->

- Server-side accounts / cross-device sync — local-only by design; no backend, no user data liability
- Generating images directly (Midjourney/Discord integration) — no public MJ generation API; output is a copyable prompt the user runs themselves
- Hosting/managing LLM keys server-side — user brings own key, keeps API cost and security on the user
- Team/collaboration / real-time features — single-user tool; JSON export covers sharing

## Context

- **Shipped v1.0** (2026-07-02): ~5,219 LOC TypeScript/TSX across 5 phases, 21 plans, 6 days.
- **Tech stack (as built):** Vite + React 19 + TypeScript SPA; Zustand for builder/session state; Dexie/IndexedDB behind a `StorageAdapter` seam; Zod schemas for `PromptDraft` (schemaVersion 2) and palette responses; Vercel AI SDK via a `PaletteAdapter` (OpenRouter provider). Tauri 2 wraps the same `dist/` as a native macOS `.app`/`.dmg`.
- **Security posture:** LLM key stored locally only, never sent to a first-party server (there is none); strict CSP with an `ipc:`/`http://ipc.localhost` allowlist on desktop; all LLM/AI output treated as untrusted text.
- Target users: Midjourney image creators (hobbyist to pro) who find the syntax and parameter space hard to recall.
- Flag definitions are data-driven and version-scoped — a Midjourney version bump is a config edit, not code.
- **Known non-blocking debt:** dead `src/App.tsx` scaffold (zero runtime impact); Phase 05 formal Nyquist validation left as `draft` (phase passed verification + human UAT); desktop icon is a solid-color placeholder (ImageMagick font resolution failure in build env).

## Constraints

- **Tech stack**: Single codebase ships both web and desktop — realized via Vite SPA + Tauri wrapper.
- **Persistence**: Local-only — no server database, no auth backend.
- **Security**: User's LLM API key stored locally; never transmitted to any first-party server (there is none).
- **Dependencies**: LLM provider is user-selected ("bring your own key") — integration goes through one provider adapter, designed for adding more.

## Key Decisions

<!-- Decisions that constrain future work. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-only persistence, no backend | Avoids accounts, data liability, hosting cost | ✓ Good — Dexie/IndexedDB behind `StorageAdapter`; JSON export as backup |
| User brings own LLM API key | No server-side LLM cost; keeps keys with user | ✓ Good — local-only key storage, no first-party server touches it |
| AI suggests options, user assembles | Keeps user in control; AI lowers vocabulary barrier | ✓ Good — six palettes, click-to-promote; manual builder works keyless |
| Web + desktop from one codebase | Reach both audiences without duplicate work | ✓ Good — Tauri wraps unchanged `dist/`; parity UAT approved |
| Data-driven, version-scoped MJ flags | Midjourney flags change per version; avoid hardcoding | ✓ Good — flag definitions are config; version-gated in UI |
| One extensible provider adapter (not multi-vendor at v1) | Ship the differentiator without vendor sprawl | ✓ Good — `PaletteAdapter` (OpenRouter); more providers deferred to v2 |
| Desktop (Tauri) deliberately last | Wiring over existing ports, not a rewrite | ✓ Good — zero `src/` changes needed to reach parity |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-02 after v1.0 MVP milestone — all 5 phases shipped, 31/31 requirements validated.*
