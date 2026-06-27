# Feature Research

**Domain:** Midjourney prompt-builder / prompt-engineering desktop+web tool (BYO-LLM, local-only)
**Researched:** 2026-06-26
**Confidence:** HIGH on Midjourney parameter inventory and competitor feature set (multiple sources incl. official-doc-derived references); MEDIUM on "AI suggests options" UX patterns (synthesized from competitor behavior, fewer authoritative sources).

## Context Snapshot (why this matters now)

- Midjourney's **default model is V8.1** (became default 2026-06-11); **V7** is still selectable; **V6** and **Niji 6/7** remain in use. The flag set differs by version — confirming the PROJECT.md decision to make flag definitions **data-driven and version-scoped**, not hardcoded.
- A Midjourney prompt is structurally: `[image URLs] [text description with optional :: weighted parts] [--parameters]`. A good builder must reason about all three zones, not just the parameter tail.
- Competing tools (PromptFolder, IMI Prompt Builder, Phraser, IMIprompt) already set the table-stakes bar: palette categories + parameter controls + copy-to-clipboard. Our differentiation is **LLM-suggested, intent-driven palettes** + **local-first BYO-key** + **web/desktop parity**.

---

## Midjourney Parameter & Syntax Inventory (current — verify per release)

This is the authoritative inventory the builder must cover. Treat it as **seed data for a versioned flag-definition file**, not as hardcoded logic. Ranges/defaults are current as of 2026-06; flag availability is version-gated.

### Prompt structure primitives (not flags)

| Primitive | Syntax | What it does | Notes |
|-----------|--------|--------------|-------|
| Image prompt | `https://url.png` at **start** of prompt | Uses image(s) as visual input influencing composition/style | One or more URLs; must precede text. Influence tuned by `--iw`. |
| Multi-prompt separator | `concept::` | Splits prompt into distinct weighted concepts | No space before `::`, one space after. |
| Concept weight | `concept::2` | Relative importance of a concept (default 1) | Weights are relative, not absolute. Decimals allowed. |
| Negative weight | `fruit::-0.5` | Suppresses a concept | Sum of all weights must stay positive. `--no x` == `x::-0.5`. |

### Core parameters

| Parameter | Syntax | Range / values | Default | Function | Version scope |
|-----------|--------|----------------|---------|----------|---------------|
| Aspect ratio | `--ar w:h` | any ratio (1:1, 16:9, 4:5, 2:3, 21:9…) | 1:1 | Output dimensions | All |
| Version | `--v N` | 8.1, 8, 7, 6 (legacy 5.x) | 8.1 | Selects base model | All |
| Niji (anime) | `--niji N` | 7, 6 | — | Anime/illustration model | Niji models |
| Stylize | `--stylize N` / `--s N` | 0–1000 | 100 | Strength of MJ's default aesthetic | All |
| Chaos | `--chaos N` / `--c N` | 0–100 | 0 | Variation/diversity across the 4 results | All |
| Weird | `--weird N` / `--w N` | 0–3000 | 0 | Unconventional/experimental aesthetics | V6+ |
| Quality | `--quality N` / `--q N` | 1, 2, 4 (older: .25/.5/1) | 1 | Render detail vs GPU cost | Version-dependent values |
| No (negative) | `--no x, y` | any terms | — | Excludes elements (== `::-0.5`) | V6, V7, V8.1 |
| Seed | `--seed N` | 0–4294967295 | random | Reproducible starting noise | All |
| Stop | `--stop N` | 10–100 | 100 | Ends job early for less-finished look | All |
| Tile | `--tile` | flag | off | Seamless repeating texture | All |
| Repeat | `--repeat N` / `--r N` | small int | — | Runs the job N times (batch) | All |
| Raw style | `--style raw` | flag/value | off | Less automatic "beautification" | All |

### Reference parameters (style / character / subject transfer)

| Parameter | Syntax | Range | Default | Function | Version scope |
|-----------|--------|-------|---------|----------|---------------|
| Style reference | `--sref URL` or `--sref CODE` | image URL or numeric style code | — | Transfers aesthetic/look | All current |
| Style weight | `--sw N` | 0–1000 | 100 | Strength of style reference | with `--sref` |
| Style random | `--sref random` | keyword | — | Random style code (discovery) | current |
| Image weight | `--iw N` | 0–2 (varies by version) | 1 | Balance of image prompt vs text | All |
| Character reference | `--cref URL` | image URL | — | Keeps a character consistent | **V6 / Niji 6 only (legacy)** |
| Character weight | `--cw N` | 0–100 | 100 | 0 = face only, 100 = face+hair+clothes | with `--cref` |
| Omni reference | `--oref URL` | image URL | — | Embeds a specific subject/object ("put THIS in") | **V7 (and newer)** |
| Omni weight | `--ow N` | 0–1000 | 100 | Adherence to omni reference | with `--oref` |

### V8.x newer / specialized parameters

| Parameter | Syntax | Range | Default | Function | Notes |
|-----------|--------|-------|---------|----------|-------|
| HD | `--hd` | flag | off | Native ~2048px generation | Higher GPU cost |
| SD | `--sd` | flag | off | Standard-def, cheaper | Cost-saving |
| Draft mode | `--draft` | flag | off | ~10x faster, rougher | Iteration mode |
| Experimental | `--exp N` | 0–100 | 0 | Extra detail/dynamics | V8.x |

**Builder implication:** flags split into (a) **always-applicable** (ar, seed, no, stylize, chaos), (b) **version-gated** (cref vs oref, quality values, hd/sd/draft/exp), and (c) **reference-dependent weights** (sw requires sref, cw requires cref, ow requires oref). The UI must show/hide and validate based on selected `--v`/`--niji`. This is the single most important data-modeling requirement in the whole product.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes the tool feel broken versus existing free generators (PromptFolder, IMIprompt).

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Free-text description / subject field | Every prompt starts with a concept | LOW | The anchor text the palettes decorate. |
| Palette picker for core categories (style, lighting, camera/lens, color, mood, material, artist) | This is what "prompt builder" means to users | MEDIUM | One-click chips that append to prompt. See palette taxonomy below. |
| Live prompt preview (assembled string) | Users need to see what they're building | LOW | Reactive concatenation of text + selections + flags. |
| Copy-to-clipboard | The product's entire output is a string | LOW | Core value per PROJECT.md. |
| Core flag controls via UI (ar, v/niji, stylize, chaos, no, seed) | Users don't want to memorize syntax | MEDIUM | Sliders/dropdowns/toggles, not raw text. |
| Version selector that gates available flags | Wrong flags for a version = broken output | MEDIUM | Drives show/hide of cref vs oref, quality values, etc. |
| Aspect ratio presets + custom | Most-used flag of all | LOW | Common presets (1:1, 16:9, 9:16, 4:5, 2:3) + custom w:h. |
| "Clear / reset" | Start a new prompt cleanly | LOW | — |
| Remove/deselect a chosen chip | Mistaps happen | LOW | Toggle semantics on palette chips. |
| Saved prompt library (name, list, reload, delete) | Reuse is the #2 reason people use these tools | MEDIUM | Local-only per scope. Reload must restore text + selections + flags, not just the string. |
| BYO LLM key entry + local storage | Required by the chosen architecture | MEDIUM | Provider-flexible; never sent to a first-party server. |

### Differentiators (Competitive Advantage)

Where this product beats the free generators. These align directly with PROJECT.md's Core Value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Intent → AI-populated palettes** | The headline feature: type "moody noir detective in rain," get *relevant* camera/lighting/style options, not a generic 160-item list | HIGH | LLM returns categorized option lists; user clicks to assemble. Requires structured/JSON output + schema validation. The core differentiator. |
| **Contextual, not static, suggestions** | Options are tailored to the stated intent (vs IMI/PromptFolder's fixed preset lists) | HIGH | Same engine as above; the differentiator is relevance + freshness. |
| **Per-category "suggest more" / regenerate** | Keep a category, refresh only its options | MEDIUM | Partial LLM calls scoped to one palette. |
| **Version-aware flag intelligence** | Auto-correct/warn when a flag isn't valid for the chosen version (e.g., `--cref` on V7 → suggest `--oref`) | MEDIUM | Built on the versioned flag-definition data. Real differentiator vs dumb string builders. |
| **Multi-prompt `::` weight editor** | Visual weight sliders for `concept::N` incl. negatives — almost no competitor exposes this well | HIGH | Hard to do legibly; high payoff for power users. |
| **Style/character/omni reference manager** | Paste image URL or `--sref` code with weight sliders; store favorite sref codes | MEDIUM | sref-code library is a known power-user obsession. |
| **Provider-flexible LLM** (OpenAI/Anthropic/Gemini/local/OpenAI-compatible) | Not locked to one vendor; works with local models | MEDIUM | Adapter pattern over a common request shape. |
| **Web + desktop parity from one codebase** | Reach hobbyist (web) and pro (desktop, file-based library) | MEDIUM | Tauri/Electron wrapper; storage abstraction. |
| **Prompt diff / variations** | Generate variant strings (e.g., swap stylize/chaos) for A/B | LOW | Pure string manipulation, high perceived value. |
| **Explain-this-flag inline help** | Teaches vocabulary while building | LOW | Static help text keyed to the flag data. |
| **Import/parse an existing prompt back into the builder** | Paste a prompt, get editable palettes/flags | MEDIUM | Reverse-parse text+`::`+flags into UI state. Great for "remix." |
| **Export/import the saved library (JSON file)** | Local-only users still want backup/portability | LOW | Compensates for no cloud sync. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Direct image generation / Discord/MJ API integration** | "Why copy-paste? Just run it" | Out of scope by design; MJ has no public generation API, Discord automation risks ToS bans, adds auth/cost/liability | Output a clean copyable prompt; optionally deep-link to Midjourney web. |
| **Server-side accounts / cloud sync** | Cross-device library | Explicitly out of scope; creates backend, auth, data-liability, hosting cost | Local storage + JSON export/import for manual portability. |
| **Hosting/proxying LLM keys server-side** | "Easier than BYO key" | Puts API cost + key security on us; defeats local-first model | BYO key stored locally; all calls client-side. |
| **AI writes the whole final prompt for you** | "Just do it for me" | Contradicts Core Value (AI *suggests*, user *assembles*); removes user control/learning; encourages generic output | LLM populates options; user composes. Optionally offer a "draft" as one selectable suggestion, not the default. |
| **Massive static preset libraries (1000s of fixed chips)** | "More options = better" | Choice overload; this is exactly what intent-driven suggestion replaces | Curated defaults + AI-tailored options per intent. |
| **Real-time collaboration / sharing** | Team workflows | Out of scope (single-user v1); heavy infra | Defer; JSON export covers sharing a prompt. |
| **Hardcoded flag list baked into UI logic** | Faster to build | Breaks every MJ release; PROJECT.md explicitly warns against it | Data-driven, version-scoped flag definitions. |
| **Image preview/gallery of past results** | "See what I made" | Requires storing generated images = we never generate them | Out of scope; we deal in prompts only. |

---

## Palette Category Taxonomy (recommended)

Synthesized from PromptFolder (6 groups: Styles, Lighting, Camera, Artists, Colors, Materials) and IMI (14 groups incl. poses, backgrounds, textures, effects, layouts, themes). Recommended set for the LLM to populate, balancing coverage vs choice-overload:

**Core (table-stakes palettes):**
1. **Style / Medium** — photorealistic, oil painting, anime, 3D render, cyberpunk, watercolor…
2. **Lighting** — golden hour, neon, rim light, chiaroscuro, softbox, moonlight…
3. **Camera & Lens** — DSLR, macro, telephoto, wide-angle, 35mm, bokeh, aerial/drone…
4. **Composition / Framing** — close-up, rule of thirds, symmetry, low angle, wide establishing shot…
5. **Color / Palette** — monochrome, pastel, vibrant, muted earth tones, complementary…
6. **Mood / Atmosphere** — serene, ominous, whimsical, melancholic, epic…

**Extended (differentiator palettes — AI-populated when relevant):**
7. **Artist / Style reference** — named artists *and* `--sref` codes (note IP/availability caveats).
8. **Material / Texture** — leather, brushed metal, marble, paper, fabric.
9. **Environment / Setting** — studio, forest, dystopian city, underwater.
10. **Enhancers / Quality terms** — "highly detailed," "8k," "cinematic," "award-winning" (use judiciously; some are noise in V7/V8).

**Design rule:** the LLM decides *which* palettes are relevant to the intent and fills each with ~5–10 tailored chips — not a fixed wall of hundreds. Categories are a stable schema; their contents are dynamic.

---

## "AI Suggests Options" UX Pattern (recommended)

The defining interaction. Recommended flow (MEDIUM confidence — synthesized):

1. **Intent input** — single plain-language box ("what do you want to create?").
2. **Generate** — one LLM call returns a **structured JSON object**: `{ subject, palettes: { lighting: [...], camera: [...], ... }, suggested_flags: {...} }`. Enforce a schema; validate and gracefully degrade on malformed output.
3. **Populated palettes** — categories appear as labeled rows of clickable chips. AI may pre-highlight a few recommended chips (user can deselect).
4. **Assemble** — clicking chips appends to the live preview; flags from UI controls append to the tail.
5. **Refine loop** — per-category "suggest more / regenerate"; re-run with edited intent; manual add of custom chips.
6. **Finalize** — copy string and/or save to library.

**UX requirements that follow:**
- **Structured output, not prose.** Parse JSON, not free text. This is the single biggest reliability risk (see PITFALLS).
- **Loading/streaming feedback** — LLM calls take seconds; show per-palette skeletons.
- **Graceful failure** — bad key, rate limit, malformed JSON must not wipe the user's in-progress prompt.
- **Editability everywhere** — every AI suggestion is a starting point; nothing is locked.
- **Token/cost awareness** — BYO key means the user pays; avoid gratuitous re-calls, allow manual trigger rather than auto-call on every keystroke.

---

## Feature Dependencies

```
Free-text intent input
    └──feeds──> AI-populated palettes (LLM call)
                    └──requires──> BYO LLM key + provider adapter
                    └──requires──> structured-output schema + validation
                    └──enhances──> Live prompt preview

Versioned flag-definition data (seed inventory above)
    └──required by──> UI flag controls (ar, v, stylize, chaos, no, seed…)
    └──required by──> Version-aware flag gating (cref vs oref, quality values)
    └──required by──> Reference manager (sref/sw, cref/cw, oref/ow)
    └──required by──> Multi-prompt :: weight editor

Live prompt preview
    └──required by──> Copy-to-clipboard
    └──required by──> Save to library

Saved prompt library
    └──requires──> local storage abstraction (web: IndexedDB/localStorage; desktop: file)
    └──enhances──> Import/parse existing prompt (reverse-fill builder state)
    └──enhanced by──> Library JSON export/import

Web + desktop parity
    └──requires──> storage abstraction (same dependency as library)

Reference weights (--sw / --cw / --ow)
    └──conflicts──> using a weight without its reference (sw needs sref, etc.) → validate
--cref ──conflicts──> V7/V8 (use --oref); --oref ──conflicts──> V6 (use --cref)
```

### Dependency Notes

- **AI palettes require structured-output handling:** the whole differentiator rests on reliably parsing categorized JSON from varied LLM providers — build this defensively first.
- **All flag UI requires the versioned flag data:** model the flag-definition file before building any control; it's the spine of both the flag UI and version gating.
- **Save/reload must persist builder state, not just the string:** reloading a prompt should restore intent text, selected chips, and flag values so it's re-editable — otherwise "reload" is just "paste."
- **Reference weights conflict with absent references:** validate and disable `--sw/--cw/--ow` unless the matching reference is present.
- **Version conflicts (cref vs oref):** the version selector must drive which reference type is offered.

---

## MVP Definition

### Launch With (v1)

- [ ] Plain-language intent input — anchor of the whole flow.
- [ ] AI-populated palettes for the 6 core categories via BYO key — the differentiator; without it this is just another static builder.
- [ ] BYO LLM key entry + local storage + one provider adapter (designed for more) — required for the above.
- [ ] Click-to-assemble chips + live prompt preview — core builder mechanic.
- [ ] Core flag controls: `--ar`, `--v`/`--niji`, `--stylize`, `--chaos`, `--no`, `--seed` via UI — table stakes.
- [ ] Versioned flag-definition data driving the controls (not hardcoded) — PROJECT.md mandate; cheaper now than retrofitting.
- [ ] Copy-to-clipboard — the product's output.
- [ ] Save / list / reload / delete local library (persisting full builder state) — #2 reason users return.
- [ ] Web + desktop from one codebase with a storage abstraction — core constraint.

### Add After Validation (v1.x)

- [ ] Style/character/omni **reference manager** with weight sliders + sref-code storage — once core flow is proven; high power-user value.
- [ ] Multi-prompt `::` weight editor (incl. negatives) — power feature; needs careful UI.
- [ ] Per-category "suggest more / regenerate" — once base AI call is reliable.
- [ ] Version-aware flag validation/warnings (cref↔oref, quality values) — built on existing flag data.
- [ ] Import/parse an existing prompt into the builder — strong "remix" hook.
- [ ] Library JSON export/import — backup without a backend.
- [ ] Additional LLM provider adapters (Anthropic/Gemini/local/OpenAI-compatible).

### Future Consideration (v2+)

- [ ] Prompt variations / A-B diff generator — nice, not essential.
- [ ] Inline "explain this flag" learning layer — polish.
- [ ] Curated community sref-code browser — content-heavy; defer until PMF.
- [ ] Prompt templates / framework presets (e.g., photography vs product-shot scaffolds).

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| AI-populated palettes from intent | HIGH | HIGH | P1 |
| BYO key + provider adapter | HIGH | MEDIUM | P1 |
| Click-to-assemble + live preview | HIGH | LOW | P1 |
| Core flag controls (ar/v/stylize/chaos/no/seed) | HIGH | MEDIUM | P1 |
| Versioned flag-definition data | HIGH | MEDIUM | P1 |
| Copy-to-clipboard | HIGH | LOW | P1 |
| Local saved library (full state) | HIGH | MEDIUM | P1 |
| Web + desktop parity | HIGH | MEDIUM | P1 |
| Reference manager (sref/cref/oref + weights) | HIGH | MEDIUM | P2 |
| Multi-prompt `::` weight editor | MEDIUM | HIGH | P2 |
| Per-category regenerate | MEDIUM | MEDIUM | P2 |
| Version-aware flag validation | MEDIUM | MEDIUM | P2 |
| Import/parse existing prompt | MEDIUM | MEDIUM | P2 |
| Library export/import JSON | MEDIUM | LOW | P2 |
| Prompt variations / diff | LOW | LOW | P3 |
| Inline flag explanations | LOW | LOW | P3 |
| Community sref browser | MEDIUM | HIGH | P3 |

## Competitor Feature Analysis

| Feature | PromptFolder | IMI Prompt Builder | Our Approach |
|---------|--------------|--------------------|--------------|
| Palette categories | 6 static groups (Styles, Lighting, Camera, Artists, Colors, Materials) | 14 static groups (incl. poses, backgrounds, textures, effects, layouts, themes) | Stable category **schema**, **AI-filled** contents tailored to intent (not static walls). |
| Parameter controls | Full numeric/dropdown controls incl. tile, stop, repeat, weird, seed | Visual builder with lighting/camera/material options | Full controls, but **version-gated** from data-driven flag definitions. |
| AI assistance | "Optimize" / "AI Magic" rewrite of prompt | Largely manual preset selection | LLM **suggests categorized options**; user assembles (control retained). |
| Saving | Save to **account** (cloud) | App-based | **Local-only** library with full re-editable state + JSON export. |
| LLM key | Hosted (their cost) | n/a | **BYO key**, stored locally, provider-flexible. |
| Platforms | Web | Web + Android + iOS | Web + desktop (one codebase). |
| Version coverage | Up to V6/niji in UI (older) | V5-era | Current V8.1 / V7 / V6 / Niji with version-aware gating. |

## Sources

- Midjourney Parameter List (official, via reference mirror) — https://blakecrosley.com/guides/midjourney (HIGH — tabulates current V8.1/V7 flags, ranges, defaults)
- Multi-Prompts & Weights — https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights (HIGH, via search summary)
- Style Reference (--sref/--sw) — https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference (HIGH)
- Character Reference (--cref/--cw) — https://docs.midjourney.com/hc/en-us/articles/32162917505293-Character-Reference (HIGH)
- Omni Reference (--oref/--ow) — https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference (HIGH)
- Omni-Reference release notes — https://updates.midjourney.com/omni-reference-oref/ (MEDIUM)
- PromptFolder Midjourney Prompt Helper (competitor) — https://promptfolder.com/midjourney-prompt-helper/ (HIGH for its own feature set)
- IMI Prompt Builder deep dive (competitor) — https://skywork.ai/skypage/en/imi-prompt-builder-midjourney-prompts/1976910003106680832 and https://www.imiprompt.com/ (MEDIUM)
- Midjourney prompt guides (2026) — https://printify.com/blog/midjourney-prompts/ , https://www.superside.com/blog/midjourney-prompts (MEDIUM, ecosystem context)

---
*Feature research for: Midjourney prompt-builder tool*
*Researched: 2026-06-26*
