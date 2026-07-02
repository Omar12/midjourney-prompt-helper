# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-07-02
**Phases:** 5 | **Plans:** 21 | **Timeline:** 6 days (2026-06-26 → 2026-07-02)

### What Was Built
- Canonical `PromptDraft` model + deterministic serializer with a single `sanitize()` escape chokepoint (Phase 1).
- Data-driven, version-scoped Midjourney flag controls rendered into valid syntax (Phase 2).
- Local library (save/reload full state/delete) over a `StorageAdapter` seam, with JSON export/import backup (Phase 3).
- Intent-driven AI palette suggestion behind a `PaletteAdapter` + Zod schema validation with graceful degradation; BYO local-only key (Phase 4).
- Native macOS desktop app (Tauri 2) at full parity from the same codebase (Phase 5).

### What Worked
- Vertical-slice-per-phase kept every phase demoable end-to-end — no dead-end refactor phases.
- Adapter seams (`StorageAdapter`, `PaletteAdapter`) built early made Phase 5 desktop parity a wiring exercise with **zero `src/` changes**.
- The `sanitize()` chokepoint added in Phase 1 was inherited automatically by Phase 4 AI-generated chips — one gate, no re-work.
- Milestone audit passed clean (31/31 requirements with code evidence) — the phase-by-phase verification held up under cross-phase scrutiny.

### What Was Inefficient
- STATE.md `Decisions` log accumulated many `[Phase ?]` entries — decision provenance wasn't consistently tagged at capture time.
- Phase 05 build hit two config bugs late (Vite esbuild target, Tauri `bundle.targets`) that a build smoke earlier in the phase would have surfaced sooner.
- Desktop icon shipped as a solid-color placeholder (ImageMagick font resolution failure in env) — cosmetic debt carried into ship.

### Patterns Established
- **Adapter-seam-first:** isolate persistence and provider I/O behind a port in the phase that introduces them, so later platform/vendor work is wiring, not rewrite.
- **Single escape chokepoint:** all untrusted text (user + AI) funnels through one `sanitize()` before entering the model.
- **Data-driven flags:** a Midjourney version bump is a config edit to `flags.config.json`, never code.

### Key Lessons
1. Building the storage/provider abstraction in the phase that first needs it (not "later") is what made desktop parity nearly free — pay the seam cost once, up front.
2. Add a build/bundle smoke check inside the phase, not only at UAT — the Phase 5 config bugs were cheap to fix but found late.
3. Tag decision provenance (`[Phase NN-PP]`) at capture; `[Phase ?]` entries lose traceability by milestone close.

### Cost Observations
- Model mix: not tracked this milestone.
- Notable: ~5,219 LOC TS/TSX across 21 plans in 6 days; audit passed with 0 blockers, 2 non-blocking warnings, 1 orphan.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 21 | Baseline — vertical-slice phases, adapter-seam-first |

### Cumulative Quality

| Milestone | Requirements | Audit | Notes |
|-----------|--------------|-------|-------|
| v1.0 | 31/31 | PASSED | 0 blockers, 2 warnings, 1 orphan |

### Top Lessons (Verified Across Milestones)

1. Adapter-seam-first pays off when a later phase targets a new platform/vendor. *(v1.0 — re-confirm next milestone.)*
