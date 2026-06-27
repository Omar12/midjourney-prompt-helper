# Midjourney Prompt Helper

## What This Is

A Midjourney prompt builder for image creators who want comprehensive, well-structured prompts without memorizing Midjourney's vocabulary and flags. Users describe their intent in plain language; an LLM populates palettes of relevant options (cameras, media types, styles, enhancers), and users click to assemble a final prompt — including full Midjourney technical flags. Runs as both a web app and a desktop app, stores everything locally, and keeps a saved library of past prompts.

## Core Value

The user can go from a vague idea to a copyable, complete Midjourney prompt — assembled from AI-suggested options they choose — faster than writing it by hand.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. Hypotheses until shipped and validated. -->

- [ ] User can enter a plain-language intent and get AI-suggested options populated into palettes
- [ ] User can browse and pick from palettes for cameras, media types, styles, and enhancers
- [ ] User can set full Midjourney technical flags (--ar, --v, --stylize, --chaos, --no, weights) via UI controls
- [ ] App assembles selections into a single copyable Midjourney prompt string
- [ ] User can copy the final prompt to clipboard
- [ ] User can save a prompt to a named local library
- [ ] User can revisit, reload, and delete saved prompts
- [ ] User supplies their own LLM API key (any provider), stored locally
- [ ] App runs as a web app and as a desktop app from the same codebase

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Server-side accounts / cross-device sync — local-only by design; no backend, no user data liability
- Generating images directly (Midjourney/Discord integration) — output is a copyable prompt; user runs it in Midjourney themselves
- Hosting/managing LLM keys server-side — user brings own key, keeps API cost and security on the user
- Team/collaboration features — single-user tool for v1

## Context

- Target users: Midjourney image creators (hobbyist to pro) who find the prompt syntax and parameter space hard to recall.
- Midjourney prompts combine free-text description + technical flags. The flag set evolves with Midjourney versions — flag UI should be data-driven, not hardcoded into logic.
- AI role is **suggestion**, not authoring: user types intent → LLM returns categorized option lists → user clicks to assemble. The final prompt is user-composed, not AI-written.
- "Bring your own key" means all LLM calls originate client-side; no proxy server. Key stored in local storage.
- Local-only persistence: saved library lives in browser storage (web) / local file (desktop).

## Constraints

- **Tech stack**: Single codebase must ship both a web app and a desktop app — favors a web stack with a desktop wrapper (e.g. Tauri/Electron + browser).
- **Persistence**: Local-only — no server database, no auth backend.
- **Security**: User's LLM API key stored locally; never transmitted to any first-party server (there is none).
- **Dependencies**: LLM provider is user-selected ("bring your own key") — integration must be provider-flexible, not locked to one vendor.

## Key Decisions

<!-- Decisions that constrain future work. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-only persistence, no backend | Avoids accounts, data liability, hosting cost | — Pending |
| User brings own LLM API key | No server-side LLM cost; keeps keys with user | — Pending |
| AI suggests options, user assembles | Keeps user in control; AI lowers vocabulary barrier | — Pending |
| Web + desktop from one codebase | Reach both audiences without duplicate work | — Pending |
| Data-driven MJ flag definitions | Midjourney flags change per version; avoid hardcoding | — Pending |

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
*Last updated: 2026-06-26 after initialization*
