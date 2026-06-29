# Phase 4: AI-Populated Palettes + BYO Key — Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 18 (new/modified)
**Analogs found:** 17 / 18

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/ai/adapter.ts` | interface | request-response | `src/persistence/adapter.ts` | exact |
| `src/domain/ai/adapter.test.ts` | test | — | `src/persistence/adapter.test.ts` | exact |
| `src/domain/ai/schema.ts` | model/schema | transform | `src/domain/flags/schema.ts` | exact |
| `src/domain/ai/schema.test.ts` | test | — | `src/domain/flags/schema.test.ts` | exact |
| `src/domain/ai/openrouter.ts` | service | request-response | `src/domain/library/import.ts` | role-match |
| `src/domain/ai/openrouter.test.ts` | test | — | `src/persistence/adapter.test.ts` | role-match |
| `src/state/paletteSession.ts` | store | event-driven | `src/state/buildSession.ts` | exact |
| `src/state/paletteSession.test.ts` | test | — | `src/state/buildSession.test.ts` | exact |
| `src/state/buildSession.ts` (MODIFY) | store | event-driven | itself | exact |
| `src/state/buildSession.test.ts` (MODIFY) | test | — | itself | exact |
| `src/hooks/useKeyStorage.ts` | hook/utility | CRUD | `src/ui/ControlsPane/ChipInput.tsx` (useState pattern) | partial |
| `src/hooks/useKeyStorage.test.ts` | test | — | `src/state/buildSession.test.ts` | role-match |
| `src/ui/ControlsPane/PaletteAccordion/PaletteAccordion.tsx` | component | event-driven | `src/ui/ControlsPane/FlagControls/FlagControls.tsx` | role-match |
| `src/ui/ControlsPane/PaletteAccordion/PaletteOption.tsx` | component | event-driven | `src/ui/ControlsPane/ChipArea.tsx` | role-match |
| `src/ui/ControlsPane/IntentInput.tsx` (MODIFY) | component | request-response | itself | exact |
| `src/ui/ControlsPane/SettingsModal/SettingsModal.tsx` | component | CRUD | `src/ui/ClearDialog.tsx` | role-match |
| `src/ui/ControlsPane/SettingsModal/KeyInput.tsx` | component | CRUD | `src/ui/ControlsPane/ChipInput.tsx` | role-match |
| `src/components/ui/accordion.tsx` | component/primitive | — | `src/components/ui/alert-dialog.tsx` | exact |

---

## Pattern Assignments

### `src/domain/ai/adapter.ts` (interface, request-response)

**Analog:** `src/persistence/adapter.ts`

**Imports + interface pattern** (lines 1-8):
```typescript
import type { LibraryEntry } from '@/domain/library/schema'

export interface StorageAdapter {
  saveEntry(entry: LibraryEntry): Promise<void>
  getAllEntries(): Promise<LibraryEntry[]>
  deleteEntry(id: string): Promise<void>
  renameEntry(id: string, name: string): Promise<void>
}
```

**Apply:** Same pattern — export only an interface and result types, no implementation. The adapter file is import-only: it defines `PaletteAdapter`, `PaletteCallResult`, and `PaletteError`. No runtime code.

---

### `src/domain/ai/schema.ts` (model/schema, transform)

**Analog:** `src/domain/flags/schema.ts`

**Imports pattern** (lines 1-1):
```typescript
import { z } from 'zod'
```

**Core schema pattern** (lines 1-51 of flags/schema.ts):
```typescript
// Discriminated union of sub-schemas, each exported with its inferred type
const SliderControlSchema = z.object({ type: z.literal('slider'), ... })
export const ControlSpecSchema = z.discriminatedUnion('type', [...])
export const FlagDefinitionSchema = z.object({ ... })
export type FlagDefinition = z.infer<typeof FlagDefinitionSchema>
```

**Apply for palette schema:** Same `z.object` + exported inferred types. Key difference: use `.catch(EMPTY_OPTS)` (not `.default([])`) on every array field — the per-category graceful degradation mechanism (AI-03, D-12):
```typescript
import { z } from 'zod'

export const PaletteOptionSchema = z.object({
  label: z.string().min(1).max(60),
  description: z.string().max(120).optional(),
})

const EMPTY_OPTS: z.infer<typeof PaletteOptionSchema>[] = []

export const PaletteResponseSchema = z.object({
  styleMedium:  z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  lighting:     z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  cameraLens:   z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  composition:  z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  color:        z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  mood:         z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
})

export type PaletteMap = z.infer<typeof PaletteResponseSchema>
export type PaletteOption = z.infer<typeof PaletteOptionSchema>
```

---

### `src/domain/ai/schema.test.ts` (test)

**Analog:** `src/domain/flags/schema.test.ts`

**Test structure pattern** (lines 1-7):
```typescript
import { describe, test, expect } from 'vitest'
import { FlagDefinitionSchema, VersionDefinitionSchema } from './schema'

describe('FlagDefinitionSchema', () => {
  test('validates a slider control', () => {
    expect(() => FlagDefinitionSchema.parse({ ... })).not.toThrow()
  })
  test('rejects control with unknown type', () => {
    expect(() => FlagDefinitionSchema.parse({ ... })).toThrow()
  })
})
```

**Apply:** Same `describe`/`test`/`expect` structure. For `schema.test.ts`, add:
- Valid full object parses without throwing
- `null` in one category field falls back to `[]` (not throw) — the `.catch()` verification
- Wrong-type field (e.g., `{ lighting: "not-an-array" }`) falls back to `[]`
- All six fields empty after all-bad input → verify total === 0

---

### `src/domain/ai/openrouter.ts` (service, request-response)

**Analog:** `src/domain/library/import.ts`

**Imports pattern** (lines 1-5 of import.ts):
```typescript
import { LibraryEntrySchema } from '@/domain/library/schema'
import type { LibraryEntry } from '@/domain/library/schema'
import { db } from '@/persistence/db'
```

**Async function with try/catch + result union pattern** (lines 11-50 of import.ts):
```typescript
export async function importLibrary(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    const text = await file.text()
    raw = JSON.parse(text)
  } catch {
    return { imported: 0, skipped: 0, error: 'parse' }
  }
  // ... validate, count, return { imported, skipped }
}
```

**Apply for openrouter.ts:** Same pattern — `async function` returning a discriminated union result type, `try/catch` wrapping the outbound call, typed error branches returned (not thrown). Key difference: the exported value is an object literal satisfying `PaletteAdapter` (not a standalone function), modeled after how `dexieAdapter` in `db.ts` satisfies `StorageAdapter`:

```typescript
// db.ts lines 18-24 — implementing an interface via object literal
export const dexieAdapter: StorageAdapter = {
  saveEntry: (entry) => db.entries.put(entry).then(() => undefined),
  getAllEntries: () => db.entries.orderBy('createdAt').reverse().toArray(),
  deleteEntry: (id) => db.entries.delete(id),
  renameEntry: (id, name) => db.entries.update(id, { ... }).then(() => undefined),
}
```

---

### `src/domain/ai/openrouter.test.ts` (test)

**Analog:** `src/persistence/adapter.test.ts`

**Test structure pattern** (lines 1-20 of adapter.test.ts):
```typescript
import 'fake-indexeddb/auto'
import { describe, test, expect, beforeEach } from 'vitest'
import { db, dexieAdapter } from '@/persistence/db'

function makeEntry(overrides?: Partial<{ id: string; name: string }>) { ... }

beforeEach(async () => { await db.entries.clear() })

describe('dexieAdapter.saveEntry', () => {
  test('persists an entry (round-trips via getAllEntries)', async () => { ... })
})
```

**Apply:** Use `vi.mock('ai', ...)` and `vi.mock('@openrouter/ai-sdk-provider', ...)` to stub `generateObject` and `createOpenRouter`. `beforeEach` resets mocks. Test the three mapError branches (401 → auth, 429 → malformed, fetch failure → network) and the all-empty total → malformed path.

---

### `src/state/paletteSession.ts` (store, event-driven)

**Analog:** `src/state/buildSession.ts`

**Full store pattern** (lines 1-77 of buildSession.ts):
```typescript
import { create } from 'zustand'
import type { Chip } from '../domain/prompt/model'
import { sanitize } from '../domain/prompt/sanitize'

interface BuildSessionState {
  intent: string
  chips: Chip[]
  // ... methods
  setIntent(intent: string): void
  addChip(label: string): void
}

export const useBuildSession = create<BuildSessionState>()((set, get) => ({
  intent: '',
  chips: [],
  setIntent: (intent) => set({ intent }),
  addChip: (label) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const sanitized = sanitize(trimmed)
    if (!sanitized) return
    const { chips } = get()
    if (chips.some((c) => c.label === sanitized)) return
    set({ chips: [...chips, { id: crypto.randomUUID(), label: sanitized, source: 'custom', enabled: true }] })
  },
  removeChip: (id) => set({ chips: get().chips.filter((c) => c.id !== id) }),
}))
```

**Apply for paletteSession.ts:** Same `create<T>()((set, get) => ...)` pattern. State shape:
```typescript
interface PaletteSessionState {
  palettes: PaletteMap | null     // null = no suggestion yet
  isLoading: boolean
  error: PaletteError | null
  setPalettes(palettes: PaletteMap): void   // D-07 replace
  setLoading(loading: boolean): void
  setError(error: PaletteError | null): void
  clearPalettes(): void
}
```

**Key constraint (React 19):** Use per-field selectors in components (`usePaletteSession((s) => s.palettes)` not `usePaletteSession((s) => ({ palettes: s.palettes, isLoading: s.isLoading }))`) — the same referential-instability guard noted in `FlagControls.tsx` line 11 comment.

---

### `src/state/buildSession.ts` — MODIFY: add `addPaletteChip`

**Analog:** itself (lines 30-51)

**Existing `addChip` to mirror** (lines 30-51):
```typescript
addChip: (label) => {
  const trimmed = label.trim()
  if (!trimmed) return
  const sanitized = sanitize(trimmed)
  if (!sanitized) return
  const { chips } = get()
  if (chips.some((c) => c.label === sanitized)) return
  set({
    chips: [
      ...chips,
      { id: crypto.randomUUID(), label: sanitized, source: 'custom', enabled: true },
    ],
  })
},
```

**New method to add** (add to interface and implementation, do not change existing `addChip`):
```typescript
// In interface:
addPaletteChip(label: string, category: string): void

// In implementation — identical sanitize + dedup gate, different source/paletteCategory:
addPaletteChip: (label, category) => {
  const trimmed = label.trim()
  if (!trimmed) return
  const sanitized = sanitize(trimmed)
  if (!sanitized) return
  const { chips } = get()
  if (chips.some((c) => c.label === sanitized)) return
  set({
    chips: [
      ...chips,
      {
        id: crypto.randomUUID(),
        label: sanitized,
        source: 'palette' as const,
        paletteCategory: category,
        enabled: true,
      },
    ],
  })
},
```

---

### `src/state/buildSession.test.ts` — MODIFY: extend with palette chip tests

**Analog:** itself (lines 1-12 for test setup, lines 95-137 for clearAll pattern)

**Extend by adding a new `describe('addPaletteChip', ...)`** block. Copy the `beforeEach` reset at line 4-11 — it already resets `chips: []`. Follow the `addChip` test shape: verify `source: 'palette'`, `paletteCategory`, dedup by sanitized label, sanitize gate blocks injection attempts.

---

### `src/hooks/useKeyStorage.ts` (hook/utility, CRUD)

**No direct analog exists** — the project has no `hooks/` directory yet. Closest partial match: the `useState` + handler pattern in `ChipInput.tsx` (lines 1-44).

**ChipInput state + handler pattern** (lines 1-13):
```typescript
import { useState } from 'react'
import { useBuildSession } from '@/state/buildSession'

export function ChipInput() {
  const [value, setValue] = useState('')
  const addChip = useBuildSession((s) => s.addChip)

  const handleAdd = () => {
    if (!value.trim()) return
    addChip(value.trim())
    setValue('')
  }
```

**Apply for useKeyStorage.ts:** Follow the React hook convention (file in `src/hooks/`, exported as `useKeyStorage`). Initialize state from `localStorage` via lazy initializer (NOT at module level — Pitfall 4 from RESEARCH.md):
```typescript
import { useState } from 'react'

const KEY = 'mj-ph-api-key'

export function useKeyStorage() {
  const [key, setKeyState] = useState(() => localStorage.getItem(KEY) ?? '')

  const saveKey = (value: string) => {
    localStorage.setItem(KEY, value)
    setKeyState(value)
  }

  const clearKey = () => {
    localStorage.removeItem(KEY)
    setKeyState('')
  }

  return { key, saveKey, clearKey }
}
```

---

### `src/hooks/useKeyStorage.test.ts` (test)

**Analog:** `src/state/buildSession.test.ts` (pattern for testing stateful units)

**Setup pattern** (lines 1-12 of buildSession.test.ts):
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { useBuildSession } from './buildSession'

beforeEach(() => {
  useBuildSession.setState({ intent: '', chips: [], ... })
})
```

**Apply:** Import `renderHook` from `@testing-library/react` (already installed via vitest setup) and use `happy-dom`'s `localStorage` mock. `beforeEach` clears `localStorage.removeItem('mj-ph-api-key')`. Test `saveKey` writes, `clearKey` removes, and lazy init reads existing key.

---

### `src/ui/ControlsPane/PaletteAccordion/PaletteAccordion.tsx` (component, event-driven)

**Analog:** `src/ui/ControlsPane/FlagControls/FlagControls.tsx`

**Imports + store selector pattern** (lines 1-17):
```typescript
import { useBuildSession } from '@/state/buildSession'
import { getFlagsForVersion } from '@/domain/flags'
// ... sub-components

export function FlagControls() {
  const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
  const flagValues = useBuildSession((s) => s.flagValues)
  // Per-field selectors — avoids React 19 referential-instability (see comment in file)
```

**Container rendering sections pattern** (lines 18-90):
```typescript
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">Flags</h3>
      {flagDefs.map((def) => {
        switch (def.control.type) {
          case 'slider': return <SliderFlagControl key={def.id} ... />
          default: return null
        }
      })}
    </div>
  )
```

**Apply for PaletteAccordion.tsx:** Same per-field Zustand selector pattern. Instead of a map over `flagDefs`, render six named `Accordion.Item` sections from `usePaletteSession`. During `isLoading`, show skeleton state on the palette region only (D-09). Wrap in `@base-ui/react/accordion` — see `accordion.tsx` wrapper below.

---

### `src/ui/ControlsPane/PaletteAccordion/PaletteOption.tsx` (component, event-driven)

**Analog:** `src/ui/ControlsPane/ChipArea.tsx`

**Badge + click handler pattern** (lines 1-35):
```typescript
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'

export function ChipArea() {
  const chips = useBuildSession((s) => s.chips)
  const removeChip = useBuildSession((s) => s.removeChip)

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge key={chip.id} variant="secondary" className="h-auto overflow-visible ...">
          <span className="truncate max-w-[200px]" title={chip.label}>
            {chip.label}
          </span>
          <Button size="icon" variant="ghost" aria-label={`Remove ${chip.label}`}
            onClick={() => removeChip(chip.id)}>✕</Button>
        </Badge>
      ))}
    </div>
  )
}
```

**Apply for PaletteOption.tsx:** Receives `option: PaletteOption`, `category: string`, `isSelected: boolean` as props. On click: if not selected → `addPaletteChip(option.label, category)`; if selected → `removeChip` by label match. Use `Badge` with a different `variant` when `isSelected`. Render `option.label` as a React text node only — never `dangerouslySetInnerHTML` (CLAUDE.md hard requirement). The `title` attribute on `<span>` can show `option.description` for hover tooltip.

---

### `src/ui/ControlsPane/IntentInput.tsx` — MODIFY: add SuggestButton + loading state

**Analog:** itself (lines 1-22) + `ChipInput.tsx` button pattern

**Existing structure to preserve** (lines 1-22 of IntentInput.tsx):
```typescript
import { Textarea } from '@/components/ui/textarea'
import { useBuildSession } from '@/state/buildSession'

export function IntentInput() {
  const intent = useBuildSession((s) => s.intent)
  const setIntent = useBuildSession((s) => s.setIntent)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="intent-input" className="text-sm font-medium">Describe your image</label>
      <Textarea id="intent-input" value={intent} onChange={(e) => setIntent(e.target.value)} ... />
    </div>
  )
}
```

**Button pattern to add** (from ChipInput.tsx lines 31-38):
```typescript
<Button variant="outline" onClick={handleAdd} disabled={!value.trim()}>
  Add keyword
</Button>
```

**Apply:** Add `usePaletteSession` selectors for `isLoading`. Add `useKeyStorage` for `key`. Add a "Suggest options" `Button` below the Textarea. Disable when `isLoading || !intent.trim() || !key`. On click: call `openRouterAdapter.generatePalettes(intent, key)` wrapped in the loading guard from `paletteSession`. Import `Loader2` from `lucide-react` for the spinner state.

---

### `src/ui/ControlsPane/SettingsModal/SettingsModal.tsx` (component, CRUD)

**Analog:** `src/ui/ClearDialog.tsx`

**AlertDialog trigger + controlled pattern** (lines 1-67 of ClearDialog.tsx):
```typescript
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function ClearButton() {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        Clear all
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start over?</AlertDialogTitle>
          <AlertDialogDescription>...</AlertDialogDescription>
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

**Key @base-ui render-prop pattern** (lines 45-46 of ClearDialog.tsx):
```typescript
// Base UI uses `render` prop for polymorphism — NOT `asChild`
<AlertDialogTrigger render={<Button variant="ghost" />}>
```

**Apply for SettingsModal.tsx:** Use `@base-ui/react/dialog` (not `alert-dialog`) via the new `accordion.tsx`-style wrapper (see below). Trigger is a gear icon `Button`. Modal contains: provider label, `KeyInput` component, privacy statement paragraph as plain text. The `render` prop pattern from `alert-dialog.tsx` is the same for `Dialog.Trigger`.

---

### `src/ui/ControlsPane/SettingsModal/KeyInput.tsx` (component, CRUD)

**Analog:** `src/ui/ControlsPane/ChipInput.tsx`

**Input + button layout pattern** (lines 16-43 of ChipInput.tsx):
```typescript
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ChipInput() {
  const [value, setValue] = useState('')

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="chip-input" className="text-sm font-medium">Add a style keyword</label>
      <div className="flex gap-2">
        <Input id="chip-input" value={value} onChange={(e) => setValue(e.target.value)} ... />
        <Button variant="outline" onClick={handleAdd} disabled={!value.trim()}>Add keyword</Button>
      </div>
    </div>
  )
}
```

**Apply for KeyInput.tsx:** Receives `{ key, onSave, onClear }` props (or uses `useKeyStorage` directly). Key change: `<Input type="password" ...>` for masking (the existing `Input` component passes `type` through — see input.tsx line 6). Add a second "Clear key" `Button` variant `ghost` beside save. Show the key as masked asterisks while stored. Never log or display the raw key in `console.log` (CLAUDE.md).

---

### `src/components/ui/accordion.tsx` (component/primitive wrapper)

**Analog:** `src/components/ui/alert-dialog.tsx` — the canonical @base-ui wrapper pattern in this codebase

**Full wrapper pattern** (lines 1-185 of alert-dialog.tsx):
```typescript
import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Each sub-component wraps the primitive, adds data-slot, applies cn() for className merging
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogContent({ className, size = "default", ...props }:
  AlertDialogPrimitive.Popup.Props & { size?: "default" | "sm" }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn("fixed top-1/2 left-1/2 ...", className)}
        {...props}
      />
    </AlertDialogPortal>
  )
}

// Named exports at bottom
export { AlertDialog, AlertDialogContent, AlertDialogHeader, ... }
```

**Apply for accordion.tsx:** Same structure — import from `@base-ui/react/accordion`, wrap each sub-component (`Accordion.Root`, `Accordion.Item`, `Accordion.Header`, `Accordion.Trigger`, `Accordion.Panel`) with `data-slot`, apply `cn()` for className, spread `...props`. Export named wrappers. Do NOT use `asChild` — this codebase uses the `render` prop pattern.

---

## Shared Patterns

### Per-Field Zustand Selectors (React 19 guard)
**Source:** `src/ui/ControlsPane/FlagControls/FlagControls.tsx` lines 13-16, `src/ui/LibraryDrawer/LibraryDrawer.tsx` lines 37-41
**Apply to:** All components reading from `useBuildSession` or `usePaletteSession`
```typescript
// Correct — per-field selectors, no object reference created
const palettes = usePaletteSession((s) => s.palettes)
const isLoading = usePaletteSession((s) => s.isLoading)

// Wrong — creates new object reference every render → infinite loop in React 19
const { palettes, isLoading } = usePaletteSession((s) => ({ palettes: s.palettes, isLoading: s.isLoading }))
```

### @base-ui Render Prop (not asChild)
**Source:** `src/ui/ClearDialog.tsx` lines 45-46, `src/ui/LibraryDrawer/LibraryDrawer.tsx` lines 73-76
**Apply to:** `SettingsModal.tsx` trigger, any @base-ui Trigger wrapper
```typescript
// Correct — @base-ui render prop pattern
<AlertDialogTrigger render={<Button variant="ghost" />}>Label</AlertDialogTrigger>

// Wrong — asChild is NOT the @base-ui pattern (it's Radix's pattern)
<AlertDialogTrigger asChild><Button>Label</Button></AlertDialogTrigger>
```

### Zod Schema + Inferred Types
**Source:** `src/domain/flags/schema.ts` lines 49-52, `src/domain/prompt/model.ts` lines 27-29
**Apply to:** `src/domain/ai/schema.ts`
```typescript
export type PaletteMap = z.infer<typeof PaletteResponseSchema>
export type PaletteOption = z.infer<typeof PaletteOptionSchema>
```

### Sanitize Chokepoint (all AI labels)
**Source:** `src/domain/prompt/sanitize.ts` lines 16-23, referenced in `buildSession.ts` lines 35-36
**Apply to:** `addPaletteChip` in `buildSession.ts`, D-08 selected-label matching in `PaletteOption.tsx`
```typescript
// addPaletteChip — same gate as addChip
const sanitized = sanitize(trimmed)
if (!sanitized) return

// D-08 matching — sanitize the incoming option label before comparing
const selectedLabels = new Set(chips.filter(c => c.source === 'palette').map(c => c.label))
const isAlreadySelected = selectedLabels.has(sanitize(option.label))
```

### Async Function Result Union (no thrown errors)
**Source:** `src/domain/library/import.ts` lines 11-50
**Apply to:** `src/domain/ai/openrouter.ts` — return `PaletteCallResult` (ok/error union) from catch blocks rather than re-throwing
```typescript
// Pattern from import.ts
try {
  const text = await file.text()
  raw = JSON.parse(text)
} catch {
  return { imported: 0, skipped: 0, error: 'parse' }
}
```

### cn() + data-slot Primitive Wrapper
**Source:** `src/components/ui/alert-dialog.tsx` lines 1-185, `src/components/ui/input.tsx` lines 1-20
**Apply to:** `src/components/ui/accordion.tsx`
```typescript
import { cn } from "@/lib/utils"
// Every wrapper function applies cn(defaultClasses, className) and adds data-slot attribute
className={cn("base-tailwind-classes", className)}
data-slot="accordion-item"
```

### Test Setup with beforeEach Reset
**Source:** `src/state/buildSession.test.ts` lines 4-11
**Apply to:** `src/state/paletteSession.test.ts`, `src/hooks/useKeyStorage.test.ts`
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

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/hooks/useKeyStorage.ts` | hook/utility | CRUD | No `hooks/` directory exists; no localStorage hook exists. Pattern derived from ChipInput.tsx's useState pattern + RESEARCH.md Code Examples (localStorage read at call time, not module init — Pitfall 4). |

---

## Metadata

**Analog search scope:** `src/domain/`, `src/state/`, `src/ui/`, `src/components/ui/`, `src/persistence/`, `src/hooks/`
**Files read:** 18 source files
**Pattern extraction date:** 2026-06-29
