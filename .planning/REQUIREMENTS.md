# Requirements: Midjourney Prompt Helper

**Defined:** 2026-06-26
**Core Value:** The user can go from a vague idea to a copyable, complete Midjourney prompt — assembled from AI-suggested options they choose — faster than writing it by hand.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Builder Core

- [x] **BLD-01**: User can enter a plain-language intent in a single input field
- [ ] **BLD-02**: User can click palette chips to add them to the prompt
- [x] **BLD-03**: User can deselect/remove a previously added chip
- [x] **BLD-04**: User can add a custom chip not offered by a palette
- [x] **BLD-05**: User sees a live preview of the assembled prompt string as they build
- [x] **BLD-06**: User can clear/reset the builder to start a new prompt
- [x] **BLD-07**: User can copy the final prompt to the clipboard

### Prompt Assembly

- [x] **ASM-01**: The app produces a single deterministic prompt string from intent text, selected chips, and flag values (correct ordering and spacing)
- [x] **ASM-02**: The prompt string is built from a canonical structured model (re-editable), not stored only as text
- [x] **ASM-03**: Special characters in user/AI content are escaped so they cannot break Midjourney syntax (e.g. stray `::` or `--`)

### AI Suggestions

- [ ] **AI-01**: User can trigger an AI call that populates palettes with options relevant to the entered intent
- [ ] **AI-02**: AI returns categorized options for the core palettes (Style/Medium, Lighting, Camera & Lens, Composition, Color, Mood)
- [ ] **AI-03**: AI output is validated against a schema; malformed output degrades gracefully without wiping in-progress work
- [ ] **AI-04**: AI calls are triggered explicitly (not per-keystroke) to control the user's cost and avoid rate limits

### Provider / API Key

- [ ] **KEY-01**: User can enter and save an LLM API key, stored locally only
- [ ] **KEY-02**: User can clear/remove the stored key
- [ ] **KEY-03**: The key is never sent to any first-party server (all LLM calls originate client-side)
- [ ] **KEY-04**: LLM integration goes through one provider adapter, designed so additional providers can be added later

### Flags

- [x] **FLG-01**: Midjourney flag definitions are stored as version-scoped data, not hardcoded in UI logic
- [x] **FLG-02**: User can set core flags via UI controls: aspect ratio (`--ar`), version (`--v`/`--niji`), stylize (`--stylize`), chaos (`--chaos`), negative (`--no`), seed (`--seed`)
- [x] **FLG-03**: Aspect ratio offers common presets plus a custom w:h entry
- [x] **FLG-04**: The version selector gates which flags/values are available for the chosen model version
- [x] **FLG-05**: Selected flags render into the prompt tail in valid Midjourney syntax

### Library

- [x] **LIB-01**: User can save the current prompt to a named local library entry
- [x] **LIB-02**: User can view a list of saved prompts
- [ ] **LIB-03**: User can reload a saved prompt, restoring full builder state (intent, chips, flags), not just the string
- [ ] **LIB-04**: User can delete a saved prompt
- [ ] **LIB-05**: User can export the saved library to a JSON file and import it back (the only backup, since storage can be evicted)

### Platform

- [ ] **PLT-01**: The app runs as a web app and as a desktop app from a single codebase
- [ ] **PLT-02**: Local persistence works identically on web and desktop behind one storage abstraction
- [x] **PLT-03**: Local persistence requests durable storage to reduce silent eviction

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Reference & Power Features

- **REF-01**: Style/character/omni reference manager (`--sref`/`--cref`/`--oref`) with weight sliders
- **REF-02**: Saved sref-code library
- **WGT-01**: Multi-prompt `::` weight editor including negative weights
- **AI-05**: Per-category "suggest more / regenerate" scoped to one palette
- **VAL-01**: Version-aware flag validation/warnings (e.g. `--cref` on V7 → suggest `--oref`; weight-without-reference)
- **IMP-01**: Import/parse an existing prompt string back into editable builder state
- **PROV-01**: Additional LLM provider adapters (Anthropic, OpenAI, Gemini, local/OpenAI-compatible)

### Polish

- **VAR-01**: Prompt variations / A-B diff generator
- **HLP-01**: Inline "explain this flag" help
- **TPL-01**: Prompt templates / framework presets

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Direct image generation / Discord/MJ API integration | No public MJ generation API; Discord automation risks ToS bans; output is a copyable prompt by design |
| Server-side accounts / cloud sync | Local-only by design; avoids backend, auth, data liability |
| Hosting/proxying LLM keys server-side | Puts API cost + key security on us; defeats local-first model |
| AI writes the whole final prompt | Contradicts Core Value — AI suggests, user assembles and stays in control |
| Massive static preset libraries (1000s of fixed chips) | Choice overload; intent-driven AI suggestion replaces this |
| Real-time collaboration / sharing | Single-user v1; heavy infra; JSON export covers sharing |
| Image preview/gallery of results | We never generate images, only prompts |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BLD-01 | Phase 1 | Complete |
| BLD-02 | Phase 4 | Pending |
| BLD-03 | Phase 1 | Complete |
| BLD-04 | Phase 1 | Complete |
| BLD-05 | Phase 1 | Complete |
| BLD-06 | Phase 1 | Complete |
| BLD-07 | Phase 1 | Complete |
| ASM-01 | Phase 1 | Complete |
| ASM-02 | Phase 1 | Complete |
| ASM-03 | Phase 1 | Complete |
| FLG-01 | Phase 2 | Complete |
| FLG-02 | Phase 2 | Complete |
| FLG-03 | Phase 2 | Complete |
| FLG-04 | Phase 2 | Complete |
| FLG-05 | Phase 2 | Complete |
| LIB-01 | Phase 3 | Complete |
| LIB-02 | Phase 3 | Complete |
| LIB-03 | Phase 3 | Pending |
| LIB-04 | Phase 3 | Pending |
| LIB-05 | Phase 3 | Pending |
| PLT-03 | Phase 3 | Complete |
| AI-01 | Phase 4 | Pending |
| AI-02 | Phase 4 | Pending |
| AI-03 | Phase 4 | Pending |
| AI-04 | Phase 4 | Pending |
| KEY-01 | Phase 4 | Pending |
| KEY-02 | Phase 4 | Pending |
| KEY-03 | Phase 4 | Pending |
| KEY-04 | Phase 4 | Pending |
| PLT-01 | Phase 5 | Pending |
| PLT-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31 ✓
- Unmapped: 0

---
*Requirements defined: 2026-06-26*
*Last updated: 2026-06-26 after roadmap creation (traceability populated)*
