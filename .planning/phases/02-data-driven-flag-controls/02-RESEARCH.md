# Phase 2: Data-Driven Flag Controls - Research

**Researched:** 2026-06-27
**Domain:** Midjourney flag definitions, version-scoped UI controls, Zustand state extension, serialize.ts tail emission
**Confidence:** MEDIUM (MJ parameter data from unofficial sources; all codebase claims VERIFIED against actual files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Flag Panel Placement (UI layout)**
- **D-01:** Flags live as a third always-visible section in the left controls pane, below intent + chips. No collapsible panel, no tabs.
- **D-02:** Within the section, controls are a flat list in a fixed logical order: version → aspect ratio → stylize → chaos → seed → no.
- **D-03:** Inherits Phase 1's responsive behavior — two-pane collapses to single column on narrow viewports.

**Default Emission Policy (serializer output)**
- **D-04:** Omit every flag until explicitly set. An untouched flag section appends nothing to the prompt tail.
- **D-05:** Each flag has an explicit set/unset state with a clear/remove control to return it to omitted.
- **D-06:** No silent auto-omit by value. A flag set to a value that equals MJ's default (e.g. `--stylize 0`) still emits.

### Claude's Discretion
- Version coverage at launch (which MJ versions ship in flag-definition data)
- Version-switch conflict behavior (non-destructive default when switching to a version that doesn't support an already-set flag)
- Control style per flag (sliders vs steppers; preset chips vs dropdown for aspect ratio)
- Aspect-ratio preset set
- Flag-definition data shape (TypeScript/Zod structure)

### Deferred Ideas (OUT OF SCOPE)
- `--sref`/`--cref`/`--oref` reference manager (REF-01)
- Multi-prompt `::` weight editor (WGT-01)
- Version-aware validation warnings (VAL-01)
- Save/library/backup (Phase 3)
- AI-populated palettes + BYO key (Phase 4)
- Desktop/Tauri (Phase 5)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLG-01 | Midjourney flag definitions stored as version-scoped data, not hardcoded in UI logic | Flag definition schema + helpers module in `src/domain/flags/` serves as single source of truth |
| FLG-02 | User can set core flags via UI controls: `--ar`, `--v`/`--niji`, `--stylize`, `--chaos`, `--no`, `--seed` | Control types per flag documented below; `@base-ui/react` 1.6.0 (already installed) provides all needed primitives |
| FLG-03 | Aspect ratio offers common presets plus custom w:h entry | Preset chips pattern + validated text input; 7 recommended presets documented |
| FLG-04 | Version selector gates which flags/values are available for chosen model version | `availableOn: string[]` per flag definition; UI and serializer both filter by active version ID |
| FLG-05 | Selected flags render into the prompt tail in valid Midjourney syntax | Serializer extension point already stubbed in `serialize.ts` line 31; ordering and syntax documented |
</phase_requirements>

---

## Summary

Phase 2 adds a data-driven flag control layer on top of the Phase 1 builder. The codebase already has the integration points ready: `FlagValueSchema { flagId, value }` exists in `model.ts`, `serialize.ts` has an explicit "Phase 2 extension point" comment at line 31, and `buildSession.ts` is structured to accept new state slices. No new npm packages are needed — `@base-ui/react` 1.6.0 (already installed) ships Slider, Select, and NumberField primitives. New shadcn component wrappers for slider and select are added via the `shadcn` CLI as code files.

The core design challenge is the flag-definition data shape: a versioned config that drives both the UI controls generically (FLG-01) and the serializer's per-flag syntax (FLG-05). The recommended approach is a `src/domain/flags/` module with two pure-data arrays — `VERSION_DEFINITIONS` and `FLAG_DEFINITIONS` — plus helper functions (`getFlagsForVersion`, `serializeFlag`) that the UI and serializer both consume. This keeps zero flag logic in component code.

Midjourney flag ranges and version support are MEDIUM confidence — official docs require auth and the parameter matrix changes with model releases. The data lives in config arrays, so correcting a range is a one-line data edit, not a code change. The planner should treat all MJ parameter ranges as `[ASSUMED]` and include a checkpoint for the user to verify against their own MJ experience before the phase is marked complete.

**Primary recommendation:** Build `src/domain/flags/` as the single source of truth for flag definitions and serialization. The UI is a thin rendering loop over this data. The serializer's Phase 2 extension point reads the same data. State in `buildSession.ts` tracks set/unset independently from value (D-04–D-06).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Flag definition data (ranges, versions, syntax) | Domain (src/domain/flags/) | — | Pure data + pure functions; no UI or framework deps. Consumed by both UI and serializer. |
| Flag serialization (FLG-05) | Domain (src/domain/prompt/serialize.ts) | — | Extends the existing deterministic pure serializer; reads FLAG_DEFINITIONS for per-flag syntax. |
| Flag UI controls (FLG-02, FLG-03) | Browser / Client (src/ui/ControlsPane/) | — | Stateless controlled inputs; write to Zustand store. No business logic in components. |
| Version selector + gating (FLG-04) | Browser / Client (src/ui/ControlsPane/) | Domain helpers | UI reads `getFlagsForVersion(versionId)` to filter which controls to render. |
| Flag session state (set/unset/value) | State (src/state/buildSession.ts) | — | Zustand store extension; flag values + isSet per flag. Cleared by `clearAll`. |
| Input sanitization for free-text flags | Domain (src/domain/prompt/sanitize.ts) | — | Existing single chokepoint; `--no` value and custom w:h route through it before storing. |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version (installed) | Purpose | Source |
|---------|--------------------|---------|----|
| `@base-ui/react` | 1.6.0 | Provides Slider, Select, NumberField primitives | [VERIFIED: package.json] |
| `zustand` | 5.0.14 | Session store extension for flag state | [VERIFIED: package.json] |
| `zod` | 4.4.3 | Flag definition schemas (FlagDefinitionSchema, VersionDefinitionSchema) | [VERIFIED: package.json] |
| `react` | 19.2.7 | UI framework | [VERIFIED: package.json] |
| `tailwindcss` | 4.3.1 | Styling flag controls | [VERIFIED: package.json] |

### New Shadcn Component Files (code-only, no new npm installs)

| Component | Install Command | Wraps | Purpose |
|-----------|----------------|-------|---------|
| `slider` | `npx shadcn@latest add slider` | `@base-ui/react/slider` | `--stylize` and `--chaos` controls |
| `select` | `npx shadcn@latest add select` | `@base-ui/react/select` | Version selector dropdown |

`@base-ui/react` already exports `./slider`, `./select`, `./number-field`, `./toggle`, `./switch` at version 1.6.0. [VERIFIED: node_modules/@base-ui/react/package.json exports map]

The shadcn CLI adds styled wrapper components in `src/components/ui/` — same pattern as the existing `input.tsx` which wraps `@base-ui/react/input`. No new npm packages are introduced.

### Installation

```bash
# Add shadcn component wrappers (code files only — no new npm deps)
npx shadcn@latest add slider
npx shadcn@latest add select
```

---

## Package Legitimacy Audit

No new npm packages are installed in this phase. The shadcn CLI adds TypeScript source files that wrap `@base-ui/react` primitives already present in the dependency tree. The legitimacy of `@base-ui/react` was established in Phase 1.

| Package | Status | Notes |
|---------|--------|-------|
| `@base-ui/react` (existing) | Previously approved | Installed in Phase 1; v1.6.0 on npm |
| `shadcn` CLI (existing) | Previously approved | Used to add component code files; no new runtime package |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User interaction
      |
      v
FlagControls (src/ui/ControlsPane/FlagControls/)
  VersionSelect | ARControl | SliderControl | NumberControl | TextControl
      |
      | setFlag(flagId, value) / unsetFlag(flagId)
      v
buildSession (Zustand)
  flags: Record<flagId, { value: unknown; isSet: boolean }>
      |
      | flags array read in App.tsx → passed to serialize()
      v
serialize(draft: PromptDraft) [src/domain/prompt/serialize.ts]
  reads FLAG_DEFINITIONS + VERSION_DEFINITIONS
  filters to isSet + version-supported flags
  emits flag syntax strings
      |
      v
prompt string: "a cat, cinematic --ar 16:9 --stylize 250"
      |
      v
LivePreview + CopyButton (unchanged Phase 1 components)
```

**Data flow for flag definitions (FLG-01):**
```
src/domain/flags/
  versions.ts → VERSION_DEFINITIONS[]    ← read by VersionSelect UI
  definitions.ts → FLAG_DEFINITIONS[]    ← read by FlagControls + serialize()
  helpers.ts → getFlagsForVersion(id)    ← called by UI to filter visible controls
              → serializeFlag(def, val)  ← called by serialize() for each set flag
```

### Recommended Project Structure

```
src/
├── domain/
│   ├── prompt/
│   │   ├── model.ts          # FlagValueSchema — unchanged (Phase 1)
│   │   ├── serialize.ts      # Extended: fills Phase 2 extension point
│   │   └── sanitize.ts       # Unchanged — reused for --no and custom w:h
│   └── flags/                # NEW in Phase 2
│       ├── schema.ts         # Zod schemas: FlagDefinitionSchema, VersionDefinitionSchema
│       ├── versions.ts       # VERSION_DEFINITIONS data array
│       ├── definitions.ts    # FLAG_DEFINITIONS data array
│       ├── helpers.ts        # getFlagsForVersion(), serializeFlag() — pure functions
│       └── index.ts          # Re-exports
├── state/
│   └── buildSession.ts       # Extended: add flags state + setFlag/unsetFlag actions
└── ui/
    └── ControlsPane/
        ├── IntentInput.tsx   # Unchanged (Phase 1)
        ├── ChipInput.tsx     # Unchanged (Phase 1)
        ├── ChipArea.tsx      # Unchanged (Phase 1)
        └── FlagControls/     # NEW in Phase 2
            ├── FlagControls.tsx      # Container: renders flag list from definitions
            ├── VersionSelect.tsx     # Version dropdown (gates other flags)
            ├── ARControl.tsx         # Preset chips + custom w:h input
            ├── SliderFlagControl.tsx # Reusable: stylize, chaos
            ├── NumberFlagControl.tsx # Reusable: seed (large range)
            └── TextFlagControl.tsx   # Reusable: --no
```

### Pattern 1: Flag Definition Schema (Zod)

```typescript
// src/domain/flags/schema.ts

import { z } from 'zod'

export const VersionDefinitionSchema = z.object({
  id: z.string(),           // 'v7', 'v6.1', 'niji7', 'niji6', 'v8.1'
  label: z.string(),        // 'V7', 'V6.1', 'Niji 7', 'Niji 6', 'V8.1'
  parameter: z.string(),    // '--v 7', '--v 6.1', '--niji 7', '--niji 6', '--v 8.1'
  supportedFlagIds: z.array(z.string()),
})
export type VersionDefinition = z.infer<typeof VersionDefinitionSchema>

// Control specs — discriminated union
const SliderControlSchema = z.object({
  type: z.literal('slider'),
  min: z.number(),
  max: z.number(),
  step: z.number().default(1),
})

const NumberControlSchema = z.object({
  type: z.literal('number'),
  min: z.number(),
  max: z.number(),
})

const AspectRatioControlSchema = z.object({
  type: z.literal('aspect-ratio'),
  presets: z.array(z.string()),  // ['1:1', '16:9', ...]
})

const TextControlSchema = z.object({
  type: z.literal('text'),
  placeholder: z.string().optional(),
  maxLength: z.number().optional(),
})

// Version selector is not a normal flag — handled separately via VERSION_DEFINITIONS

const ControlSpecSchema = z.discriminatedUnion('type', [
  SliderControlSchema,
  NumberControlSchema,
  AspectRatioControlSchema,
  TextControlSchema,
])

export const FlagDefinitionSchema = z.object({
  id: z.string(),               // 'ar', 'stylize', 'chaos', 'seed', 'no'
  label: z.string(),            // UI label: 'Aspect Ratio', 'Stylize', ...
  paramName: z.string(),        // '--ar', '--stylize', '--chaos', '--seed', '--no'
  control: ControlSpecSchema,
  availableOn: z.array(z.string()), // version IDs where this flag is valid
})
export type FlagDefinition = z.infer<typeof FlagDefinitionSchema>
export type ControlSpec = z.infer<typeof ControlSpecSchema>
```

**Why version is NOT in FlagDefinitionSchema:** The version selector drives gating of ALL other flags, so it is architecturally distinct from the flags it gates. `VersionDefinition.parameter` serializes directly (e.g. `--v 7`). The active version ID is stored as a separate piece of session state (`selectedVersionId: string | null`), not inside the flags array — this avoids a circular dependency where the serializer needs to find the version by scanning `draft.flags`.

### Pattern 2: Version and Flag Data

```typescript
// src/domain/flags/versions.ts

import type { VersionDefinition } from './schema'

// All supported flag IDs except 'version' itself
const ALL_STANDARD_FLAGS = ['ar', 'stylize', 'chaos', 'seed', 'no'] as const

export const VERSION_DEFINITIONS: VersionDefinition[] = [
  {
    id: 'v8.1',
    label: 'V8.1 (Latest)',
    parameter: '--v 8.1',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
  {
    id: 'v7',
    label: 'V7',
    parameter: '--v 7',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
  {
    id: 'v6.1',
    label: 'V6.1',
    parameter: '--v 6.1',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
  {
    id: 'niji7',
    label: 'Niji 7',
    parameter: '--niji 7',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],  // verify --stylize support on niji
  },
  {
    id: 'niji6',
    label: 'Niji 6 (Legacy)',
    parameter: '--niji 6',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
]
```

```typescript
// src/domain/flags/definitions.ts

import type { FlagDefinition } from './schema'

export const FLAG_DEFINITIONS: FlagDefinition[] = [
  {
    id: 'ar',
    label: 'Aspect Ratio',
    paramName: '--ar',
    control: {
      type: 'aspect-ratio',
      presets: ['1:1', '4:5', '3:2', '2:3', '16:9', '9:16', '21:9'],
    },
    availableOn: ['v8.1', 'v7', 'v6.1', 'niji7', 'niji6'],
  },
  {
    id: 'stylize',
    label: 'Stylize',
    paramName: '--stylize',
    control: { type: 'slider', min: 0, max: 1000, step: 1 },
    availableOn: ['v8.1', 'v7', 'v6.1', 'niji7', 'niji6'],
  },
  {
    id: 'chaos',
    label: 'Chaos',
    paramName: '--chaos',
    control: { type: 'slider', min: 0, max: 100, step: 1 },
    availableOn: ['v8.1', 'v7', 'v6.1', 'niji7', 'niji6'],
  },
  {
    id: 'seed',
    label: 'Seed',
    paramName: '--seed',
    control: { type: 'number', min: 0, max: 4294967295 },
    availableOn: ['v8.1', 'v7', 'v6.1', 'niji7', 'niji6'],
  },
  {
    id: 'no',
    label: 'Exclude (--no)',
    paramName: '--no',
    control: {
      type: 'text',
      placeholder: 'trees, text, watermark',
      maxLength: 500,
    },
    availableOn: ['v8.1', 'v7', 'v6.1', 'niji7', 'niji6'],
  },
]
```

### Pattern 3: Helper Functions

```typescript
// src/domain/flags/helpers.ts

import { VERSION_DEFINITIONS } from './versions'
import { FLAG_DEFINITIONS } from './definitions'
import type { FlagDefinition } from './schema'

/** Return flag definitions supported by a given version ID. */
export function getFlagsForVersion(versionId: string | null): FlagDefinition[] {
  if (versionId === null) return FLAG_DEFINITIONS  // no version set = show all
  const version = VERSION_DEFINITIONS.find((v) => v.id === versionId)
  if (!version) return FLAG_DEFINITIONS
  return FLAG_DEFINITIONS.filter((f) => version.supportedFlagIds.includes(f.id))
}

/** Serialize a single flag value to its MJ syntax fragment (e.g. '--stylize 250'). */
export function serializeFlag(flagId: string, value: unknown): string | null {
  const def = FLAG_DEFINITIONS.find((f) => f.id === flagId)
  if (!def) return null
  if (value === null || value === undefined || value === '') return null
  return `${def.paramName} ${String(value)}`
}

/** Get the version parameter string for a version ID (e.g. '--v 7'). */
export function getVersionParameter(versionId: string): string | null {
  const version = VERSION_DEFINITIONS.find((v) => v.id === versionId)
  return version?.parameter ?? null
}
```

### Pattern 4: Serializer Extension

The existing `serialize.ts` has the extension point at line 31. The new implementation:

```typescript
// src/domain/prompt/serialize.ts (Phase 2 extension — replaces the stub comment)

import { sanitize } from './sanitize'
import type { PromptDraft } from './model'
import { serializeFlag, getVersionParameter } from '../flags/helpers'

export function serialize(draft: PromptDraft): string {
  const parts: string[] = []

  // D-01 + D-03: intent first, as one opaque block
  const intentSanitized = sanitize(draft.intent.trim())
  if (intentSanitized) parts.push(intentSanitized)

  // D-01: chips follow in insertion order
  for (const chip of draft.chips) {
    if (!chip.enabled) continue
    const labelSanitized = sanitize(chip.label.trim())
    if (labelSanitized) parts.push(labelSanitized)
  }

  // Phase 2 extension point: flags appended at the tail
  // draft.flags contains only SET flags (isSet filtering done in store/App.tsx before serialization)
  const flagParts: string[] = []

  // Version flag serializes first (from selectedVersionId, passed separately or as a flag)
  // [See note below about version storage strategy]
  for (const { flagId, value } of draft.flags) {
    const fragment = serializeFlag(flagId, value)
    if (fragment) flagParts.push(fragment)
  }

  // D-02: descriptors joined with ", ", then flags space-separated at tail
  const descriptors = parts.join(', ')
  if (flagParts.length === 0) return descriptors
  return descriptors ? `${descriptors} ${flagParts.join(' ')}` : flagParts.join(' ')
}
```

**Critical note on flag order:** `draft.flags` must be in the correct MJ syntax order. The store or the App.tsx derivation step must preserve the canonical order (version first, then ar, stylize, chaos, seed, no). Recommend storing flags as an ordered array in the PromptDraft, with ordering applied when converting from store's `Record<string, ...>` to the array.

### Pattern 5: Buildable Session State Extension

```typescript
// src/state/buildSession.ts additions

interface BuildSessionState {
  intent: string
  chips: Chip[]
  // --- Phase 2 additions ---
  selectedVersionId: string | null              // active MJ version (null = unset/omitted)
  flagValues: Record<string, unknown>           // value per flagId (present even when unset)
  setFlags: Record<string, boolean>             // isSet per flagId (D-05 explicit set/unset)
  setVersion(versionId: string | null): void
  setFlag(flagId: string, value: unknown): void
  unsetFlag(flagId: string): void
  clearAll(): void  // updated: also resets version + flags
  // (existing actions unchanged)
}
```

**Why keep flagValues and setFlags separate:** D-06 says "set to default value still emits." Storing `isSet` independently ensures a flag with value `0` and `isSet: true` still serializes `--stylize 0`. There is no ambiguity from merging set-state with value.

### Pattern 6: Version-Switch Conflict Handling (Claude's Discretion)

**Recommended: Hide-but-retain (non-destructive)**

When the user switches from V7 to a version that doesn't support a flag already set:
1. The flag's `setFlags[flagId] = true` remains unchanged in the store
2. The flag's `flagValues[flagId]` remains unchanged  
3. The UI filters by `getFlagsForVersion(selectedVersionId)` — the control disappears
4. The serializer also filters: only emit flags where both `isSet=true` AND `flagId` is in the active version's `supportedFlagIds`
5. When switching back to a compatible version, the control reappears with the retained value

This requires the serializer to know the active version. **Recommend:** Store `selectedVersionId` in `BuildSessionState` and pass it alongside `draft.flags` when deriving the prompt. The cleanest approach: add it as a field on `PromptDraft` (or pass it as a second argument to `serialize`). Given `PromptDraft.schemaVersion` is a literal `1`, adding a field would require bumping to `2`. Alternative: pass `selectedVersionId` as a second argument to `serialize()`.

**Planner decision point:** Choose whether to extend `PromptDraft` (bump schemaVersion to 2) or pass version as a second argument to `serialize()`. The Phase 3 library saves `PromptDraft`, so including `selectedVersionId` in the model is slightly better for library reload (LIB-03). However, bumping schema version now means migrating Phase 1 test fixtures. Recommend adding `selectedVersionId: string | null` to `PromptDraftSchema` with `schemaVersion: z.literal(2)` — Phase 2 is the right place for this since it introduces the field.

### Anti-Patterns to Avoid

- **Hardcoding flag validation in component code:** All ranges (0-1000, 0-100, etc.) must come from `FlagDefinition.control`, not constants in component files. This is FLG-01's whole point.
- **Using HTML range input for seed:** `--seed` max is 4,294,967,295. HTML `<input type="range">` loses precision at high values in JS (float64 integer limit is safe at this range, but sliders are impractical UX for 4B values). Use `NumberField` from @base-ui/react.
- **Filtering flags ONLY in UI:** If the UI hides a control for an unsupported version but the serializer doesn't also check, a retained flag value from a previously-supported version will still appear in the output. Both UI and serializer must gate by version.
- **Passing raw user text from `--no` directly to serializer:** Must route through `sanitize()` before storing. The sanitize function strips `--` sequences that could inject additional flags.
- **Forgetting to clear flags in `clearAll()`:** The existing `clearAll` only resets intent + chips. Phase 2 must extend it to also reset `selectedVersionId`, `flagValues`, and `setFlags`. BLD-06 (clear/reset) must clear flags too.
- **Using `dangerouslySetInnerHTML` to render flag values:** LLM/user content in `--no` must render as text, not HTML.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible slider | Custom `<div>` range widget | `@base-ui/react/slider` (already installed) | Keyboard nav, aria-valuemin/max/now, touch handling — all free |
| Numeric stepper for seed | Custom increment/decrement buttons | `@base-ui/react/number-field` (already installed) | Built-in scrubbing, keyboard up/down, min/max clamping |
| Accessible select/dropdown | Custom dropdown with keyboard nav | `@base-ui/react/select` (already installed) | Focus trap, arrow key navigation, screen reader announcements |
| Custom w:h validation | Regex-only client validation | Validate + sanitize: `/^\d+:\d+$/` check + `sanitize()` call | Both format check AND injection prevention needed; two distinct operations |

**Key insight:** @base-ui/react 1.6.0 is already in `node_modules` with all needed primitives. Zero new packages. The shadcn CLI only adds styled wrapper files in `src/components/ui/`.

---

## Midjourney Flag Reference

> **Confidence: MEDIUM** — Official docs return HTTP 403. Data sourced from a combination of unofficial reference sites. The data-driven architecture means correcting a value range is a one-line config edit. Treat all ranges and version support lists as `[ASSUMED]` and user-verify before marking phase complete.

### Core Flags (Phase 2 scope)

| Flag | Param | Type | Range | Default | MJ Syntax Example |
|------|-------|------|-------|---------|-------------------|
| Aspect Ratio | `--ar` | `W:H` string | any positive integers | 1:1 (square) | `--ar 16:9` |
| Version | `--v` | select | see versions table | V8.1 (as of 2026) | `--v 7` |
| Niji | `--niji` | select | 6, 7 | — | `--niji 7` |
| Stylize | `--stylize` / `--s` | integer | 0–1000 | 100 | `--stylize 250` |
| Chaos | `--chaos` / `--c` | integer | 0–100 | 0 | `--chaos 30` |
| Seed | `--seed` | integer | 0–4,294,967,295 | random | `--seed 12345` |
| Negative | `--no` | text | free text | — | `--no text, watermark` |

**Important:** `--v` and `--niji` are mutually exclusive — using one invalidates the other in MJ. The version selector must emit either `--v N` or `--niji N`, never both. [ASSUMED: based on MJ community documentation]

### Version Coverage at Launch (Recommendation)

| Version ID | Label | MJ Parameter | Status |
|------------|-------|--------------|--------|
| `v8.1` | V8.1 (Latest) | `--v 8.1` | Default as of June 2026 [ASSUMED] |
| `v7` | V7 | `--v 7` | Stable, widely used [ASSUMED] |
| `v6.1` | V6.1 | `--v 6.1` | Still in active use [ASSUMED] |
| `niji7` | Niji 7 | `--niji 7` | Current anime model [ASSUMED] |
| `niji6` | Niji 6 | `--niji 6` | Legacy anime, still selectable [ASSUMED] |

**Rationale for excluding V6.0 and earlier:** V6.1 superseded V6.0 with identical parameter support; V5 and earlier are too old for current prompt workflows. The data-driven architecture makes adding them later a config edit.

### Aspect Ratio Presets (Recommended Set)

| Preset | Use Case |
|--------|----------|
| 1:1 | Square (Instagram, profile) |
| 4:5 | Portrait (Instagram feed) |
| 3:2 | Classic photography / landscape |
| 2:3 | Portrait print |
| 16:9 | Widescreen / YouTube |
| 9:16 | Vertical / mobile / Stories |
| 21:9 | Cinematic ultrawide |

Custom entry: `W:H` free text, validated with `/^\d+:\d+$/` before storing. [ASSUMED: valid MJ accepts any positive integer ratio]

### Flag Tail Syntax Order

MJ does not document a required parameter order, but conventional community practice (and readability) is: `--v` / `--niji` → `--ar` → `--stylize` → `--chaos` → `--seed` → `--no`. [ASSUMED]

The serializer should enforce this order deterministically regardless of the order flags were set by the user (D-04 determinism). Enforce via explicit ordering in the draft derivation step.

---

## Common Pitfalls

### Pitfall 1: Slider for Seed
**What goes wrong:** Using a slider for `--seed` (max 4,294,967,295). Sliders for billion-scale ranges are impractical UX and, while JS number precision is safe for integers up to 2^53, a slider's drag interaction has essentially no precision at this scale.
**Why it happens:** Reusing the slider pattern from stylize/chaos without checking the value range.
**How to avoid:** Use `NumberField` from `@base-ui/react` for seed — typed number input with increment/decrement, respecting `min`/`max` from the flag definition.
**Warning signs:** Flag definition shows `max: 4294967295` and control type `slider` in the same object.

### Pitfall 2: Flag Values Surviving Version Switches Into the Serialized Output
**What goes wrong:** User sets `--chaos 80` on V7, switches to a version where chaos is not in `supportedFlagIds`, and the serialized prompt still includes `--chaos 80` because only the UI hides the control.
**Why it happens:** Version gating applied only in the UI render (not in the serializer path).
**How to avoid:** Both `getFlagsForVersion()` in the UI AND the serializer's flag-emission loop must filter by `VERSION_DEFINITIONS[versionId].supportedFlagIds`. If in doubt: write a unit test for `serialize()` that sets a flag and then provides a version that doesn't support it, and assert the flag is absent.
**Warning signs:** `serialize.ts` does not import any version-checking function.

### Pitfall 3: Custom w:h Input Allows Injection
**What goes wrong:** User enters `16:9 --stylize 999` in the custom AR input. Without validation, this would serialize as `--ar 16:9 --stylize 999 --stylize 250`, injecting a duplicate flag.
**Why it happens:** `sanitize()` strips `--` patterns (converts to `-`), but the AR field might not call sanitize before storing, or the stored value includes a raw `--`.
**How to avoid:** Validate AR format strictly with `/^\d+:\d+$/` and reject non-matching input at the UI level. Also route through `sanitize()` before storing. The format validation makes injection structurally impossible; sanitize is defense-in-depth.
**Warning signs:** AR custom input stores the raw `event.target.value` without validation.

### Pitfall 4: clearAll() Omits Flags
**What goes wrong:** User hits "Clear" (BLD-06), resets intent and chips, but flag controls still show previously-set values and the serialized output still includes flags.
**Why it happens:** The existing `clearAll` action in `buildSession.ts` only resets `intent` and `chips`. Phase 2 adds `selectedVersionId`, `flagValues`, `setFlags` — all of which must be cleared.
**How to avoid:** Update `clearAll` in the same PR/task as adding flag state. Verify with a test: set a flag, call `clearAll`, assert `flagValues` is `{}` and `selectedVersionId` is `null`.

### Pitfall 5: Version Stored as Display Label Instead of ID
**What goes wrong:** The version select stores `'V7'` (label) as the selected version. The serializer or helper function does a `VERSION_DEFINITIONS.find(v => v.id === 'V7')` — which returns `undefined` because the actual id is `'v7'`.
**Why it happens:** The Select component's `value` is wired to the label text rather than the `id` field.
**How to avoid:** Use `VersionDefinition.id` as the `<SelectItem value>`. Never use labels as data identifiers.

### Pitfall 6: `--no` Content Sanitization Gap
**What goes wrong:** User enters `--no trees --ar 16:9` in the No Exclude field. If not sanitized, the output becomes `--no trees --ar 16:9` which MJ would parse as separate parameters, not as the intended negative list.
**Why it happens:** Free-text input is passed directly to serialization without `sanitize()`.
**How to avoid:** Route `--no` value through `sanitize()` before storing in `flagValues`. `sanitize()` converts `--ar` to `-ar`, preventing the injection. The stored value should be `trees -ar 16:9` — less dangerous but still not what the user wanted. Consider also showing a validation hint if the input contains `--` patterns before sanitization.
**Warning signs:** TextFlagControl stores `e.target.value` directly into the store without calling `sanitize`.

---

## Code Examples

### Base UI Slider Usage

```typescript
// Source: https://base-ui.com/react/components/slider (verified via WebFetch)
import { Slider } from '@base-ui/react/slider'

// FlagDefinition.control for type='slider' provides min, max, step
function SliderFlagControl({
  def,
  value,
  isSet,
  onChange,
  onClear,
}: {
  def: FlagDefinition & { control: { type: 'slider'; min: number; max: number; step: number } }
  value: number
  isSet: boolean
  onChange: (v: number) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{def.label}</label>
        {isSet && (
          <button onClick={onClear} aria-label={`Clear ${def.label}`}>×</button>
        )}
      </div>
      <Slider.Root
        value={value}
        min={def.control.min}
        max={def.control.max}
        step={def.control.step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        disabled={!isSet}
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb aria-label={def.label} />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <span className="text-sm text-muted-foreground">{isSet ? value : '—'}</span>
    </div>
  )
}
```

### Base UI NumberField Usage (for seed)

```typescript
// Source: https://base-ui.com/react/components/number-field (verified via WebFetch)
import { NumberField } from '@base-ui/react/number-field'

// value can be null when unset (D-05)
function NumberFlagControl({ def, value, isSet, onChange, onClear }) {
  return (
    <NumberField.Root
      value={isSet ? value : null}
      min={def.control.min}
      max={def.control.max}
      onValueChange={(v) => {
        if (v !== null) onChange(v)
      }}
    >
      <NumberField.Group>
        <NumberField.Decrement>−</NumberField.Decrement>
        <NumberField.Input placeholder="random" />
        <NumberField.Increment>+</NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  )
}
```

### Serializer Extension Point

```typescript
// src/domain/prompt/serialize.ts — Phase 2 extension (fills stub at line 31)
// Flags are space-separated; the descriptor block (intent + chips) uses ", "
// Output format: "a cat, cinematic --ar 16:9 --stylize 250 --no text"

const flagParts: string[] = []

// Version first (special: comes from selectedVersionId, not from FLAG_DEFINITIONS)
if (draft.selectedVersionId) {
  const vParam = getVersionParameter(draft.selectedVersionId)
  if (vParam) flagParts.push(vParam)
}

// Remaining flags in canonical order (ar, stylize, chaos, seed, no)
// draft.flags contains only set flags, already filtered by version compatibility
for (const { flagId, value } of draft.flags) {
  const fragment = serializeFlag(flagId, value)
  if (fragment) flagParts.push(fragment)
}

const descriptors = parts.join(', ')
return flagParts.length > 0
  ? (descriptors ? `${descriptors} ${flagParts.join(' ')}` : flagParts.join(' '))
  : descriptors
```

### Aspect Ratio Custom Input Validation

```typescript
// Validate before storing — reject, don't sanitize-and-corrupt the ratio format
const AR_PATTERN = /^\d+:\d+$/

function validateAspectRatio(input: string): string | null {
  const trimmed = input.trim()
  if (!AR_PATTERN.test(trimmed)) return null
  const [w, h] = trimmed.split(':').map(Number)
  if (w === 0 || h === 0) return null
  return trimmed  // valid: "16:9", "3:2", "1920:1080"
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `--v 4` / `--v 5` as default | `--v 8.1` is new default (June 2026), `--v 7` is stable default for production | June 2026 | Version picker must include V8.1; earlier guides showing V4/V5 are stale |
| Radix UI primitives in shadcn | `@base-ui/react` primitives in shadcn "base-nova" style | 2025 | Import paths differ — use `@base-ui/react/slider` not `@radix-ui/react-slider` |
| `--v` and `--niji` as separate parameter categories | Still mutually exclusive; select one version model at a time | — | UI must treat version + niji as a single selector, not two independent flags |

**Deprecated/outdated:**
- V6.0: Superseded by V6.1; do not include as a separate option
- V5.x and earlier: Ancient by current MJ standards; exclude from version picker
- Older shadcn guides using `@radix-ui/*` imports: This project uses `@base-ui/react`; slider/select components will import from `@base-ui/react/slider`, `@base-ui/react/select`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `--stylize` range is 0–1000 for all supported versions (V6.1/V7/V8.1/Niji) | Flag Reference | Slider max would be wrong; fix is one-line data edit in definitions.ts |
| A2 | `--chaos` range is 0–100 for all supported versions | Flag Reference | Same as A1 |
| A3 | `--seed` max is 4,294,967,295 (32-bit unsigned integer) | Flag Reference | NumberField max would be wrong; fix is one-line data edit |
| A4 | V8.1 is the current default MJ version as of June 2026 | Version Coverage | Version ordering in UI would be off; fix is reordering the versions array |
| A5 | `--v` and `--niji` are mutually exclusive | Flag Reference | Would need two separate selectors or different UI layout |
| A6 | `--stylize` applies to Niji 7 and Niji 6 (same range) | Version Coverage | Niji versions might have different ranges or not support --stylize; fix is updating `supportedFlagIds` |
| A7 | MJ accepts any positive integer `W:H` ratio for `--ar` | AR custom input | Might have undocumented max ratio limits; edge cases won't break syntax but may produce odd results |
| A8 | Flag tail order (version → ar → stylize → chaos → seed → no) is valid | Serializer | MJ likely accepts any order, so this is a UX convention choice, not a correctness requirement |
| A9 | `--v 8.1` is the correct syntax (not `--v 8` or `--version 8.1`) | Version Coverage | Wrong syntax would produce an error in MJ; user can verify by testing one generation |

---

## Open Questions

1. **PromptDraft schema version bump**
   - What we know: `selectedVersionId` needs to be available to `serialize()` — either as a `PromptDraft` field or a second argument
   - What's unclear: Phase 3 saves/loads `PromptDraft`; adding a new field now is cheaper than retrofitting later, but bumping `schemaVersion` from 1 to 2 requires updating all test fixtures
   - Recommendation: Add `selectedVersionId: z.string().nullable().default(null)` to `PromptDraftSchema` and bump to `schemaVersion: z.literal(2)`. Update test fixtures in the same plan wave. This is the cleanest seam for Phase 3 library reload (LIB-03).

2. **Niji parameter support exactness**
   - What we know: Niji 7 and Niji 6 support core parameters but may have different ranges or exclude some flags vs standard V7
   - What's unclear: Whether `--stylize` works on both niji 6 and niji 7 with the same 0-1000 range
   - Recommendation: Include niji in `availableOn` for all 5 flags at MVP launch with a user checkpoint to verify; the data-driven structure makes per-version exclusions a config edit.

3. **Slider "enable on first interaction" vs "requires explicit set" UX**
   - What we know: D-05 requires explicit set/unset state; a slider shows a position even when "unset"
   - What's unclear: Whether the slider should be visually disabled until the user activates it (clicks an enable toggle/checkbox) vs immediately responsive
   - Recommendation: Add an activate toggle/checkbox per flag. When unset: slider is dimmed/disabled with a greyed track. When user clicks the toggle, the flag becomes set at the current slider position. This makes D-05 explicit without requiring a separate "clear" affordance on top of a disabled slider.

---

## Environment Availability

Step 2.6: SKIPPED — This phase is code/config-only changes within the existing web SPA. No external tools, services, CLIs, or runtimes beyond what Phase 1 already verified.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vitest.config.ts` (root) |
| Environment | happy-dom |
| Setup file | `src/test/setup.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLG-01 | FLAG_DEFINITIONS contains all 5 flags with correct structure | unit | `npx vitest run src/domain/flags/` | ❌ Wave 0 |
| FLG-01 | Each FlagDefinition validates against FlagDefinitionSchema | unit | `npx vitest run src/domain/flags/schema.test.ts` | ❌ Wave 0 |
| FLG-02 | SliderFlagControl renders with correct min/max from definition | unit | `npx vitest run src/ui/ControlsPane/FlagControls/` | ❌ Wave 0 |
| FLG-02 | setFlag / unsetFlag actions update store state correctly | unit | `npx vitest run src/state/buildSession.test.ts` | ❌ Wave 0 |
| FLG-03 | AR presets produce correct `--ar W:H` output | unit | `npx vitest run src/domain/flags/helpers.test.ts` | ❌ Wave 0 |
| FLG-03 | validateAspectRatio rejects malformed input | unit | `npx vitest run src/domain/flags/helpers.test.ts` | ❌ Wave 0 |
| FLG-04 | getFlagsForVersion returns only flags with matching availableOn | unit | `npx vitest run src/domain/flags/helpers.test.ts` | ❌ Wave 0 |
| FLG-04 | Version-switch hides unsupported flag controls | unit (component) | `npx vitest run src/ui/ControlsPane/FlagControls/FlagControls.test.tsx` | ❌ Wave 0 |
| FLG-05 | serialize() emits set flags in correct MJ syntax at prompt tail | unit | `npx vitest run src/domain/prompt/serialize.test.ts` | ✅ (extend existing) |
| FLG-05 | serialize() omits unset flags (D-04) | unit | `npx vitest run src/domain/prompt/serialize.test.ts` | ✅ (extend existing) |
| FLG-05 | serialize() emits flag set to default value (D-06) | unit | `npx vitest run src/domain/prompt/serialize.test.ts` | ✅ (extend existing) |
| FLG-05 | serialize() does not emit flags unsupported by active version | unit | `npx vitest run src/domain/prompt/serialize.test.ts` | ✅ (extend existing) |
| BLD-06 | clearAll() resets selectedVersionId and flagValues | unit | `npx vitest run src/state/buildSession.test.ts` | ❌ Wave 0 |
| ASM-03 | sanitize() on --no value strips -- injection | unit | `npx vitest run src/domain/prompt/sanitize.test.ts` | ✅ (existing, verify covers this case) |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/domain/flags/schema.test.ts` — FLG-01: validates FlagDefinitionSchema + VersionDefinitionSchema
- [ ] `src/domain/flags/helpers.test.ts` — FLG-03, FLG-04: getFlagsForVersion, serializeFlag, validateAspectRatio, getVersionParameter
- [ ] `src/state/buildSession.test.ts` — FLG-02, BLD-06: setFlag, unsetFlag, clearAll flags reset
- [ ] `src/ui/ControlsPane/FlagControls/FlagControls.test.tsx` — FLG-04: version gating hides controls

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | `sanitize()` chokepoint for `--no` and custom w:h; `validateAspectRatio()` for format |
| V6 Cryptography | no | — |

### Known Threat Patterns for Flag Input

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| MJ flag injection via `--no` field (e.g. user types `trees --ar 16:9`) | Tampering | Route through `sanitize()` before storing; `sanitize()` converts `--` → `-` |
| Aspect ratio injection (e.g. `1:1 --stylize 999`) | Tampering | Validate with `/^\d+:\d+$/` regex first; reject non-matching input |
| XSS via rendered flag values in LivePreview | Spoofing | LivePreview renders as text (existing pattern from Phase 1); no `dangerouslySetInnerHTML` |
| Overly long `--no` input slowing serialization | Denial of Service | `maxLength: 500` in TextControlSchema; validated in component |

**Key CLAUDE.md constraint:** Custom `w:h` and `--no` values are explicitly called out as untrusted in the Security Implications section. Both must route through `sanitize()`. This is defense-in-depth alongside format validation.

---

## Sources

### Primary (HIGH confidence)
- Actual codebase files — `src/domain/prompt/model.ts`, `serialize.ts`, `sanitize.ts`, `src/state/buildSession.ts`, `src/ui/App.tsx`, `package.json`, `components.json`, `node_modules/@base-ui/react/package.json` exports map — all read directly and verified
- `@base-ui/react` official docs — https://base-ui.com/react/components/slider (Slider API), https://base-ui.com/react/components/number-field (NumberField API) — fetched and verified

### Secondary (MEDIUM confidence)
- Midjourney parameter reference — https://blakecrosley.com/guides/midjourney — unofficial but comprehensive; cross-referenced against multiple web search results for stylize range (0-1000), chaos range (0-100), seed max (0-4,294,967,295)
- shadcn/ui slider and select docs — https://ui.shadcn.com/docs/components/slider, https://ui.shadcn.com/docs/components/select — for CLI install commands and import patterns

### Tertiary (LOW confidence — flag as needing user validation)
- Midjourney version availability (V8.1, V7, V6.1, Niji 7, Niji 6) — multiple web search results confirm V7 default changed June 2026 and V8.1 became new default, but exact current default unverifiable without MJ account
- Official Midjourney docs (https://docs.midjourney.com) — returned HTTP 403 for all attempts; all MJ parameter facts are from unofficial sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against node_modules and package.json
- Architecture patterns: HIGH — derived from existing Phase 1 code patterns (verified) + @base-ui/react docs (verified)
- Midjourney flag data: MEDIUM — unofficial sources only; official docs auth-gated
- Pitfalls: HIGH — derived from code analysis of sanitize.ts, serialize.ts, and model.ts

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (MJ parameter matrix can shift with model releases; re-verify if more than 30 days pass)
