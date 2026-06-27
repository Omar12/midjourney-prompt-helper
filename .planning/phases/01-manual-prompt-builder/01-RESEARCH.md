# Phase 1: Manual Prompt Builder - Research

**Researched:** 2026-06-26
**Domain:** Vite 8 + React 19 + TypeScript + Zod 4 + Zustand 5 + Tailwind v4 + shadcn/ui — pure-function domain core (model, serializer, escaping) + two-pane UI + clipboard
**Confidence:** HIGH (stack verified on npm, Tailwind v4 + shadcn/ui setup confirmed via official docs, Zustand 5 pattern verified, Clipboard API behavior confirmed via MDN/W3C)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Emit **intent text first, then chips appended**, matching Midjourney convention.
- **D-02:** Join all segments with **`, ` (comma + space)** — the standard MJ descriptor separator.
- **D-03:** Treat the **intent as one opaque block** — passed through verbatim (after escaping) as a single segment. The serializer does NOT split the user's intent on their own commas.
- **D-04:** Serializer must be **deterministic and pure** (same `PromptDraft` → same string). This is the contract Phases 2–4 extend (flags append at the tail, palette chips reuse the chip path).
- **D-05:** **Silently sanitize** — clean the output automatically, never block the user.
- **D-06:** Neutralize MJ-significant doubles by **collapsing to a single char**: `::` → `:`, `--` → `-`.
- **D-07:** Sanitize scope = **all risky tokens**: `::`, `--`, leading/trailing commas, and newlines (collapse to spaces).
- **D-08:** Escaping applies to all user-provided text (intent + custom chip labels). Design the escape function as the **single chokepoint** so Phase 4 AI-supplied content routes through the same path.
- **D-09:** **Two-pane layout** — controls (intent input + chips + actions) on the left, **sticky always-visible live-preview panel** on the right.
- **D-10:** **Copy button lives on the preview panel**; on copy it **flips to "Copied!" briefly** then reverts.
- **D-11:** **Clear/reset confirms when there is content** in the builder; no-op or instant when already empty.

### Claude's Discretion

- Custom chip mechanics: default to plain text-label chips, click-to-remove, dedup identical labels, order = insertion order.
- `PromptDraft` model shape: exact TypeScript/Zod structure left to research/planning.
- Empty/placeholder states and exact copy/microcopy: standard sensible defaults.
- Two-pane responsive collapse on narrow viewports: stack to single column on mobile is acceptable.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (Flags, library, AI palettes, and desktop are already separate roadmap phases.)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BLD-01 | User can enter a plain-language intent in a single input field | Controlled `<textarea>` bound to Zustand `intent` field; Tailwind v4 + shadcn/ui `Textarea` component |
| BLD-03 | User can deselect/remove a previously added chip | `removeChip(id)` action in Zustand; chip renders with ✕ button; `enabled` flag on Chip model |
| BLD-04 | User can add a custom chip not offered by a palette | Text input + Add button; `addChip(label)` action deduplicates by label |
| BLD-05 | User sees a live preview of the assembled prompt string as they build | Preview derived from Zustand state via `serialize()` on every render; never stored separately |
| BLD-06 | User can clear/reset the builder to start a new prompt | `clearAll()` action; shadcn/ui `AlertDialog` for confirmation when content present (D-11) |
| BLD-07 | User can copy the final prompt to the clipboard | `navigator.clipboard.writeText()` in click handler; "Copied!" state feedback via `useState` + `setTimeout` |
| ASM-01 | Deterministic prompt string from intent, chips, and flag values with correct ordering | Pure `serialize(draft)` function: intent block → chips in order → flags (tail, Phase 2) joined by `, ` |
| ASM-02 | Prompt string built from canonical structured model (re-editable), not stored as text | `PromptDraft` Zod schema is canonical; the string is always derived, never the source of truth |
| ASM-03 | Special characters escaped so they cannot break Midjourney syntax | Single `sanitize(text)` utility: newlines→space, `::`→`:`, `--`→`-`, strip leading/trailing commas |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield walking skeleton: scaffold the project, define three seams everything downstream consumes (the `PromptDraft` model, the deterministic serializer, and the live-preview build loop), and deliver a working single-page UI where the user can type an intent, add chips, see a live prompt preview, copy it, and clear. No AI SDK, no Dexie, no Tauri — only the domain core and UI.

The primary technical concern is designing the `PromptDraft` Zod schema to be minimal today and extensible without breaking changes through Phases 2–4. The key insight: keep `intent` as a separate top-level field (not a chip), give chips a `source: 'custom' | 'palette'` discriminator, and include an empty `flags: []` array from the start so Phase 2 can populate it without a schema reshape. All strings pass through a single `sanitize()` utility before entering the serializer — this is the architectural chokepoint that makes Phase 4's AI-supplied content safe by default.

The stack setup has one meaningful gotcha: Tailwind v4 is a CSS-first config (no `tailwind.config.js`), and shadcn/ui v4.12 ships with `tw-animate-css` (not `tailwindcss-animate`). Everything else is a standard Vite + React 19 + TypeScript scaffold.

**Primary recommendation:** Domain core first (model → sanitize → serialize, with tests), then Zustand store, then UI. Tests for the serializer and sanitizer are the highest-ROI tests in the project and should be written before the UI is built.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Intent text capture | Browser / Client | — | Controlled textarea, no server needed; local form state |
| Chip add/remove/dedup | Browser / Client | — | Pure UI interactions; state lives in Zustand store |
| PromptDraft model + schema | Domain Core (pure TS) | — | Zero-dependency; same model used by UI, Phase 3 persistence, Phase 4 AI mapper |
| Serializer (model → string) | Domain Core (pure TS) | — | Pure function; no I/O; deterministic contract that Phases 2–4 extend |
| Sanitize utility (escaping) | Domain Core (pure TS) | — | Chokepoint shared by UI inputs and Phase 4 AI content |
| Live preview derivation | Browser / Client | — | Derived selector from Zustand state; no store mutation |
| Copy to clipboard | Browser / Client | — | `navigator.clipboard` in a click handler; ClipboardAdapter port deferred to Phase 5 |
| Clear/reset confirmation | Browser / Client | — | shadcn/ui AlertDialog; pure UI state |
| Build/dev tooling | Build (Vite 8) | — | Vite 8 + @vitejs/plugin-react + @tailwindcss/vite; no server runtime |

---

## Standard Stack

### Core (Phase 1 only — no AI SDK, Dexie, or Tauri yet)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 6.0.3 | Language | Zod-inferred types flow through the entire domain core with no manual typing |
| Vite | 8.1.0 | Build / dev server | Standard SPA bundler; Rolldown-integrated in v8; `react-ts` template is the scaffold start |
| React + react-dom | 19.2.7 | UI framework | No forwardRef in v19; direct props on Radix primitives |
| @vitejs/plugin-react | 6.0.3 | JSX transform (Babel) | Official Vite React plugin; SWC variant (`plugin-react-swc`) also works |
| Zod | 4.4.3 | Schema + runtime validation | Defines `PromptDraft` shape; infers TS types; validates Phase 3 saved records |
| Zustand | 5.0.14 | UI/session state | Holds the in-progress draft; live-preview derived from store via selector |
| Tailwind CSS + @tailwindcss/vite | 4.3.1 | Styling | CSS-first config; Vite plugin (no PostCSS, no tailwind.config.js needed) |
| shadcn/ui (CLI adds components) | 4.12.0 | Accessible copy-in components | `Button`, `Textarea`, `AlertDialog`, `Badge` — you own the code |

[VERIFIED: npm registry] for all versions above — confirmed via `npm view` in this session.

### Supporting (dev/test only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.9 | Unit test runner (Vite-native) | All domain-core tests (serializer, sanitizer) |
| @vitest/coverage-v8 | 4.1.9 | Coverage via V8 | `vitest run --coverage` in CI gate |
| @testing-library/react | 16.3.2 | React component testing | Copy button feedback, clear confirm dialog |
| @testing-library/user-event | 14.6.1 | Simulated user events | Typing intent, clicking Add/Copy/Clear |
| happy-dom | 20.10.6 | Fast DOM environment for vitest | Faster than jsdom for unit tests; sufficient for Phase 1 |
| @types/node | current | Node types for path alias in vite.config.ts | Required for `import path from 'path'` in config |

[VERIFIED: npm registry] for all versions above — confirmed via `npm view` in this session.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| happy-dom (test env) | jsdom | jsdom is more complete (more Web APIs); happy-dom is faster; for Phase 1's pure-function tests, either works — happy-dom preferred for speed |
| @vitejs/plugin-react (Babel) | @vitejs/plugin-react-swc | SWC is faster for large projects; Babel needed if custom Babel plugins are required; either works here |
| shadcn/ui AlertDialog | custom confirm dialog | shadcn/ui gives accessibility (focus trap, keyboard escape) for free |

**Installation:**
```bash
# Step 1: Scaffold
npm create vite@latest midjourney-prompt-helper -- --template react-ts
cd midjourney-prompt-helper

# Step 2: Core dependencies
npm install zod zustand

# Step 3: Tailwind v4 + Vite plugin
npm install tailwindcss @tailwindcss/vite

# Step 4: shadcn/ui (run after Tailwind is set up)
npx shadcn@latest init

# Step 5: Add shadcn/ui components used in Phase 1
npx shadcn@latest add button textarea alert-dialog badge input

# Step 6: Dev/test tooling
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event happy-dom @types/node
```

---

## Package Legitimacy Audit

> slopcheck installed and run. Note: slopcheck checks against PyPI by default; this is a Node.js project. All packages verified directly on npm registry (the correct ecosystem) via `npm view` — the cross-ecosystem confusion described in the Package Legitimacy Protocol does not apply here.

| Package | Registry | Age | slopcheck (npm context) | Disposition |
|---------|----------|-----|------------------------|-------------|
| vite | npm | ~6 yrs (2020) | OK — official Vite project | Approved |
| @vitejs/plugin-react | npm | ~4 yrs (2021) | OK — official Vite org | Approved |
| react / react-dom | npm | ~11 yrs | OK — Meta/Facebook, massive downloads | Approved |
| typescript | npm | ~12 yrs | OK — Microsoft | Approved |
| zod | npm | ~4 yrs | OK — pmndrs/zod, 15M+/wk downloads | Approved |
| zustand | npm | ~5 yrs | OK — pmndrs, 8M+/wk | Approved |
| tailwindcss | npm | ~7 yrs | OK — Tailwind Labs | Approved |
| @tailwindcss/vite | npm | ~1 yr | OK — official Tailwind Labs plugin | Approved |
| vitest | npm | ~4 yrs (2021) | OK — official Vite/vitest project | Approved |
| @vitest/coverage-v8 | npm | ~3 yrs | OK — official vitest org | Approved |
| @testing-library/react | npm | ~6 yrs (2019) | OK — testing-library org | Approved |
| @testing-library/user-event | npm | ~6 yrs | OK — testing-library org | Approved |
| happy-dom | npm | ~5 yrs (2019) | OK — capricorn86/happy-dom | Approved |
| class-variance-authority | npm | ~3 yrs | OK — shadcn/ui ecosystem dep | Approved |
| clsx | npm | ~7 yrs | OK — Luke Edwards, 20M+/wk | Approved |
| tailwind-merge | npm | ~3 yrs | OK — used by shadcn/ui | Approved |
| lucide-react | npm | ~4 yrs | OK — Lucide org | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No postinstall scripts found on any of the above packages.

---

## Architecture Patterns

### System Architecture Diagram

```
User Input (intent text, chip label)
           │
           ▼
   ┌───────────────────────────────────────┐
   │         sanitize(text)                 │  ← SINGLE CHOKEPOINT (D-08)
   │  newlines→space, ::→:, --→-, trim     │  ← Phase 4 AI content also routes here
   └───────────────┬───────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
   intent field           chip.label
         │                    │
         └─────────┬──────────┘
                   │
                   ▼
   ┌───────────────────────────────────────┐
   │          PromptDraft (Zustand)         │
   │  intent: string                        │
   │  chips: Chip[]   (source: 'custom')   │
   │  flags: []       (Phase 2 adds here)  │
   └───────────────┬───────────────────────┘
                   │
                   ▼
   ┌───────────────────────────────────────┐
   │    serialize(draft): string           │  ← PURE, DETERMINISTIC (D-04)
   │  [intent], [chip1], [chip2], ...      │  ← joined by ", " (D-02)
   │  flags tail appended in Phase 2       │
   └───────────────┬───────────────────────┘
                   │
     ┌─────────────┴──────────────┐
     │  Live Preview (derived)     │
     │  Re-computes on every state │
     │  change; never stored        │
     └──────────┬──────────────────┘
                │
                ▼
   navigator.clipboard.writeText()
   (on Copy button click — user gesture required)
```

### Recommended Project Structure

```
src/
├── domain/                    # Pure TS, zero I/O, zero framework — testable in Node
│   └── prompt/
│       ├── model.ts           # PromptDraft, Chip, FlagValue types + Zod schemas
│       ├── sanitize.ts        # escape() — the single chokepoint utility
│       └── serialize.ts       # serialize(draft) → string — deterministic pure fn
├── state/
│   └── buildSession.ts        # Zustand store: intent, chips, addChip, removeChip, clearAll
├── ui/
│   ├── ControlsPane/
│   │   ├── IntentInput.tsx    # Controlled textarea for intent
│   │   ├── ChipInput.tsx      # Text input + Add button for custom chips
│   │   └── ChipArea.tsx       # Chip badges with ✕ remove; insertion-order list
│   ├── PreviewPane/
│   │   ├── LivePreview.tsx    # Derived serialize() output — no state of its own
│   │   └── CopyButton.tsx     # Calls clipboard.writeText(); flips to "Copied!"
│   ├── ClearDialog.tsx        # AlertDialog confirm — shown when content present
│   └── App.tsx                # Two-pane layout: left=Controls, right=Preview (sticky)
├── test/
│   └── setup.ts               # @testing-library/jest-dom + afterEach cleanup
├── main.tsx
└── index.css                  # @import "tailwindcss"; + :root CSS vars for shadcn
```

### Pattern 1: PromptDraft — Minimal + Forward-Compatible Zod Schema

**What:** `intent` is a separate top-level field (not a chip) enforcing D-03. Chips have a `source` discriminator so Phase 4 can add `'palette'` chips without any schema reshape. `flags: []` exists from Phase 1 so Phase 2 can populate it without a breaking change.

**Why `intent` is not a chip:** D-03 says intent is "one opaque block." Modeling it as a first chip with a special source would require the serializer to do source-filtering for ordering, which is more fragile. Keeping intent as a top-level field makes the D-01 contract explicit in the type system.

```typescript
// Source: [ASSUMED] — derived from CONTEXT.md D-01..D-04 and project ARCHITECTURE.md
// src/domain/prompt/model.ts

import { z } from 'zod'

export const ChipSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
  source: z.enum(['custom', 'palette']),  // 'palette' used in Phase 4
  paletteCategory: z.string().optional(), // Phase 4: "camera", "style", etc.
  enabled: z.boolean().default(true),     // toggle without deleting
})

export const FlagValueSchema = z.object({
  flagId: z.string(),   // references FlagDefinition.id in Phase 2
  value: z.unknown(),
})

export const PromptDraftSchema = z.object({
  id: z.string().uuid(),
  intent: z.string().max(2000),           // opaque block, not split
  chips: z.array(ChipSchema),             // insertion-ordered discrete descriptors
  flags: z.array(FlagValueSchema),        // empty in Phase 1; Phase 2 populates
  schemaVersion: z.literal(1),            // bump on breaking changes; enables migration
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Chip = z.infer<typeof ChipSchema>
export type FlagValue = z.infer<typeof FlagValueSchema>
export type PromptDraft = z.infer<typeof PromptDraftSchema>
```

**Forward-compatibility guarantees:**
- Phase 2 (flags): adds entries to the `flags: []` array — no reshape needed
- Phase 3 (library): saves/reloads `PromptDraft` verbatim — model is already the right shape
- Phase 4 (palette chips): adds chips with `source: 'palette'` — discriminator already in schema
- If schema must change: bump `schemaVersion` and write a migration in Phase 3's persistence layer

### Pattern 2: Sanitize — Single Chokepoint Utility

**What:** Pure function that strips all MJ-syntax-breaking characters from a string. Called on intent and each chip label before they enter the serializer. Phase 4 AI-supplied chip labels route through the same function.

**Sanitization order matters:**

1. Newlines first (before special char ops, to avoid `\n--` patterns interfering)
2. `::` → `:` (MJ multi-prompt separator)
3. `--` → `-` (MJ parameter prefix) — runs after newline collapse to avoid `\n--` edge
4. Strip leading/trailing commas and whitespace (after collapsing the above)

```typescript
// Source: [ASSUMED] — derived from CONTEXT.md D-05..D-08
// src/domain/prompt/sanitize.ts

/**
 * Sanitize a user-supplied or AI-supplied string so it cannot inject
 * Midjourney syntax tokens into the assembled prompt.
 * This is the SINGLE chokepoint — every string entering the serializer
 * must pass through here (D-08).
 */
export function sanitize(text: string): string {
  return text
    .replace(/\r\n|\r|\n/g, ' ')  // 1. all newline variants → single space
    .replace(/::/g, ':')            // 2. double-colon → colon (MJ weight separator)
    .replace(/--/g, '-')            // 3. double-dash → dash (MJ parameter prefix)
    .replace(/^[,\s]+/, '')         // 4. strip leading commas and whitespace
    .replace(/[,\s]+$/, '')         // 5. strip trailing commas and whitespace
    .trim()
}
```

**Why collapse `--` to `-` rather than escape/block?** D-05 says silently sanitize. Blocking means the user can't type "well--formed" (rare, but possible). Collapse is the least-surprise choice for a manual text field. The rendered prompt still reads naturally; Midjourney just won't see `--` as a parameter prefix inside description text.

### Pattern 3: Serializer — Pure, Deterministic, Tail-Extensible

**What:** Converts a `PromptDraft` to a string. Pure function with no side effects. Phase 2 extends this by serializing `flags` at the tail.

```typescript
// Source: [ASSUMED] — derived from CONTEXT.md D-01..D-04
// src/domain/prompt/serialize.ts

import { sanitize } from './sanitize'
import type { PromptDraft } from './model'

/**
 * Deterministic serializer: same PromptDraft → same string (D-04).
 * Format: <intent>, <chip1>, <chip2>, ... [, <flag1> <flag2> ...]
 * Flags are appended at the tail in Phase 2.
 */
export function serialize(draft: PromptDraft): string {
  const parts: string[] = []

  // D-01: intent first
  // D-03: intent is one opaque block — no splitting on the user's own commas
  const intentSanitized = sanitize(draft.intent.trim())
  if (intentSanitized) parts.push(intentSanitized)

  // D-01: chips follow, in insertion order
  for (const chip of draft.chips) {
    if (!chip.enabled) continue
    const labelSanitized = sanitize(chip.label.trim())
    if (labelSanitized) parts.push(labelSanitized)
  }

  // Phase 2 extension point: flags append here at the tail
  // They are skipped in Phase 1 because draft.flags is always []

  // D-02: join with ", "
  return parts.join(', ')
}
```

**Determinism guarantees:** No date operations, no `Math.random()`, no Map iteration (explicit array order). Same draft → same string. Phase 2 must maintain determinism when appending flags (sort by `FlagDefinition.order`).

### Pattern 4: Zustand 5 Store — Build Session

**What:** Holds the in-progress draft. Preview string is derived, never stored. Zustand 5 uses the curried create form with explicit generic.

```typescript
// Source: [VERIFIED: zustand.docs.pmnd.rs/learn/guides/beginner-typescript]
// src/state/buildSession.ts

import { create } from 'zustand'
import { v4 as uuid } from 'uuid'       // or crypto.randomUUID() — no dep
import type { Chip, PromptDraft } from '../domain/prompt/model'

interface BuildSessionState {
  intent: string
  chips: Chip[]
  // Derived (not stored): preview = serialize(toDraft(state))

  // Actions
  setIntent: (intent: string) => void
  addChip: (label: string) => void      // deduplicates by label (per Claude's Discretion)
  removeChip: (id: string) => void
  toggleChip: (id: string) => void      // for Phase 4 palette chip selection
  clearAll: () => void
  toDraft: () => PromptDraft            // snapshot for serializer and Phase 3 save
}

export const useBuildSession = create<BuildSessionState>()((set, get) => ({
  intent: '',
  chips: [],

  setIntent: (intent) => set({ intent }),

  addChip: (label) => {
    const trimmed = label.trim()
    if (!trimmed) return
    // Dedup by label (case-sensitive) per Claude's Discretion
    const { chips } = get()
    if (chips.some((c) => c.label === trimmed)) return
    set({ chips: [...chips, {
      id: crypto.randomUUID(),
      label: trimmed,
      source: 'custom',
      enabled: true,
    }]})
  },

  removeChip: (id) =>
    set({ chips: get().chips.filter((c) => c.id !== id) }),

  toggleChip: (id) =>
    set({ chips: get().chips.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    )}),

  clearAll: () => set({ intent: '', chips: [] }),

  toDraft: (): PromptDraft => ({
    id: crypto.randomUUID(),   // ephemeral; Phase 3 assigns a stable ID on save
    intent: get().intent,
    chips: get().chips,
    flags: [],
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
}))
```

**Deriving preview in components:**
```typescript
// In any component — runs on every render; negligible cost for a prompt string
const { toDraft } = useBuildSession()
const preview = serialize(toDraft())
// OR use a selector to re-derive only on relevant state change:
const preview = useBuildSession((s) => serialize(s.toDraft()))
```

Note: `toDraft()` is a selector-compatible function (no side effects). The selector form is preferred — Zustand only re-renders the component when `intent` or `chips` change.

### Pattern 5: Vite 8 + Tailwind v4 + React 19 Configuration

**Tailwind v4 key changes vs v3:** [VERIFIED: tailwindcss.com/docs/installation/using-vite]
- No `tailwind.config.js` — configuration is CSS-first via `@theme {}` directives
- No PostCSS config file needed when using `@tailwindcss/vite` Vite plugin
- Single CSS import: `@import "tailwindcss";` replaces the three v3 directives
- `@theme inline` replaces old CSS variable patterns in shadcn/ui

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

```css
/* src/index.css */
@import "tailwindcss";

/* shadcn/ui CSS variables (generated by `npx shadcn@latest init`) */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... shadcn/ui init fills this out */
}
```

**shadcn/ui v4.12 changes vs v3-era:** [VERIFIED: ui.shadcn.com/docs/tailwind-v4]
- Uses `tw-animate-css` instead of `tailwindcss-animate` (breaking if you copy old setup guides)
- Components no longer use `React.forwardRef` — React 19 direct props
- Every component primitive has a `data-slot` attribute for targeted styling
- Colors use OKLCH internally; CSS variables wrap with `hsl()` for compatibility

### Pattern 6: Copy Button with "Copied!" Feedback

**Clipboard API requirements:** [VERIFIED: MDN/W3C — navigator.clipboard.writeText]
- Requires **secure context**: HTTPS in production, `localhost` in dev — both fine for Phase 1
- Requires **user gesture**: must be called synchronously inside a click handler (not in a `setTimeout` or `Promise.then`)
- Browser differences: Chrome is permissive; Firefox and Safari enforce user gesture more strictly

```typescript
// Source: [ASSUMED] — standard pattern; Clipboard API spec verified via MDN
// src/ui/PreviewPane/CopyButton.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CopyButtonProps { text: string }

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    try {
      // Must be inside click handler (user gesture) for Clipboard API to work
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-secure contexts or permission denied
      // (shouldn't happen on localhost/HTTPS, but guard it)
    }
  }

  return (
    <Button onClick={handleCopy} variant="outline" disabled={!text}>
      {copied ? 'Copied!' : 'Copy prompt'}
    </Button>
  )
}
```

**XSS note (CLAUDE.md Security):** The preview text is assembled by the serializer from user-typed strings. Render it in a `<pre>` or `<p>` via React's standard text rendering (`{preview}` as a child) — never via `dangerouslySetInnerHTML`. The sanitizer already strips `::` and `--`; no further escaping is needed for the DOM render because React escapes text nodes by default.

### Pattern 7: Clear/Reset with Confirmation

**D-11:** Show confirmation when intent or chips are present; instant no-op when already empty.

```typescript
// Source: [ASSUMED] — derived from CONTEXT.md D-11
// src/ui/ClearDialog.tsx

import { AlertDialog, AlertDialogAction, AlertDialogCancel,
         AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
         AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger }
  from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'

export function ClearButton() {
  const { intent, chips, clearAll } = useBuildSession(
    (s) => ({ intent: s.intent, chips: s.chips, clearAll: s.clearAll })
  )
  const hasContent = intent.trim() !== '' || chips.length > 0

  // D-11: instant clear when already empty
  if (!hasContent) {
    return <Button variant="ghost" onClick={clearAll} disabled>Clear</Button>
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost">Clear</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start over?</AlertDialogTitle>
          <AlertDialogDescription>
            This will clear your intent and all chips. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={clearAll}>Clear everything</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Anti-Patterns to Avoid

- **Storing the preview string in state:** Leads to preview drifting out of sync. Always derive from the model. If performance matters (it won't for a prompt string), use `useMemo`.
- **Putting intent as the first chip in `chips[]`:** Violates D-03. The serializer would need source-filtering logic to reconstruct the intent-first order. Keep `intent` as a separate field.
- **Calling `clipboard.writeText()` in a `useEffect` or async function not triggered by a click:** Violates the user-gesture requirement; fails silently in Firefox/Safari.
- **Copying v3 Tailwind guides:** Tailwind v4 has no `tailwind.config.js`, no `@tailwind base/components/utilities` directives, and uses the Vite plugin instead of PostCSS. Copying v3 setup instructions silently breaks styles.
- **Using `tailwindcss-animate` with shadcn/ui v4:** Install `tw-animate-css` instead; `tailwindcss-animate` is deprecated for Tailwind v4 shadcn/ui.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible confirm dialog | Custom confirm with `window.confirm()` or a home-rolled modal | shadcn/ui `AlertDialog` | Focus trap, keyboard escape, ARIA roles — all provided; `window.confirm()` is blocked in Tauri webviews |
| Form primitive styling | Raw CSS inputs and buttons | shadcn/ui `Button`, `Textarea`, `Input`, `Badge` | Consistent design tokens; accessible focus states; same CSS variable system as the rest of the UI |
| UUID generation | `Math.random()` hex string | `crypto.randomUUID()` (Web Crypto API, built-in) | Collision-resistant, no dep, available in all modern browsers and Node 14+ |
| Chip rendering | `<div onClick>` for the ✕ button | shadcn/ui `Badge` + `Button` with `variant="ghost" size="icon"` | Proper button semantics + keyboard accessibility |

**Key insight:** Phase 1 has no data persistence, no network calls, and no complex state. The only hand-rolled pieces are the domain core (model, sanitizer, serializer) — everything else uses the locked stack.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 CSS-First Config Confusion

**What goes wrong:** Developer copies a Tailwind v3 setup guide — adds `tailwind.config.js`, writes `@tailwind base; @tailwind components; @tailwind utilities;` in CSS. Styles partially work or don't work at all because the v4 Vite plugin and the v3 PostCSS pipeline conflict.

**Why it happens:** v3 setup guides dominate search results. The v4 API is fundamentally different.

**How to avoid:** Follow the official v4 Vite guide: install `@tailwindcss/vite`, add it to `vite.config.ts` plugins, use `@import "tailwindcss";` in CSS. No `tailwind.config.js`, no PostCSS config, no autoprefixer.

**Warning signs:** `tailwind.config.js` in project root; `@tailwind base` in CSS; PostCSS config file present.

### Pitfall 2: shadcn/ui Using Deprecated Animation Package

**What goes wrong:** `npx shadcn@latest init` on a v4 project installs `tailwindcss-animate`. Animations don't work or emit console warnings.

**Why it happens:** Older shadcn/ui docs reference `tailwindcss-animate`. The v4-compatible package is `tw-animate-css`.

**How to avoid:** Let `npx shadcn@latest init` handle this — it detects Tailwind v4 and installs `tw-animate-css` automatically for new projects. If you see `tailwindcss-animate` in `package.json`, swap it.

**Warning signs:** `tailwindcss-animate` in `package.json` alongside Tailwind v4; dialog/tooltip animations not working.

### Pitfall 3: Sanitizer Order — `--` in Multi-char Sequences

**What goes wrong:** If newline collapse runs after `--` → `-`, a string like `\n--ar 1:1` (if a user accidentally pastes a prompt) would first get `--` collapsed to `-` (correct), but then the newline collapse wouldn't matter. However, a string like `well\n--formed` would collapse the `\n` but then find `--` still present. Correct order: newlines first.

**Why it happens:** Regex ops compose in unexpected ways on multi-character input.

**How to avoid:** The sanitization order in Pattern 2 above is correct and tested. Write table-driven tests (see Validation Architecture) to verify edge cases.

**Warning signs:** Prompt preview shows unexpected `-` or `:` where the user typed `--` or `::`.

### Pitfall 4: Chip Deduplication — Case Sensitivity

**What goes wrong:** User adds "cinematic" then tries to add "Cinematic" — whether these are treated as duplicates affects UX consistency.

**Why it happens:** The dedup check uses `===` by default, which is case-sensitive.

**How to avoid:** Decision per Claude's Discretion: case-sensitive dedup (the current pattern) is the simpler, less surprising default. If the user types "Cinematic" and "cinematic", they're semantically the same Midjourney descriptor, but the serializer will include both. For Phase 1, case-sensitive dedup is acceptable — revisit in Phase 4 if palette chips exacerbate this.

### Pitfall 5: `navigator.clipboard` in Test Environment

**What goes wrong:** Tests for the CopyButton fail because `navigator.clipboard` is not defined in happy-dom or throws a permission error.

**Why it happens:** Clipboard API requires secure context and user gesture; test environments don't provide either.

**How to avoid:** Mock `navigator.clipboard.writeText` in the test setup:
```typescript
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
})
```
Only needed in component tests; pure-function serializer/sanitizer tests don't touch the DOM at all.

### Pitfall 6: `crypto.randomUUID()` Not Available

**What goes wrong:** `crypto.randomUUID()` is called but the runtime throws. This can happen in older Node versions (pre-15) or if a test environment doesn't include Web Crypto.

**Why it happens:** `crypto.randomUUID()` was added in Node 15 and is a browser API. happy-dom exposes it; jsdom does not by default.

**How to avoid:** Verify Node version is 20+ (vitest 4.x requires Node 20+). happy-dom provides `crypto.randomUUID()`. If issues arise, polyfill with the `uuid` package or use `crypto.getRandomValues()`.

---

## Code Examples

### Walking Skeleton: Minimal App Component

```typescript
// Source: [ASSUMED] — derived from CONTEXT.md D-09, D-10, D-11 and stack research
// src/App.tsx

import { useBuildSession } from './state/buildSession'
import { serialize } from './domain/prompt/serialize'

export function App() {
  const { intent, chips, toDraft } = useBuildSession(
    (s) => ({ intent: s.intent, chips: s.chips, toDraft: s.toDraft })
  )
  const preview = serialize(toDraft())

  return (
    <div className="flex h-screen">
      {/* LEFT: Controls */}
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
        <IntentInput />
        <ChipInput />
        <ChipArea />
        <ClearButton />
      </div>

      {/* RIGHT: Preview — sticky, always visible (D-09) */}
      <div className="w-96 border-l sticky top-0 h-screen p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Preview
        </h2>
        <pre className="flex-1 whitespace-pre-wrap text-sm font-mono break-words">
          {preview || 'Your prompt will appear here…'}
        </pre>
        <CopyButton text={preview} />
      </div>
    </div>
  )
}
```

### Vitest Config

```typescript
// Source: [VERIFIED: vitest.dev/guide + community guides for happy-dom]
// vitest.config.ts

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],  // domain core is the coverage gate
    },
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + PostCSS | CSS-first `@theme {}` + `@tailwindcss/vite` plugin | Tailwind v4 (2025) | No config file; cannot copy v3 guides verbatim |
| `React.forwardRef` in shadcn/ui components | Direct prop forwarding (React 19 ref as prop) | shadcn/ui v4 + React 19 | Components no longer wrap in `forwardRef`; simpler types |
| `tailwindcss-animate` | `tw-animate-css` | shadcn/ui Tailwind v4 migration | Old package is deprecated for v4 projects |
| `create(...)` in Zustand (no currying) | `create<State>()(...)` curried form | Zustand v4+ / v5 | Better TypeScript inference; old form produces looser types |
| `@testing-library/jest-dom` matchers | `@testing-library/jest-dom/vitest` import | vitest compatibility layer | Must import from `/vitest` path, not root |

**Deprecated/outdated:**
- `tailwind.config.js` for v4 projects: replaced by CSS `@theme {}` directives
- `@tailwind base; @tailwind components; @tailwind utilities;`: replaced by `@import "tailwindcss";`
- `React.forwardRef` in shadcn/ui: removed in React 19-compatible shadcn/ui

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `sanitize()` order (newlines → `::` → `--` → trim) is the correct safe order for MJ syntax | Architecture Patterns / Pattern 2 | Wrong order could miss edge cases; mitigated by table-driven tests |
| A2 | `source: 'custom' \| 'palette'` discriminator is sufficient for Phase 4 without a breaking change | Architecture Patterns / Pattern 1 | If Phase 4 needs additional discriminators (e.g., `'weighted'`), `ChipSchema.source` enum extends cleanly |
| A3 | `crypto.randomUUID()` is available in happy-dom (Node 20+ environment) | Architecture Patterns / Pattern 4 | If not, polyfill with `uuid` package; minor fix |
| A4 | `tw-animate-css` is auto-selected by `npx shadcn@latest init` for Tailwind v4 projects | Architecture Patterns / Pattern 5 | If not, manually install `tw-animate-css`; check after `init` |
| A5 | `toDraft()` as a store method (produces a snapshot) is a valid Zustand selector pattern | Architecture Patterns / Pattern 4 | If it causes extra re-renders, extract intent+chips directly and build the draft in the component |
| A6 | Case-sensitive chip deduplication is the right default | Common Pitfalls / Pitfall 4 | "cinematic" and "Cinematic" both appear in the prompt; both are valid MJ descriptors; low risk |

---

## Open Questions

1. **`toDraft()` as a Zustand method vs computed externally**
   - What we know: Zustand selectors should be referentially stable; `toDraft()` creates a new object on every call
   - What's unclear: Will this cause extra re-renders if used as a selector?
   - Recommendation: For Phase 1 (one component), compute the preview inline with `serialize({ intent, chips, flags: [] })` rather than calling `toDraft()`. Only add `toDraft()` as a formal method when Phase 3 needs it for saving.

2. **`import.meta.env` vs `process.env` in Vite 8**
   - What we know: Vite uses `import.meta.env`; vitest inherits this when using `vitest/config`
   - What's unclear: Whether any test files inadvertently use `process.env`
   - Recommendation: Stick to `import.meta.env`; add `globals: true` to vitest config so `describe/it/expect` are available without imports

3. **shadcn/ui `npx` vs `pnpm dlx`**
   - What we know: shadcn/ui docs use `pnpm dlx shadcn@latest init`; npm equivalent is `npx shadcn@latest init`
   - Recommendation: Use `npx shadcn@latest init` since the project scaffolds with npm

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 20 | vitest 4.x (requirement) | ✓ (confirmed by npm working) | Inferred ≥ 20 from working environment | — |
| npm | Package installation | ✓ | Confirmed (all `npm view` calls succeeded) | — |
| `crypto.randomUUID()` | Chip ID generation | ✓ | Web Crypto API (built-in to Node 15+, all modern browsers) | `uuid` npm package |
| `navigator.clipboard` | CopyButton | ✓ on localhost (dev) | Browser built-in; requires secure context | Omit copy in non-secure context |

**Missing dependencies with no fallback:** None for Phase 1.
**Missing dependencies with fallback:** `navigator.clipboard` — blocked in non-secure contexts; falls back to graceful no-op in the catch block.

---

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.9 |
| Config file | `vitest.config.ts` (to be created in Wave 0) |
| Quick run command | `npx vitest run src/domain` |
| Full suite command | `npx vitest run` |
| Coverage command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASM-01 | `serialize()` emits intent-first, chips in order, joined by `, ` | unit | `npx vitest run src/domain/prompt/serialize.test.ts` | Wave 0 |
| ASM-01 | `serialize()` is deterministic — same input → same output | unit | same file | Wave 0 |
| ASM-01 | `serialize()` skips disabled chips | unit | same file | Wave 0 |
| ASM-01 | `serialize()` emits empty string for empty draft | unit | same file | Wave 0 |
| ASM-03 | `sanitize()` collapses `::` to `:` | unit | `npx vitest run src/domain/prompt/sanitize.test.ts` | Wave 0 |
| ASM-03 | `sanitize()` collapses `--` to `-` | unit | same file | Wave 0 |
| ASM-03 | `sanitize()` collapses newlines to spaces | unit | same file | Wave 0 |
| ASM-03 | `sanitize()` strips leading/trailing commas | unit | same file | Wave 0 |
| ASM-03 | `sanitize()` order: `\n--` → ` -` (newline then dash collapse) | unit | same file | Wave 0 |
| ASM-02 | `PromptDraftSchema` validates a valid draft | unit | `npx vitest run src/domain/prompt/model.test.ts` | Wave 0 |
| ASM-02 | `PromptDraftSchema` rejects chip with empty label | unit | same file | Wave 0 |
| BLD-01 | Intent input textarea is rendered and accepts text | component | `npx vitest run src/ui/IntentInput.test.tsx` | Wave 0 |
| BLD-04 | Add chip input + button creates a chip in state | component | `npx vitest run src/ui/ChipInput.test.tsx` | Wave 0 |
| BLD-04 | Duplicate chip label is ignored | component | same file | Wave 0 |
| BLD-03 | Clicking ✕ on a chip removes it from state | component | `npx vitest run src/ui/ChipArea.test.tsx` | Wave 0 |
| BLD-05 | Preview updates when intent changes | component | `npx vitest run src/ui/LivePreview.test.tsx` | Wave 0 |
| BLD-05 | Preview updates when chip is added | component | same file | Wave 0 |
| BLD-07 | Copy button calls `clipboard.writeText` with preview text | component | `npx vitest run src/ui/CopyButton.test.tsx` | Wave 0 |
| BLD-07 | Copy button shows "Copied!" after successful copy | component | same file | Wave 0 |
| BLD-06 | Clear button triggers confirm dialog when content present | component | `npx vitest run src/ui/ClearButton.test.tsx` | Wave 0 |
| BLD-06 | Confirm dialog clears state on confirm | component | same file | Wave 0 |
| BLD-06 | Clear does not show dialog when already empty | component | same file | Wave 0 |

### Serializer Golden-String Tests (Table-Driven)

The highest-ROI tests in Phase 1. The serializer and sanitizer are pure functions — test them with a table of `(input, expected)` pairs. No mocks needed.

```typescript
// src/domain/prompt/serialize.test.ts (table-driven golden strings)
const cases = [
  { desc: 'intent only',      draft: mkDraft('a cat', []),             expected: 'a cat' },
  { desc: 'intent + 1 chip',  draft: mkDraft('a cat', ['cinematic']),  expected: 'a cat, cinematic' },
  { desc: 'intent + 2 chips', draft: mkDraft('a cat', ['cinematic', 'hazy']), expected: 'a cat, cinematic, hazy' },
  { desc: 'empty intent',     draft: mkDraft('', ['cinematic']),       expected: 'cinematic' },
  { desc: 'all empty',        draft: mkDraft('', []),                  expected: '' },
  { desc: 'disabled chip skipped', draft: mkDraftWithDisabled('a cat', ['skip'], ['cinematic']), expected: 'a cat, cinematic' },
  { desc: 'intent with user commas preserved', draft: mkDraft('cats, dogs', []), expected: 'cats, dogs' },
]

// src/domain/prompt/sanitize.test.ts (escaping table)
const sanitizeCases = [
  { input: 'a::b',         expected: 'a:b' },
  { input: 'a--b',         expected: 'a-b' },
  { input: '--style',      expected: '-style' },
  { input: 'a\nb',         expected: 'a b' },
  { input: 'a\r\nb',       expected: 'a b' },
  { input: ',leading',     expected: 'leading' },
  { input: 'trailing,',    expected: 'trailing' },
  { input: '\n--ar 1:1',   expected: '-ar 1:1' },  // newline then -- → space then -
  { input: '::weight',     expected: ':weight' },
  { input: '',             expected: '' },
]
```

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain` (pure-function tests only — < 2s)
- **Per wave merge:** `npx vitest run` (full suite including component tests)
- **Phase gate:** Full suite green + `npx vitest run --coverage` shows domain core at 100% branch coverage

### Wave 0 Gaps

- [ ] `vitest.config.ts` — test framework config
- [ ] `src/test/setup.ts` — jest-dom + cleanup
- [ ] `src/domain/prompt/model.test.ts` — schema validation tests
- [ ] `src/domain/prompt/sanitize.test.ts` — table-driven escaping tests
- [ ] `src/domain/prompt/serialize.test.ts` — golden-string serializer tests
- [ ] `src/ui/CopyButton.test.tsx` — clipboard mock + feedback test
- [ ] `src/ui/ClearButton.test.tsx` — dialog confirm test
- [ ] `src/ui/LivePreview.test.tsx` — build-loop sync test
- [ ] Framework install: `npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event happy-dom`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in Phase 1 |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user local tool |
| V5 Input Validation | Yes | `sanitize()` chokepoint on all user text; Zod schema on PromptDraft |
| V6 Cryptography | No | No key storage in Phase 1 (deferred to Phase 4) |
| V7 Error Handling | Partial | Clipboard API failure caught and silently swallowed; no error leakage |

### Known Threat Patterns for Phase 1 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via user-typed prompt text rendered in UI | Spoofing/Tampering | React escapes text nodes by default; never use `dangerouslySetInnerHTML` on prompt content (CLAUDE.md requirement) |
| MJ syntax injection via chip label (`::`, `--`) | Tampering | `sanitize()` chokepoint; table-driven tests verify edge cases |
| Clipboard permission denial causing silent UX failure | Denial of Service | `try/catch` in `handleCopy`; consider a visible fallback (e.g., text input user can copy manually) |
| Supply-chain attack via npm dependency | Elevation of Privilege | Phase 1 has no key storage; minimal dep surface (Zod, Zustand, shadcn/ui, Tailwind, Vite); all packages verified on npm |

**Phase 1 is low-security-risk** because there is no API key, no network call, and no persistence. The main XSS vector (user text rendered in UI) is fully mitigated by React's default text escaping + the `sanitize()` chokepoint. Phase 4 introduces the key-storage risk documented in CLAUDE.md.

---

## Sources

### Primary (HIGH confidence)
- npm registry — `npm view` verified versions for all 18 packages in this session
- [tailwindcss.com/docs/installation/using-vite](https://tailwindcss.com/docs/installation/using-vite) — Tailwind v4 Vite plugin setup steps
- [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) — shadcn/ui Tailwind v4 migration guide; `tw-animate-css`, `@theme inline`, forwardRef removal
- [zustand.docs.pmnd.rs/learn/guides/beginner-typescript](https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript) — curried `create<State>()()` pattern verified
- MDN / W3C — `navigator.clipboard.writeText()` user gesture and secure context requirements
- `.planning/research/STACK.md` — verified npm versions as of 2026-06-26 (HIGH)
- `.planning/research/ARCHITECTURE.md` — PromptDraft model pattern, port/adapter structure, serialization rules (HIGH)
- `.planning/research/PITFALLS.md` — assembly correctness, escaping pitfalls, anti-patterns (HIGH)

### Secondary (MEDIUM confidence)
- [vitest.dev/guide](https://vitest.dev/guide/) — basic vitest setup and config approach
- Community guides (DEV Community, Medium) on happy-dom + @testing-library/react setup with vitest — corroborated across multiple sources

### Tertiary (LOW confidence)
- shadcn/ui `npx shadcn@latest init` auto-selecting `tw-animate-css` for v4 — stated in official docs, but behavior may depend on CLI version; verify after running

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry in this session
- PromptDraft schema design: HIGH — derived directly from locked decisions D-01..D-08 and architecture research
- Tailwind v4 + shadcn/ui setup: HIGH — confirmed against official docs
- Zustand 5 store pattern: HIGH — confirmed against official TypeScript guide
- Sanitizer order: MEDIUM — logic is sound but requires golden-string tests to verify edge cases
- Clipboard API behavior: HIGH — confirmed against MDN/W3C spec and community

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (stable ecosystem; Tailwind/shadcn/ui most likely to change)
