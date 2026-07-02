# Milestones

## v1.0 MVP (Shipped: 2026-07-02)

**Delivered:** A user can go from a vague idea to a copyable, complete Midjourney prompt — hand-built or AI-assembled — running identically as a web app and a native desktop app, with a local saved library.

**Stats:**
- Phases: 5 (all complete)
- Plans: 21 | Tasks: 9
- LOC: ~5,219 TypeScript/TSX (`src/`)
- Timeline: 2026-06-26 → 2026-07-02 (6 days)
- Audit: PASSED — 31/31 v1 requirements satisfied with code evidence

**Key accomplishments:**

- **Phase 1 — Manual Prompt Builder:** Canonical `PromptDraft` model + deterministic `serialize()` with a `sanitize()` escape chokepoint, chip UI, and live preview — a complete prompt hand-buildable and copyable before any AI or flags.
- **Phase 2 — Data-Driven Flag Controls:** Version-scoped Midjourney flag definitions as config data (not hardcoded); UI controls for `--ar`/`--v`/`--niji`/`--stylize`/`--chaos`/`--no`/`--seed`, version-gated, rendered into valid syntax at the prompt tail. `PromptDraft` bumped to schemaVersion 2.
- **Phase 3 — Local Library + Backup:** Save/list/reload (full builder state, not just string)/delete via a `StorageAdapter` seam over Dexie/IndexedDB, durable-storage request, plus JSON export/import as the eviction backup.
- **Phase 4 — AI Palettes + BYO Key:** Explicit intent-driven AI suggestion fills six categorized palettes via a `PaletteAdapter` (OpenRouter) behind schema validation with graceful degradation; local-only API key storage, never sent to a first-party server.
- **Phase 5 — Desktop App (Tauri):** Same Vite/React codebase wrapped as a native macOS `.app`/`.dmg` at full feature parity, library persisting behind the unchanged `StorageAdapter`; D-05 UAT parity approved on web + desktop.

---
