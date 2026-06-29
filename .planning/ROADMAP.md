# Roadmap: Midjourney Prompt Helper

## Overview

The journey starts with a prompt a user can build and copy entirely by hand — proving the canonical prompt model and deterministic serializer that everything else consumes. It then layers on data-driven Midjourney flag controls, a local saved library with JSON backup, and finally the headline differentiator: AI-suggested, intent-driven palettes via the user's own LLM key. The same web codebase is wrapped as a native desktop app last — a wiring exercise over the adapter seams built along the way. Each phase ships an end-to-end, demoable user capability; no phase is a dead-end refactor.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Manual Prompt Builder** - Hand-build and copy a complete prompt (canonical model + serializer + chips + live preview), no AI or flags yet (completed 2026-06-27)
- [x] **Phase 2: Data-Driven Flag Controls** - Set Midjourney flags via version-gated UI controls driven by config data, rendered into the copied prompt (completed 2026-06-28)
- [x] **Phase 3: Local Library + Backup** - Save, list, reload (full builder state), delete prompts locally, plus JSON export/import backup (completed 2026-06-29)
- [ ] **Phase 4: AI-Populated Palettes + BYO Key** - Enter intent + own LLM key, trigger AI to fill categorized palettes, click chips to assemble
- [ ] **Phase 5: Desktop App (Tauri)** - Same codebase runs as a native desktop app at full feature parity, library persisting locally

## Phase Details

### Phase 1: Manual Prompt Builder

**Goal**: A user can hand-build a complete, correctly-formatted Midjourney prompt from a plain-language description plus custom chips, and copy it to the clipboard — establishing the canonical `PromptDraft` model, the deterministic serializer, and the live-preview build loop everything else depends on.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: BLD-01, BLD-03, BLD-04, BLD-05, BLD-06, BLD-07, ASM-01, ASM-02, ASM-03
**Success Criteria** (what must be TRUE):

  1. User can type a plain-language intent/description into a single input field
  2. User can add a custom chip and remove any previously added chip, with the prompt updating immediately
  3. User sees a live preview of the assembled prompt string that stays in sync as they edit
  4. User can copy the final prompt to the clipboard in one action, and clear/reset the builder to start fresh
  5. Special characters in user text are escaped so they cannot break Midjourney syntax (e.g. stray `::` or `--`)

**Plans**: 4 plans
Plans:

- [x] 01-01-PLAN.md — Scaffold project, install all deps, configure Tailwind v4 + shadcn/ui, create all test stubs
- [x] 01-02-PLAN.md — Domain core: PromptDraft schema, sanitize() chokepoint, serialize() pure function
- [x] 01-03-PLAN.md — Builder state (Zustand) + UI: IntentInput, ChipInput, ChipArea, LivePreview
- [x] 01-04-PLAN.md — Copy button + Clear dialog + human verification checkpoint

**UI hint**: yes

### Phase 2: Data-Driven Flag Controls

**Goal**: A user can set Midjourney technical flags through UI controls (sliders, dropdowns, toggles) that are generated from versioned flag-definition data, with the selected model version gating which flags appear — and those flags render into the live preview and copied prompt in valid syntax.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: FLG-01, FLG-02, FLG-03, FLG-04, FLG-05
**Success Criteria** (what must be TRUE):

  1. User can set core flags (`--ar`, `--v`/`--niji`, `--stylize`, `--chaos`, `--no`, `--seed`) via UI controls instead of typing syntax
  2. User can pick an aspect-ratio preset or enter a custom `w:h` value
  3. Changing the selected model version shows/hides the flags and values valid for that version
  4. Selected flags appear in the live preview and copied string in valid Midjourney syntax, ordered at the prompt tail, with definitions sourced from config data (not hardcoded UI logic)

**Plans**: 6 plans
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Flag domain module: Zod schemas, VERSION_DEFINITIONS, FLAG_DEFINITIONS, helpers (getFlagsForVersion, serializeFlag, validateAspectRatio) + tests
- [x] 02-02-PLAN.md — PromptDraft v2 (add selectedVersionId, bump schemaVersion), Zustand store extension (setFlag, unsetFlag, setVersion, clearAll updated) + tests

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Serializer Phase 2 extension point (version + flags at prompt tail) + shadcn slider/select UI primitives

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Leaf flag control components: VersionSelect, ARControl, SliderFlagControl, NumberFlagControl, TextFlagControl

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-05-PLAN.md — FlagControls container + App.tsx wiring (version-gated flag derivation, FlagControls mounted) + ClearDialog update + component tests

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 02-06-PLAN.md — Human verification checkpoint: end-to-end flag control UX + MJ syntax validation

**UI hint**: yes

### Phase 3: Local Library + Backup

**Goal**: A user can save the current prompt to a named local library, reload any saved prompt as fully editable builder state (intent, chips, flags — not just the string), delete entries, and export/import the whole library as JSON — the only backup against storage eviction.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: LIB-01, LIB-02, LIB-03, LIB-04, LIB-05, PLT-03
**Success Criteria** (what must be TRUE):

  1. User can save the current prompt under a name and see it appear in a list of saved prompts
  2. User can reload a saved prompt and have full builder state restored (intent, chips, flags), not just the rendered string
  3. User can delete a saved prompt from the list
  4. User can export the entire library to a JSON file and import it back to restore entries
  5. Saved prompts survive a browser reload, and the app requests durable storage to reduce silent eviction

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Persistence foundation + Save + List (LIB-01, LIB-02, PLT-03)

**Wave 2** *(both depend on 03-01; run in parallel)*

- [x] 03-02-PLAN.md — Reload + Delete + Inline Rename (LIB-03, LIB-04)
- [x] 03-03-PLAN.md — Export/Import domain module + tests (LIB-05 logic)

**Wave 3** *(depends on 03-02 and 03-03)*

- [x] 03-04-PLAN.md — ExportImport UI + human verification (LIB-05 UI)

**UI hint**: yes

### Phase 4: AI-Populated Palettes + BYO Key

**Goal**: A user enters a plain-language intent and their own LLM API key, then triggers an explicit AI suggestion that fills categorized palettes (Style/Medium, Lighting, Camera & Lens, Composition, Color, Mood) with relevant options they click to assemble into the prompt — the product's headline differentiator, behind a provider adapter and schema validation.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02, AI-03, AI-04, BLD-02, KEY-01, KEY-02, KEY-03, KEY-04
**Success Criteria** (what must be TRUE):

  1. User can enter, save, and clear their own LLM API key, stored locally only and never sent to any first-party server
  2. User can trigger an explicit AI suggestion (not per-keystroke) that populates palettes with options relevant to the entered intent
  3. AI returns categorized options across the six core palettes (Style/Medium, Lighting, Camera & Lens, Composition, Color, Mood)
  4. User can click palette chips to add them to the prompt and deselect them
  5. Malformed or failed AI responses degrade gracefully without wiping in-progress work (validated against a schema), and LLM access runs through one provider adapter designed for adding more later

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Persistence foundation + Save + List (LIB-01, LIB-02, PLT-03)

**Wave 2** *(both depend on 03-01; run in parallel)*

- [x] 03-02-PLAN.md — Reload + Delete + Inline Rename (LIB-03, LIB-04)
- [x] 03-03-PLAN.md — Export/Import domain module + tests (LIB-05 logic)

**Wave 3** *(depends on 03-02 and 03-03)*

- [ ] 03-04-PLAN.md — ExportImport UI + human verification (LIB-05 UI)

**UI hint**: yes

### Phase 5: Desktop App (Tauri)

**Goal**: The same web codebase runs as a native desktop application at full feature parity, with the saved library persisting to local storage behind the same storage abstraction used on web — a wiring exercise over the adapter seams already built, not a rewrite.
**Mode:** mvp
**Depends on**: Phase 3, Phase 4
**Requirements**: PLT-01, PLT-02
**Success Criteria** (what must be TRUE):

  1. User can launch the app as a native desktop application built from the same codebase as the web app
  2. All builder, flag, library, and AI features work identically in the desktop app
  3. The saved library persists locally on desktop behind the same storage abstraction used on web, with parity verified across both targets

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Manual Prompt Builder | 4/4 | Complete   | 2026-06-27 |
| 2. Data-Driven Flag Controls | 6/6 | Complete   | 2026-06-28 |
| 3. Local Library + Backup | 4/4 | Complete   | 2026-06-29 |
| 4. AI-Populated Palettes + BYO Key | 0/TBD | Not started | - |
| 5. Desktop App (Tauri) | 0/TBD | Not started | - |
