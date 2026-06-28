# Phase 2: Data-Driven Flag Controls - Pattern Map

**Mapped:** 2026-06-27
**Files analyzed:** 23 (17 new, 6 modified)
**Analogs found:** 22 / 23

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/flags/schema.ts` | model | transform | `src/domain/prompt/model.ts` | exact |
| `src/domain/flags/versions.ts` | config | batch | `src/domain/prompt/model.ts` | role-match |
| `src/domain/flags/definitions.ts` | config | batch | `src/domain/prompt/model.ts` | role-match |
| `src/domain/flags/helpers.ts` | utility | transform | `src/domain/prompt/serialize.ts` | exact |
| `src/domain/flags/index.ts` | utility | — | none | no analog |
| `src/ui/ControlsPane/FlagControls/FlagControls.tsx` | component | event-driven | `src/ui/ControlsPane/ChipArea.tsx` | exact |
| `src/ui/ControlsPane/FlagControls/VersionSelect.tsx` | component | request-response | `src/ui/ControlsPane/ChipInput.tsx` | role-match |
| `src/ui/ControlsPane/FlagControls/ARControl.tsx` | component | request-response | `src/ui/ControlsPane/ChipInput.tsx` | role-match |
| `src/ui/ControlsPane/FlagControls/SliderFlagControl.tsx` | component | request-response | `src/components/ui/input.tsx` | role-match |
| `src/ui/ControlsPane/FlagControls/NumberFlagControl.tsx` | component | request-response | `src/components/ui/input.tsx` | role-match |
| `src/ui/ControlsPane/FlagControls/TextFlagControl.tsx` | component | request-response | `src/ui/ControlsPane/ChipInput.tsx` | role-match |
| `src/components/ui/slider.tsx` | component | request-response | `src/components/ui/input.tsx` | exact |
| `src/components/ui/select.tsx` | component | request-response | `src/components/ui/input.tsx` | exact |
| `src/domain/flags/schema.test.ts` | test | — | `src/domain/prompt/model.test.ts` | exact |
| `src/domain/flags/helpers.test.ts` | test | — | `src/domain/prompt/serialize.test.ts` | exact |
| `src/state/buildSession.test.ts` | test | — | `src/ui/ChipArea.test.tsx` | role-match |
| `src/ui/ControlsPane/FlagControls/FlagControls.test.tsx` | test | — | `src/ui/ChipArea.test.tsx` | exact |
| `src/domain/prompt/model.ts` (modify) | model | transform | self | exact |
| `src/domain/prompt/serialize.ts` (modify) | utility | transform | self | exact |
| `src/state/buildSession.ts` (modify) | store | event-driven | self | exact |
| `src/ui/App.tsx` (modify) | component | request-response | self | exact |
| `src/domain/prompt/model.test.ts` (modify) | test | — | self | exact |
| `src/domain/prompt/serialize.test.ts` (modify) | test | — | self | exact |

---

## Pattern Assignments

### `src/domain/flags/schema.ts` (model, transform)

**Analog:** `src/domain/prompt/model.ts`

**Imports pattern** (lines 1-2):
```typescript
import { z } from 'zod'
```

**Core Zod schema pattern** (lines 3-28):
```typescript
// Each schema: z.object({ ... }) with inferred export
export const ChipSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
  source: z.enum(['custom', 'palette']),
  paletteCategory: z.string().optional(),
  enabled: z.boolean().default(true),
})
// ...
export type Chip = z.infer<typeof ChipSchema>
export type FlagValue = z.infer<typeof FlagValueSchema>
export type PromptDraft = z.infer<typeof PromptDraftSchema>
```

**Key conventions to copy:**
- One schema per concept; `z.infer<typeof X>` exported as the TS type
- Use `.optional()` for fields that may be absent; use `.default()` only for runtime-safe defaults
- Discriminated unions via `z.discriminatedUnion('type', [...])` — apply this for `ControlSpec`

---

### `src/domain/flags/versions.ts` (config, batch)

**Analog:** `src/domain/prompt/model.ts`

**Imports pattern** — type-only import from sibling schema module:
```typescript
import type { VersionDefinition } from './schema'
```

**Core pattern** — typed const array, no runtime logic:
```typescript
export const VERSION_DEFINITIONS: VersionDefinition[] = [
  { id: '...', label: '...', parameter: '...', supportedFlagIds: [...] },
]
```

**Convention:** All data files in `src/domain/` use no framework imports; pure TypeScript.

---

### `src/domain/flags/definitions.ts` (config, batch)

**Analog:** `src/domain/prompt/model.ts`

Same conventions as `versions.ts`. Type-only import from `./schema`; exports a single typed const array `FLAG_DEFINITIONS: FlagDefinition[]`. No functions — pure data.

---

### `src/domain/flags/helpers.ts` (utility, transform)

**Analog:** `src/domain/prompt/serialize.ts`

**Imports pattern** (lines 1-2):
```typescript
import { sanitize } from './sanitize'
import type { PromptDraft } from './model'
```
Apply same pattern: import sibling domain modules by relative path; type-only imports where no value is needed.

**Core pure-function pattern** (lines 17-36):
```typescript
// No side effects, no Date.now(), no Math.random()
// Single responsibility per function
export function serialize(draft: PromptDraft): string {
  const parts: string[] = []
  // ...
  return parts.join(', ')
}
```

**Error handling pattern:** No try/catch. Pure functions return a value or `null`; callers decide how to handle `null`. Matches the existing serialize/sanitize pattern of silent graceful returns.

**Key convention to copy:** `serialize.ts` uses `sanitize()` before pushing to output array. `helpers.ts` must call `sanitize()` (from `../prompt/sanitize`) when serializing any flag value that came from free-text user input (specifically `--no`).

---

### `src/domain/flags/index.ts` (utility, barrel)

**No analog** — first barrel re-export in the project.

**Pattern from RESEARCH.md:**
```typescript
export * from './schema'
export * from './versions'
export * from './definitions'
export * from './helpers'
```

No analog exists; follow standard TypeScript barrel convention.

---

### `src/ui/ControlsPane/FlagControls/FlagControls.tsx` (component, event-driven)

**Analog:** `src/ui/ControlsPane/ChipArea.tsx`

**Imports pattern** (lines 1-3):
```typescript
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'
```
Apply same pattern: `@/` path aliases for all cross-directory imports.

**Store subscription pattern** (lines 5-8):
```typescript
// Separate per-field selectors — avoids referential-instability infinite loop
const chips = useBuildSession((s) => s.chips)
const removeChip = useBuildSession((s) => s.removeChip)
```
`FlagControls.tsx` must subscribe to `selectedVersionId`, `flagValues`, `setFlags` as separate selectors — never as a single object selector. See `ClearDialog.tsx` lines 18-20 for the explicit pattern with comment explaining why.

**Early-return / null pattern** (lines 9):
```typescript
if (chips.length === 0) return null
```
Apply: if no version is selected and no flags are set, the container still renders (flags section is always visible per D-01). Do not use early null return here.

**Render loop pattern** (lines 11-34):
```typescript
return (
  <div className="flex flex-wrap gap-2">
    {chips.map((chip) => (
      <Badge key={chip.id} ...>
        ...
      </Badge>
    ))}
  </div>
)
```
`FlagControls.tsx` renders its list via `getFlagsForVersion(selectedVersionId).map(def => ...)` — same map-over-data pattern, key on `def.id`.

---

### `src/ui/ControlsPane/FlagControls/VersionSelect.tsx` (component, request-response)

**Analog:** `src/ui/ControlsPane/ChipInput.tsx`

**Imports pattern** (lines 1-4):
```typescript
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'
```
Replace `Input`/`Button` with the new `Select` component (`@/components/ui/select`). Keep `useBuildSession` subscription.

**Store write pattern** (lines 8-9 + handler):
```typescript
const addChip = useBuildSession((s) => s.addChip)

const handleAdd = () => {
  if (!value.trim()) return
  addChip(value.trim())
  setValue('')
}
```
`VersionSelect.tsx` counterpart:
```typescript
const setVersion = useBuildSession((s) => s.setVersion)

const handleChange = (versionId: string | null) => {
  setVersion(versionId)  // store version ID (not label) — see Pitfall 5 in RESEARCH.md
}
```

**Layout pattern** (lines 17-44):
```typescript
<div className="flex flex-col gap-2">
  <label htmlFor="..." className="text-sm font-medium">...</label>
  <div className="flex gap-2">...</div>
</div>
```
All flag controls use this wrapper: `flex flex-col gap-2` outer, `text-sm font-medium` label, control inside.

---

### `src/ui/ControlsPane/FlagControls/ARControl.tsx` (component, request-response)

**Analog:** `src/ui/ControlsPane/ChipInput.tsx`

**Validation-before-store pattern** (lines 10-14 from ChipInput):
```typescript
const handleAdd = () => {
  if (!value.trim()) return   // guard
  addChip(value.trim())       // store writes sanitized value
  setValue('')                // clear local state after commit
}
```
`ARControl.tsx` counterpart for custom w:h validation — reject on format mismatch, do not sanitize-and-corrupt:
```typescript
const AR_PATTERN = /^\d+:\d+$/
const handleCustomSubmit = () => {
  const trimmed = customInput.trim()
  if (!AR_PATTERN.test(trimmed)) { setError('Use W:H format, e.g. 16:9'); return }
  const [w, h] = trimmed.split(':').map(Number)
  if (w === 0 || h === 0) { setError('Width and height must be greater than 0'); return }
  setFlag('ar', trimmed)       // store the validated string
  setIsSet('ar', true)
  setCustomInput('')
}
```

**Key convention:** ChipInput stores `sanitize(value)` — ARControl stores the validated ratio string directly (format validation makes injection impossible; `sanitize()` is defense-in-depth run additionally before store write).

---

### `src/ui/ControlsPane/FlagControls/SliderFlagControl.tsx` (component, request-response)

**Analog:** `src/components/ui/input.tsx`

**@base-ui/react wrapper pattern** (lines 1-3 of input.tsx):
```typescript
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"
```
`SliderFlagControl.tsx` uses the same primitive wrapper pattern, importing from `@base-ui/react/slider`:
```typescript
import { Slider } from '@base-ui/react/slider'
import { cn } from '@/lib/utils'
```

**Props + cn() pattern** (lines 6-19 of input.tsx):
```typescript
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn("... base classes ...", className)}
      {...props}
    />
  )
}
```
`SliderFlagControl` receives the flag definition `def`, `value`, `isSet`, `onChange`, `onClear` as explicit typed props — NOT spread-props, since this is a controlled compound widget, not a single element. All control bounds (`min`, `max`, `step`) come from `def.control`, never hardcoded.

**Disabled/unset visual state:** When `isSet` is false, slider renders disabled (`disabled={!isSet}`) and shows `—` for the value display. This satisfies D-05 explicit set/unset state.

---

### `src/ui/ControlsPane/FlagControls/NumberFlagControl.tsx` (component, request-response)

**Analog:** `src/components/ui/input.tsx`

Same wrapper pattern as `SliderFlagControl.tsx` but imports `NumberField` from `@base-ui/react/number-field`. Props: `def`, `value: number | null`, `isSet`, `onChange`, `onClear`.

**Critical:** `def.control.max` for seed is `4294967295` — slider would be impractical UX (see RESEARCH.md Pitfall 1). `NumberField` handles this correctly with keyboard increment/decrement and typed input.

---

### `src/ui/ControlsPane/FlagControls/TextFlagControl.tsx` (component, request-response)

**Analog:** `src/ui/ControlsPane/ChipInput.tsx`

**Input + sanitize-before-store pattern** (ChipInput lines 10-14):
```typescript
const handleAdd = () => {
  if (!value.trim()) return
  addChip(value.trim())   // addChip calls sanitize() internally
  setValue('')
}
```
`TextFlagControl.tsx` counterpart — must call `sanitize()` explicitly before storing, since the store action `setFlag` does not sanitize (it stores arbitrary values):
```typescript
import { sanitize } from '@/domain/prompt/sanitize'

const handleCommit = (raw: string) => {
  const sanitized = sanitize(raw.trim())
  if (!sanitized) return
  setFlag('no', sanitized)
  setIsSet('no', true)
}
```
This addresses RESEARCH.md Pitfall 6 (`--no` injection gap).

**Layout pattern** (ChipInput lines 17-44): `flex flex-col gap-2` + `text-sm font-medium` label.

---

### `src/components/ui/slider.tsx` (component, request-response)

**Analog:** `src/components/ui/input.tsx`

**Full shadcn/base-ui wrapper pattern** — copy exactly from `input.tsx`, substituting the primitive:

Imports (input.tsx lines 1-4):
```typescript
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"
```
For `slider.tsx`:
```typescript
import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"
```

**`data-slot` convention** (input.tsx line 10): `data-slot="input"`. Slider subcomponents use `data-slot="slider-track"`, `data-slot="slider-thumb"`, etc. — follow the same attribute naming pattern.

**Export convention** (input.tsx line 20): `export { Input }` — named export, not default. Apply same: `export { Slider }`.

**`cn()` for className merging** (input.tsx line 11-18): All className props use `cn("base classes", className)` for composability. Always accept `className` prop through to the primitive.

---

### `src/components/ui/select.tsx` (component, request-response)

**Analog:** `src/components/ui/input.tsx`

Same pattern as `slider.tsx` above. Import from `@base-ui/react/select`. The Select primitive is a compound component with `Select.Root`, `Select.Trigger`, `Select.Positioner`, `Select.Popup`, `Select.Item` — export each as named sub-components following shadcn convention (e.g. `SelectRoot`, `SelectItem`, etc.).

---

### `src/domain/flags/schema.test.ts` (test)

**Analog:** `src/domain/prompt/model.test.ts`

**Test file structure** (lines 1-5):
```typescript
import { describe, test, expect } from 'vitest'
import { PromptDraftSchema, ChipSchema } from './model'
```
Apply same: `import { describe, test, expect } from 'vitest'` — no beforeEach needed for pure schema tests.

**Schema validation test pattern** (lines 5-36):
```typescript
describe('ChipSchema', () => {
  test('validates a valid chip', () => {
    expect(() => ChipSchema.parse({ ... })).not.toThrow()
  })
  test('rejects an id that is not a UUID', () => {
    expect(() => ChipSchema.parse({ id: 'not-a-uuid', ... })).toThrow()
  })
})
```
Apply same structure for `FlagDefinitionSchema` and `VersionDefinitionSchema`. One `describe` block per schema; test: valid parse, invalid parse (per field), and discriminated union branches.

---

### `src/domain/flags/helpers.test.ts` (test)

**Analog:** `src/domain/prompt/serialize.test.ts`

**Helper factory + golden-cases table pattern** (serialize.test.ts lines 6-68):
```typescript
/** Builds a minimal valid PromptDraft from intent and chip labels. */
function mkDraft(intent: string, chipLabels: string[], ...): PromptDraft { ... }

describe('serialize', () => {
  const goldenCases = [
    { desc: 'intent only', draft: mkDraft('a cat', []), expected: 'a cat' },
    ...
  ]
  test.each(goldenCases)('$desc', ({ draft, expected }) => {
    expect(serialize(draft)).toBe(expected)
  })
})
```
Apply same table-driven approach for `getFlagsForVersion`, `serializeFlag`, `getVersionParameter`, `validateAspectRatio`. Use descriptive `desc` strings and `test.each`.

**Test isolation:** No shared mutable state (serialize.test.ts has no `beforeEach`) — pure functions need no reset.

---

### `src/state/buildSession.test.ts` (test)

**Analog:** `src/ui/ChipArea.test.tsx`

**Zustand reset pattern** (ChipArea.test.tsx lines 8-10):
```typescript
import { useBuildSession } from '../state/buildSession'

beforeEach(() => {
  useBuildSession.setState({ intent: '', chips: [] })
})
```
Apply same for flag state reset:
```typescript
beforeEach(() => {
  useBuildSession.setState({
    intent: '',
    chips: [],
    selectedVersionId: null,
    flagValues: {},
    setFlags: {},
  })
})
```

**Store action test pattern** (ChipArea.test.tsx lines 12-19):
```typescript
test('clicking the ✕ button removes the chip from the store', async () => {
  useBuildSession.setState({ chips: [{ id: 'chip-1', label: 'cinematic', ... }] })
  render(<ChipArea />)
  await user.click(screen.getByRole('button', { name: 'Remove cinematic' }))
  expect(useBuildSession.getState().chips).toHaveLength(0)
})
```
For store unit tests (not component tests), call actions directly:
```typescript
test('setFlag marks flag as set with given value', () => {
  useBuildSession.getState().setFlag('stylize', 250)
  expect(useBuildSession.getState().setFlags['stylize']).toBe(true)
  expect(useBuildSession.getState().flagValues['stylize']).toBe(250)
})
```

---

### `src/ui/ControlsPane/FlagControls/FlagControls.test.tsx` (test)

**Analog:** `src/ui/ChipArea.test.tsx`

**Full test file structure** (ChipArea.test.tsx lines 1-43):
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipArea } from './ControlsPane/ChipArea'
import { useBuildSession } from '../state/buildSession'

describe('ChipArea', () => {
  beforeEach(() => {
    useBuildSession.setState({ intent: '', chips: [] })
  })
  test('clicking the ✕ button removes the chip from the store', async () => {
    const user = userEvent.setup()
    useBuildSession.setState({ chips: [...] })
    render(<ChipArea />)
    await user.click(screen.getByRole('button', { name: 'Remove cinematic' }))
    expect(useBuildSession.getState().chips).toHaveLength(0)
  })
})
```
Copy this structure exactly. Key tests: version switch hides unsupported flag controls (FLG-04), clear/×  control unsets a flag (D-05).

---

### `src/domain/prompt/model.ts` (modify — bump schemaVersion, add selectedVersionId)

**Self-analog.** Current file is the pattern source.

**What changes:**
- `schemaVersion: z.literal(1)` → `z.literal(2)`
- Add `selectedVersionId: z.string().nullable().default(null)` as a new field on `PromptDraftSchema`

**Existing pattern to preserve** (lines 11-14):
```typescript
export const FlagValueSchema = z.object({
  flagId: z.string(), // references FlagDefinition.id in Phase 2
  value: z.unknown(),
})
```
`FlagValueSchema` is already correct for Phase 2 — do not modify it.

**Migration note:** The existing test in `model.test.ts` line 76 asserts `schemaVersion: 2` throws — that test must be updated to assert `schemaVersion: 1` throws (after bump, `z.literal(2)` rejects `1`).

---

### `src/domain/prompt/serialize.ts` (modify — fill Phase 2 extension point)

**Self-analog.** The extension point is explicitly documented at line 31:
```typescript
// Phase 2 extension point: flags appended at the tail here
// draft.flags is always [] in Phase 1 — skipped intentionally
```

**New imports to add** (after line 2):
```typescript
import { serializeFlag, getVersionParameter } from '../flags/helpers'
```

**Tail emission pattern replaces the comment at line 31-35:**
```typescript
// Phase 2: version flag first (from selectedVersionId)
const flagParts: string[] = []
if (draft.selectedVersionId) {
  const vParam = getVersionParameter(draft.selectedVersionId)
  if (vParam) flagParts.push(vParam)
}
// Remaining flags in draft.flags (already ordered + filtered by caller)
for (const { flagId, value } of draft.flags) {
  const fragment = serializeFlag(flagId, value)
  if (fragment) flagParts.push(fragment)
}

// D-02: descriptors joined with ", "; flags space-separated at tail
const descriptors = parts.join(', ')
if (flagParts.length === 0) return descriptors
return descriptors ? `${descriptors} ${flagParts.join(' ')}` : flagParts.join(' ')
```

The current final line `return parts.join(', ')` is replaced by the above.

---

### `src/state/buildSession.ts` (modify — add flag state + actions)

**Self-analog.** Current file is the pattern source.

**Existing store structure to preserve** (lines 1-54): All current state fields and actions remain unchanged. Add new fields alongside.

**Interface extension pattern** (modeled on lines 5-13):
```typescript
interface BuildSessionState {
  // --- existing (unchanged) ---
  intent: string
  chips: Chip[]
  setIntent(intent: string): void
  addChip(label: string): void
  removeChip(id: string): void
  toggleChip(id: string): void
  clearAll(): void
  // --- Phase 2 additions ---
  selectedVersionId: string | null
  flagValues: Record<string, unknown>
  setFlags: Record<string, boolean>
  setVersion(versionId: string | null): void
  setFlag(flagId: string, value: unknown): void
  unsetFlag(flagId: string): void
}
```

**Action implementation pattern** (modeled on lines 19-21):
```typescript
setIntent: (intent) => set({ intent }),
```
New actions follow same inline arrow syntax:
```typescript
setVersion: (versionId) => set({ selectedVersionId: versionId }),
setFlag: (flagId, value) =>
  set((s) => ({
    flagValues: { ...s.flagValues, [flagId]: value },
    setFlags: { ...s.setFlags, [flagId]: true },
  })),
unsetFlag: (flagId) =>
  set((s) => ({
    setFlags: { ...s.setFlags, [flagId]: false },
  })),
```

**clearAll extension** (current line 53):
```typescript
clearAll: () => set({ intent: '', chips: [] }),
```
Must become:
```typescript
clearAll: () => set({
  intent: '',
  chips: [],
  selectedVersionId: null,
  flagValues: {},
  setFlags: {},
}),
```

**Sanitize import** (line 3): Already imported — `addChip` uses it. `setFlag` does NOT call sanitize internally; callers (TextFlagControl) are responsible for sanitizing free-text values before calling `setFlag`. This matches the existing pattern where `addChip` sanitizes but the store itself is value-agnostic.

---

### `src/ui/App.tsx` (modify — wire FlagControls + pass flags to serialize)

**Self-analog.** Current file is the pattern source.

**Existing selector pattern** (lines 11-12):
```typescript
const intent = useBuildSession((s) => s.intent)
const chips = useBuildSession((s) => s.chips)
```
Add new selectors as separate calls (per ClearDialog.tsx comment about referential instability):
```typescript
const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
const flagValues = useBuildSession((s) => s.flagValues)
const setFlags = useBuildSession((s) => s.setFlags)
```

**Draft derivation pattern** (lines 14-23):
```typescript
const preview = serialize({
  id: '',
  intent,
  chips,
  flags: [],
  schemaVersion: 1,
  createdAt: '',
  updatedAt: '',
})
```
Phase 2 must build ordered, version-filtered `flags` before passing to serialize:
```typescript
import { FLAG_DEFINITIONS } from '@/domain/flags'
import { VERSION_DEFINITIONS } from '@/domain/flags'

// Build ordered, version-filtered flag array for serializer
const supportedIds = selectedVersionId
  ? (VERSION_DEFINITIONS.find(v => v.id === selectedVersionId)?.supportedFlagIds ?? [])
  : FLAG_DEFINITIONS.map(f => f.id)

const flags = FLAG_DEFINITIONS
  .filter(def => supportedIds.includes(def.id) && setFlags[def.id])
  .map(def => ({ flagId: def.id, value: flagValues[def.id] }))

const preview = serialize({
  id: '',
  intent,
  chips,
  flags,
  selectedVersionId,
  schemaVersion: 2,
  createdAt: '',
  updatedAt: '',
})
```

**Component tree pattern** (lines 28-44): `FlagControls` is added to the controls pane between `ChipArea` and `ClearButton`:
```tsx
<IntentInput />
<ChipInput />
<ChipArea />
<FlagControls />   {/* new */}
<ClearButton />
```

---

### `src/domain/prompt/model.test.ts` (modify)

**Self-analog.** Update the schemaVersion fixture test at line 76:
```typescript
test('rejects schemaVersion other than 1', () => {
  // After bump to schemaVersion: z.literal(2), this test must change:
  expect(() =>
    PromptDraftSchema.parse({ ..., schemaVersion: 2 })
  ).not.toThrow()  // now valid
  expect(() =>
    PromptDraftSchema.parse({ ..., schemaVersion: 1 })
  ).toThrow()  // now invalid
})
```
Also add `selectedVersionId: null` to all existing valid `PromptDraft` fixtures (the field has `.default(null)` so `parse` supplies it; but explicit test construction should include it).

---

### `src/domain/prompt/serialize.test.ts` (modify)

**Self-analog.** Extend `mkDraft` helper and add new test cases.

**Existing mkDraft helper to extend** (serialize.test.ts lines 6-25):
```typescript
function mkDraft(intent: string, chipLabels: string[], disabledLabels: string[] = []): PromptDraft {
  return {
    id: crypto.randomUUID(),
    intent,
    chips: chipLabels.map((label) => ({ ... })),
    flags: [],
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
```
Extend to accept optional `flags` and `selectedVersionId`:
```typescript
function mkDraft(
  intent: string,
  chipLabels: string[],
  disabledLabels: string[] = [],
  flags: FlagValue[] = [],
  selectedVersionId: string | null = null,
): PromptDraft {
  return {
    ...,
    flags,
    selectedVersionId,
    schemaVersion: 2,  // bumped
  }
}
```

**Golden-cases table pattern** (lines 29-65): Add new cases following the same `{ desc, draft, expected }` object format:
```typescript
{ desc: 'flag only (no intent)', draft: mkDraft('', [], [], [{ flagId: 'stylize', value: 250 }]), expected: '--stylize 250' },
{ desc: 'unset flag omitted (D-04)', draft: mkDraft('a cat', [], [], []), expected: 'a cat' },
{ desc: 'set to default value still emits (D-06)', draft: mkDraft('a cat', [], [], [{ flagId: 'stylize', value: 0 }]), expected: 'a cat --stylize 0' },
```

---

## Shared Patterns

### @/ Path Aliases
**Source:** All files in `src/ui/` and `src/components/`
**Apply to:** All new files that import across directory boundaries
```typescript
// Always use @/ aliases, never relative ../../
import { useBuildSession } from '@/state/buildSession'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
```

### Per-Field Zustand Selectors (React 19 Anti-Referential-Instability)
**Source:** `src/ui/ClearDialog.tsx` lines 18-20 + inline comment
```typescript
// Separate per-field selectors — avoids React 19 referential-instability infinite loop
// (object selector creates a new reference on every call; see Plan 03 deviation notes).
const intent = useBuildSession((s) => s.intent)
const chips = useBuildSession((s) => s.chips)
const clearAll = useBuildSession((s) => s.clearAll)
```
**Apply to:** All new React components that read from `useBuildSession`. Never use `useBuildSession((s) => ({ field1: s.field1, field2: s.field2 }))`.

### shadcn/base-ui Wrapper Component Convention
**Source:** `src/components/ui/input.tsx` (entire file)
```typescript
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn("... base Tailwind classes ...", className)}
      {...props}
    />
  )
}
export { Input }
```
**Apply to:** `src/components/ui/slider.tsx`, `src/components/ui/select.tsx`
- Import primitive from `@base-ui/react/<component>`
- Alias as `...Primitive` to disambiguate
- Accept `className` prop; merge with `cn()`
- Add `data-slot="<component>"` for style targeting
- Named export, not default

### Button CVA Variant Pattern
**Source:** `src/components/ui/button.tsx` (entire file)
```typescript
import { cva, type VariantProps } from "class-variance-authority"
const buttonVariants = cva("base classes", { variants: { variant: {...}, size: {...} } })
function Button({ className, variant = "default", size = "default", ...props }) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
```
**Apply to:** Any new shadcn component that needs multiple visual variants. Not needed for slider/select wrappers (they are single-appearance controls).

### Tailwind Layout Pattern for Control Sections
**Source:** `src/ui/ControlsPane/IntentInput.tsx` lines 9-22, `src/ui/ControlsPane/ChipInput.tsx` lines 17-44
```typescript
<div className="flex flex-col gap-2">
  <label htmlFor="..." className="text-sm font-medium">
    Label text
  </label>
  {/* control goes here */}
</div>
```
**Apply to:** All six `FlagControls/` leaf components (`VersionSelect`, `ARControl`, `SliderFlagControl`, `NumberFlagControl`, `TextFlagControl`). The `FlagControls.tsx` container uses `flex flex-col gap-4` (wider gap between controls than within each control).

### Accessible Remove/Clear Button Pattern
**Source:** `src/ui/ControlsPane/ChipArea.tsx` lines 22-31
```typescript
<Button
  size="icon"
  variant="ghost"
  className="min-w-[44px] min-h-[44px] size-auto p-1 rounded-sm"
  aria-label={`Remove ${chip.label}`}
  onClick={() => removeChip(chip.id)}
>
  ✕
</Button>
```
**Apply to:** Every flag control's clear/unset button (D-05). Use `aria-label={`Clear ${def.label}`}`. Minimum 44×44px touch target.

### Sanitize-Before-Store Chokepoint
**Source:** `src/state/buildSession.ts` lines 22-26 (`addChip`)
```typescript
const sanitized = sanitize(trimmed)
if (!sanitized) return
// then store sanitized value
```
**Apply to:** `TextFlagControl.tsx` (for `--no` input) and `ARControl.tsx` (defense-in-depth after format validation). Import `sanitize` from `@/domain/prompt/sanitize`.

### Vitest Test Structure
**Source:** `src/domain/prompt/serialize.test.ts` lines 1-5
```typescript
import { describe, test, expect } from 'vitest'
// (no beforeEach for pure function tests)
```
**Source:** `src/ui/ChipArea.test.tsx` lines 1-10
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// (beforeEach for store reset in component tests)
```
**Apply to:** All new test files. Pure domain tests: no `beforeEach`. Component tests and store tests: `beforeEach(() => useBuildSession.setState({ ...fullReset... }))`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/domain/flags/index.ts` | utility | — | No barrel re-export files exist yet in the project; first module with enough exports to warrant one |

---

## Metadata

**Analog search scope:** `src/domain/`, `src/state/`, `src/ui/`, `src/components/ui/`
**Files read:** 17 source files + 6 test files
**Pattern extraction date:** 2026-06-27
