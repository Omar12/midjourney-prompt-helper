# Phase 3: Local Library + Backup — Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 13 new/modified files
**Analogs found:** 9 / 13 (4 files are net-new with no codebase analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/library/schema.ts` | model | transform | `src/domain/prompt/model.ts` | exact |
| `src/domain/library/snapshot.ts` | utility | transform | `src/domain/prompt/serialize.ts` | exact |
| `src/domain/library/snapshot.test.ts` | test | transform | `src/domain/prompt/model.test.ts` | exact |
| `src/domain/library/import.ts` | utility | file-I/O + CRUD | `src/domain/flags/helpers.ts` | role-match |
| `src/domain/library/import.test.ts` | test | file-I/O | `src/domain/flags/helpers.test.ts` | role-match |
| `src/persistence/adapter.ts` | utility | CRUD | — | no analog (net-new) |
| `src/persistence/db.ts` | utility | CRUD | — | no analog (net-new) |
| `src/persistence/adapter.test.ts` | test | CRUD | `src/state/buildSession.test.ts` | role-match |
| `src/ui/LibraryDrawer/SaveButton.tsx` | component | CRUD | `src/ui/PreviewPane/CopyButton.tsx` | exact |
| `src/ui/LibraryDrawer/LibraryDrawer.tsx` | component | request-response | `src/ui/ClearDialog.tsx` | partial-match |
| `src/ui/LibraryDrawer/PromptEntryCard.tsx` | component | CRUD | `src/ui/ControlsPane/ChipArea.tsx` | partial-match |
| `src/ui/LibraryDrawer/ExportImport.tsx` | component | file-I/O | `src/ui/ClearDialog.tsx` | partial-match |
| `src/ui/App.tsx` | component (modify) | request-response | `src/ui/App.tsx` | self |

---

## Pattern Assignments

### `src/domain/library/schema.ts` (model, transform)

**Analog:** `src/domain/prompt/model.ts`

**Imports pattern** (lines 1–2):
```typescript
import { z } from 'zod'
import { PromptDraftSchema } from '@/domain/prompt/model'
```

**Core pattern** — extend existing schema, export both Zod schema and inferred type (lines 3–29 of model.ts as template):
```typescript
// Extend PromptDraftSchema with the display name field.
// PromptDraftSchema already covers id, intent, chips, flags, schemaVersion,
// selectedVersionId, createdAt, updatedAt.
// LibraryEntrySchema is used for: (a) the Dexie EntityTable type, (b) import validation.
export const LibraryEntrySchema = PromptDraftSchema.extend({
  name: z.string().min(1),  // mutable display name; non-empty enforced
})

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>
```

**Pattern notes:**
- Follow the same pattern as `model.ts` line 1: `import { z } from 'zod'` (not `import * as z`)
- Export both the schema object and the inferred type (same as `ChipSchema` / `Chip`, `PromptDraftSchema` / `PromptDraft` in lines 27–29 of model.ts)
- No default exports — named exports only, matching all existing domain files

---

### `src/domain/library/snapshot.ts` (utility, transform)

**Analog:** `src/domain/prompt/serialize.ts`

**Imports pattern** (lines 1–4 of serialize.ts as template):
```typescript
import type { LibraryEntry } from '@/domain/library/schema'
import type { BuildSessionState } from '@/state/buildSession'
```

**Core pattern** — pure functions, explicit JSDoc, no side effects (serialize.ts lines 18–49 as template):
```typescript
/**
 * Snapshot: live buildSession state → storable LibraryEntry.
 * Pure function — same inputs always produce a new entry with fresh id/timestamps.
 */
export function sessionToEntry(
  session: Pick<BuildSessionState, 'intent' | 'chips' | 'selectedVersionId' | 'flagValues' | 'setFlags'>,
  name: string,
): LibraryEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    intent: session.intent,
    chips: session.chips,
    flags: Object.entries(session.flagValues)
      .filter(([flagId]) => session.setFlags[flagId] === true)
      .map(([flagId, value]) => ({ flagId, value })),
    selectedVersionId: session.selectedVersionId,
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Restore: stored LibraryEntry → session state fields.
 * Returns a plain object; caller spreads into buildSession.setState().
 * Does NOT call serialize() — the preview is re-derived from state (D-06).
 */
export function entryToSession(
  entry: LibraryEntry,
): Pick<BuildSessionState, 'intent' | 'chips' | 'selectedVersionId' | 'flagValues' | 'setFlags'> {
  const flagValues: Record<string, unknown> = {}
  const setFlags: Record<string, boolean> = {}
  for (const { flagId, value } of entry.flags) {
    flagValues[flagId] = value
    setFlags[flagId] = true
  }
  return {
    intent: entry.intent,
    chips: entry.chips,
    selectedVersionId: entry.selectedVersionId,
    flagValues,
    setFlags,
  }
}
```

**Pattern notes:**
- No `export default` — named exports only, consistent with serialize.ts and helpers.ts
- No side effects; no `Date.now()` calls outside the `now` constant at function entry

---

### `src/domain/library/snapshot.test.ts` (test, transform)

**Analog:** `src/domain/prompt/model.test.ts`

**Imports pattern** (lines 1–2 of model.test.ts):
```typescript
import { describe, test, expect } from 'vitest'
import { sessionToEntry, entryToSession } from '@/domain/library/snapshot'
```

**Core pattern** — `describe` block per function, `test` per behavior, no `beforeEach` needed for pure functions (model.test.ts lines 4–37 as template):
```typescript
describe('sessionToEntry', () => {
  test('produces a LibraryEntry with correct intent, chips, and name', () => { ... })
  test('only includes setFlags[flagId] === true flags in entry.flags', () => { ... })
  test('schemaVersion is always 2', () => { ... })
  test('id is a valid UUID', () => { ... })
  test('createdAt and updatedAt are equal ISO strings on creation', () => { ... })
})

describe('entryToSession', () => {
  test('restores all 5 session fields correctly', () => { ... })
  test('round-trips: sessionToEntry then entryToSession produces equal session fields', () => { ... })
})
```

**Pattern notes:**
- Use `crypto.randomUUID()` in test fixtures — already used in model.test.ts lines 9, 14, etc.
- Use `new Date().toISOString()` for `createdAt`/`updatedAt` in fixture objects
- No `@testing-library/react` needed — pure domain functions, no DOM

---

### `src/domain/library/import.ts` (utility, file-I/O + CRUD)

**Analog:** `src/domain/flags/helpers.ts` (closest role-match: pure utility functions with typed returns)

**Imports pattern** (helpers.ts lines 1–3 as template):
```typescript
import { LibraryEntrySchema } from '@/domain/library/schema'
import type { LibraryEntry } from '@/domain/library/schema'
import { db } from '@/persistence/db'
```

**Core pattern** — typed return interface + async function with explicit error paths (helpers.ts's null-returning guard pattern adapted for async):
```typescript
export interface ImportResult {
  imported: number
  skipped: number
  error?: 'parse' | 'shape'
}

export async function importLibrary(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    const text = await file.text()
    raw = JSON.parse(text)
  } catch {
    return { imported: 0, skipped: 0, error: 'parse' }
  }

  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as Record<string, unknown>).entries)
  ) {
    return { imported: 0, skipped: 0, error: 'shape' }
  }

  const rawEntries = (raw as { entries: unknown[] }).entries
  const valid: LibraryEntry[] = []
  let skipped = 0

  for (const item of rawEntries) {
    const result = LibraryEntrySchema.safeParse(item)
    if (result.success) {
      valid.push({ ...result.data, id: crypto.randomUUID() })  // D-07: fresh id
    } else {
      skipped++
    }
  }

  if (valid.length > 0) {
    try {
      await db.entries.bulkAdd(valid)
    } catch {
      // BulkError: partial success; swallow — import is best-effort
    }
  }

  return { imported: valid.length, skipped }
}

export async function exportLibrary(entries: LibraryEntry[]): Promise<void> {
  const envelope = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    entries,
  }
  const json = JSON.stringify(envelope, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const blobUrl = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = `mj-prompt-library-${date}.json`
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove() }, 1000)
}

export async function requestDurableStorage(): Promise<void> {
  if (!navigator.storage?.persist) return
  const already = await navigator.storage.persisted()
  if (already) return
  await navigator.storage.persist()
}
```

**Pattern notes:**
- Named exports only — consistent with helpers.ts
- Return typed result objects (not throws) for expected failures — consistent with `serializeFlag` returning `null` rather than throwing (helpers.ts line 24)
- `importLibrary` is the only function that touches `db` directly — all other import/export helpers are pure or browser-API-only

---

### `src/domain/library/import.test.ts` (test, file-I/O)

**Analog:** `src/domain/flags/helpers.test.ts`

**Imports pattern** (helpers.test.ts lines 1–3):
```typescript
import { describe, test, expect } from 'vitest'
import 'fake-indexeddb/auto'   // MUST come before any Dexie import
import { importLibrary } from '@/domain/library/import'
import { db } from '@/persistence/db'
```

**Core pattern** — `describe` per function, `test.each` for multi-case coverage (helpers.test.ts lines 46–79 as template):
```typescript
describe('importLibrary', () => {
  test('valid file imports all entries and returns correct count', async () => { ... })
  test('mixed file imports valid entries and skips invalids, returns counts', async () => { ... })
  test('fully invalid file returns { imported: 0, skipped: N }', async () => { ... })
  test('non-JSON file returns { error: "parse" }', async () => { ... })
  test('re-import of same backup yields duplicates (fresh ids, D-07)', async () => { ... })
})
```

**Pattern notes:**
- `import 'fake-indexeddb/auto'` at the top of every Dexie-touching test file — must precede the db import
- Reset the Dexie db between tests by calling `await db.entries.clear()` in `beforeEach`
- `beforeEach` is the reset pattern used in `buildSession.test.ts` lines 4–12 — apply same discipline here

---

### `src/persistence/adapter.ts` (utility, CRUD) — NET-NEW

**No codebase analog.** Use RESEARCH.md Pattern 2 directly.

**Pattern to copy (RESEARCH.md lines 242–261):**
```typescript
// src/persistence/adapter.ts
import type { LibraryEntry } from '@/domain/library/schema'

export interface StorageAdapter {
  saveEntry(entry: LibraryEntry): Promise<void>
  getAllEntries(): Promise<LibraryEntry[]>
  deleteEntry(id: string): Promise<void>
  renameEntry(id: string, name: string): Promise<void>
}
```

**Pattern notes:**
- Interface only — no implementation in this file
- All UI/state code imports only `StorageAdapter`, not the Dexie types
- Phase 5 provides a second implementation of this interface; keeping it in a separate file preserves the seam

---

### `src/persistence/db.ts` (utility, CRUD) — NET-NEW

**No codebase analog.** Use RESEARCH.md Pattern 1 + Pattern 2 directly.

**Pattern to copy (RESEARCH.md lines 206–261):**
```typescript
// src/persistence/db.ts
import Dexie, { type EntityTable } from 'dexie'
import type { LibraryEntry } from '@/domain/library/schema'
import type { StorageAdapter } from './adapter'

const db = new Dexie('mj-prompt-library') as Dexie & {
  entries: EntityTable<LibraryEntry, 'id'>
}

// Schema string: "id" = plain string PK (no ++ = no auto-increment).
// "createdAt" indexed for orderBy('createdAt') queries.
// All other LibraryEntry fields stored without being listed here.
db.version(1).stores({
  entries: 'id, createdAt',
})

export { db }

export const dexieAdapter: StorageAdapter = {
  saveEntry:   (entry) => db.entries.put(entry).then(() => undefined),
  getAllEntries: () => db.entries.orderBy('createdAt').reverse().toArray(),
  deleteEntry: (id) => db.entries.delete(id),
  renameEntry: (id, name) =>
    db.entries.update(id, { name, updatedAt: new Date().toISOString() }).then(() => undefined),
}
```

**Critical notes:**
- `db` is a module-level singleton — never instantiate Dexie inside a component or hook
- `useLiveQuery` must import `db` directly (not through the adapter) — reactivity requires Dexie's internal transaction tracking
- Use `.put()` not `.add()` for `saveEntry` (RESEARCH.md anti-patterns section)
- Use `.update()` not `.put()` for `renameEntry` to avoid Dexie 4 cache mutation pitfall (RESEARCH.md Pitfall 7)

---

### `src/persistence/adapter.test.ts` (test, CRUD)

**Analog:** `src/state/buildSession.test.ts`

**Imports pattern** (buildSession.test.ts lines 1–2):
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/persistence/db'
import { dexieAdapter } from '@/persistence/db'
```

**Core pattern** — `beforeEach` reset + describe/test structure (buildSession.test.ts lines 4–12 as template):
```typescript
beforeEach(async () => {
  await db.entries.clear()  // reset IDB state between tests
})

describe('dexieAdapter.saveEntry', () => {
  test('persists an entry (round-trips via getAllEntries)', async () => { ... })
})

describe('dexieAdapter.deleteEntry', () => {
  test('removes entry from getAllEntries result', async () => { ... })
})

describe('dexieAdapter.renameEntry', () => {
  test('updates name and updatedAt on entry', async () => { ... })
})
```

**Pattern notes:**
- `import 'fake-indexeddb/auto'` must be the first import, before any dexie import (RESEARCH.md Pitfall 4)
- Use `async` tests throughout — all Dexie operations are Promise-based
- `beforeEach(async () => await db.entries.clear())` mirrors `useBuildSession.setState(...)` reset in buildSession.test.ts line 5

---

### `src/ui/LibraryDrawer/SaveButton.tsx` (component, CRUD)

**Analog:** `src/ui/PreviewPane/CopyButton.tsx` — exact match (same pane, async action with 2-second transient feedback)

**Imports pattern** (CopyButton.tsx lines 1–2):
```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'
import { sessionToEntry } from '@/domain/library/snapshot'
import { dexieAdapter } from '@/persistence/db'
import { requestDurableStorage } from '@/domain/library/import'
import { db } from '@/persistence/db'
```

**Core pattern** — `useState` for transient label + async handler with silent catch (CopyButton.tsx lines 8–35):
```typescript
export function SaveButton() {
  const [saved, setSaved] = useState(false)

  // Per-field selectors — avoids React 19 referential-instability infinite loop
  // (same pattern as ClearDialog.tsx lines 18–23)
  const intent = useBuildSession((s) => s.intent)
  const chips = useBuildSession((s) => s.chips)
  const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
  const flagValues = useBuildSession((s) => s.flagValues)
  const setFlags = useBuildSession((s) => s.setFlags)

  const hasContent =
    intent.trim() !== '' ||
    chips.length > 0 ||
    selectedVersionId !== null ||
    Object.values(setFlags).some(Boolean)

  const handleSave = async () => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
    const name = intent.trim()
      ? `${intent.trim().slice(0, 40)} — ${timestamp}`
      : timestamp

    const entry = sessionToEntry({ intent, chips, selectedVersionId, flagValues, setFlags }, name)
    await dexieAdapter.saveEntry(entry)

    // PLT-03: request durable storage on first-ever save (silently)
    const count = await db.entries.count()
    if (count === 1) requestDurableStorage()

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)  // same delay as CopyButton line 18
  }

  return (
    <Button
      variant="outline"
      onClick={handleSave}
      disabled={!hasContent}
      className="w-full"
    >
      {saved ? 'Saved!' : 'Save to library'}
    </Button>
  )
}
```

**Critical notes:**
- Use per-field Zustand selectors — not an object selector — to avoid React 19 referential-instability infinite loop. This pattern is established in `ClearDialog.tsx` lines 18–23 and is explicitly noted in the inline comment there.
- The `hasContent` guard mirrors `ClearDialog.tsx` lines 24–29 exactly
- `variant="outline"` per UI-SPEC.md — NOT `variant="default"` (Copy button owns the accent fill)

---

### `src/ui/LibraryDrawer/LibraryDrawer.tsx` (component, request-response)

**Analog:** `src/ui/ClearDialog.tsx` — partial match (AlertDialog pattern for confirm dialogs within; Sheet has no codebase analog)

**Imports pattern** (ClearDialog.tsx lines 1–13 as template, extended for Sheet):
```typescript
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { db } from '@/persistence/db'
import { dexieAdapter } from '@/persistence/db'
import { PromptEntryCard } from './PromptEntryCard'
import { ExportImport } from './ExportImport'
```

**useLiveQuery pattern** — always supply `defaultResult: []` third argument (RESEARCH.md Pattern 3):
```typescript
const entries = useLiveQuery(
  () => db.entries.orderBy('createdAt').reverse().toArray(),
  [],   // no closed-over deps
  []    // defaultResult: always LibraryEntry[], never undefined
)
```

**AlertDialog trigger pattern** — copy from ClearDialog.tsx lines 44–66 for reload confirm and delete confirm dialogs. Key: use `AlertDialogTrigger render={<Button />}` (Base UI polymorphism) not `asChild`.

**Sheet open/close pattern** (no codebase analog — use research):
```typescript
// Sheet is controlled via open/onOpenChange props from parent
// or via shadcn's uncontrolled SheetTrigger — prefer uncontrolled
// to keep LibraryDrawer self-contained
<Sheet>
  <SheetTrigger render={<Button variant="ghost" size="sm" />}>
    Library
  </SheetTrigger>
  <SheetContent side="right" className="w-80 flex flex-col">
    <SheetHeader>
      <SheetTitle>Saved Prompts</SheetTitle>
      <SheetDescription className="sr-only">...</SheetDescription>
    </SheetHeader>
    <div className="flex-1 overflow-y-auto flex flex-col gap-3">
      {entries.length === 0 ? <EmptyState /> : entries.map(...)}
    </div>
    <SheetFooter className="border-t pt-4">
      <ExportImport entries={entries} />
    </SheetFooter>
  </SheetContent>
</Sheet>
```

**Pattern notes:**
- `useLiveQuery` imports `db` directly — not through `dexieAdapter` — for reactivity
- Empty state guard: `entries.length === 0` (not `!entries` — defaultResult ensures it is always an array)
- All text rendered as React children — never `dangerouslySetInnerHTML`

---

### `src/ui/LibraryDrawer/PromptEntryCard.tsx` (component, CRUD)

**Analog:** `src/ui/ControlsPane/ChipArea.tsx` — partial match (list item with icon-button actions; per-item remove/action pattern)

**Imports pattern** (ChipArea.tsx lines 1–3):
```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RotateCcw, Trash2 } from 'lucide-react'
import { dexieAdapter } from '@/persistence/db'
import type { LibraryEntry } from '@/domain/library/schema'
```

**Core list-item pattern** (ChipArea.tsx lines 12–34 as structural template):
```typescript
interface PromptEntryCardProps {
  entry: LibraryEntry
  onReload: (entry: LibraryEntry) => void  // passed from LibraryDrawer (dirty-check logic lives there)
}

export function PromptEntryCard({ entry, onReload }: PromptEntryCardProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftName, setDraftName] = useState(entry.name)

  const handleRenameCommit = async () => {
    const finalName = draftName.trim() || entry.name  // empty → keep original (D-03 fallback)
    await dexieAdapter.renameEntry(entry.id, finalName)
    setIsRenaming(false)
  }

  return (
    <div className="flex flex-col gap-1 p-3 rounded-md bg-card border border-border">
      {/* name row */}
      {isRenaming ? (
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={handleRenameCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameCommit()
            if (e.key === 'Escape') { setDraftName(entry.name); setIsRenaming(false) }
          }}
          autoFocus
        />
      ) : (
        <span
          className="text-sm font-medium truncate cursor-pointer"
          title={entry.name}
          onClick={() => setIsRenaming(true)}
        >
          {entry.name}
        </span>
      )}
      {/* timestamp row */}
      <span className="text-xs text-muted-foreground">
        Saved {new Date(entry.createdAt).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })}
      </span>
      {/* action row */}
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => onReload(entry)}>
          <RotateCcw size={16} /> Reload prompt
        </Button>
        {/* Delete with AlertDialog — copy pattern from ClearDialog.tsx lines 41–66 */}
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                aria-label={`Delete ${entry.name}`}
              />
            }
          >
            <Trash2 size={16} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this prompt?</AlertDialogTitle>
              <AlertDialogDescription>
                "{entry.name}" will be permanently removed from your library.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => dexieAdapter.deleteEntry(entry.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete prompt
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
```

**Pattern notes:**
- `AlertDialogTrigger render={<Button />}` — matches ClearDialog.tsx line 45 exactly (Base UI polymorphism, no nested button)
- Destructive confirm button className copied from ClearDialog.tsx line 58–60
- Entry name rendered as `{entry.name}` text child — never `dangerouslySetInnerHTML`
- `onReload` callback is lifted to `LibraryDrawer` where the dirty-check + AlertDialog lives

---

### `src/ui/LibraryDrawer/ExportImport.tsx` (component, file-I/O)

**Analog:** `src/ui/ClearDialog.tsx` — partial match (confirm-pattern structure; file I/O itself has no analog)

**Imports pattern:**
```typescript
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Upload } from 'lucide-react'
import { exportLibrary, importLibrary } from '@/domain/library/import'
import type { LibraryEntry } from '@/domain/library/schema'
```

**Core pattern** — async button handlers with transient status message (mirrors CopyButton.tsx feedback pattern):
```typescript
interface ExportImportProps {
  entries: LibraryEntry[]
}

export function ExportImport({ entries }: ExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  const showStatus = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(null), 4000)  // auto-clear per UI-SPEC.md
  }

  const handleExport = async () => {
    await exportLibrary(entries)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await importLibrary(file)
    if (result.error) {
      showStatus('Could not read file — please try a valid JSON backup.')
    } else if (result.imported === 0) {
      showStatus('Nothing imported — no valid entries found.')
    } else if (result.skipped > 0) {
      showStatus(`Imported ${result.imported} prompt${result.imported !== 1 ? 's' : ''}. ${result.skipped} skipped (invalid format).`)
    } else {
      showStatus(`Imported ${result.imported} prompt${result.imported !== 1 ? 's' : ''}.`)
    }
    // Reset input so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleExport}
        disabled={entries.length === 0}
      >
        <Download size={16} /> Export library
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={16} /> Import backup
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />
      {status && (
        <p className="text-xs text-muted-foreground">{status}</p>
      )}
    </div>
  )
}
```

**Pattern notes:**
- Status message is `{status}` React text child — never `dangerouslySetInnerHTML` (security contract)
- Status auto-clears after 4000ms — same pattern as CopyButton.tsx `setTimeout(() => setCopied(false), 2000)` but extended per UI-SPEC
- Hidden file input triggered programmatically — no visible `<input>` rendered in the button area

---

### `src/ui/App.tsx` (component, modify)

**Analog:** `src/ui/App.tsx` itself — add Library button to preview pane header, add SaveButton below CopyButton, wrap in Sheet trigger.

**Current structure** (App.tsx lines 56–65):
```typescript
{/* Preview pane — sticky on wide viewports (D-09) */}
<div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-border md:sticky md:top-0 md:h-screen p-4 md:p-6 flex flex-col gap-4">
  <h2 className="text-sm font-medium uppercase text-muted-foreground">
    Preview
  </h2>
  <LivePreview preview={preview} />
  <CopyButton text={preview} />
</div>
```

**Modified structure** (add Library button to header row, add SaveButton, add LibraryDrawer):
```typescript
// New imports to add (lines 1–10 area):
import { SaveButton } from './LibraryDrawer/SaveButton'
import { LibraryDrawer } from './LibraryDrawer/LibraryDrawer'

// Preview pane becomes:
<div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-border md:sticky md:top-0 md:h-screen p-4 md:p-6 flex flex-col gap-4">
  <div className="flex items-center justify-between">
    <h2 className="text-sm font-medium uppercase text-muted-foreground">
      Preview
    </h2>
    <LibraryDrawer />  {/* contains its own SheetTrigger */}
  </div>
  <LivePreview preview={preview} />
  <CopyButton text={preview} />
  <SaveButton />
</div>
```

**Pattern notes:**
- Per-field Zustand selectors already used in App.tsx (lines 13–17) — maintain this pattern; do not add object selectors
- `LibraryDrawer` is self-contained with its own `SheetTrigger` — App.tsx does not manage drawer open state
- `SaveButton` reads its own session state internally via per-field selectors — App.tsx does not need to pass session props down

---

## Shared Patterns

### Per-Field Zustand Selectors (avoid React 19 infinite loop)

**Source:** `src/ui/ClearDialog.tsx` lines 18–23 (established with inline comment)
**Apply to:** `SaveButton.tsx`, `LibraryDrawer.tsx`

```typescript
// Separate per-field selectors — avoids React 19 referential-instability infinite loop
// (object selector creates a new reference on every call)
const intent = useBuildSession((s) => s.intent)
const chips = useBuildSession((s) => s.chips)
const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
const setFlags = useBuildSession((s) => s.setFlags)
```

### hasContent / Dirty Check

**Source:** `src/ui/ClearDialog.tsx` lines 24–29
**Apply to:** `SaveButton.tsx` (disabled guard), `LibraryDrawer.tsx` (reload confirm-if-dirty gate)

```typescript
const hasContent =
  intent.trim() !== '' ||
  chips.length > 0 ||
  selectedVersionId !== null ||
  Object.values(setFlags).some(Boolean)
```

### AlertDialog Destructive Confirm

**Source:** `src/ui/ClearDialog.tsx` lines 41–66
**Apply to:** `PromptEntryCard.tsx` (delete confirm), `LibraryDrawer.tsx` (reload confirm)

```typescript
// AlertDialogTrigger uses render= (Base UI polymorphism), not asChild
<AlertDialogTrigger render={<Button variant="ghost" />}>
  Label
</AlertDialogTrigger>
<AlertDialogContent>
  <AlertDialogHeader>
    <AlertDialogTitle>...</AlertDialogTitle>
    <AlertDialogDescription>...</AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel>Cancel label</AlertDialogCancel>
    <AlertDialogAction
      onClick={handler}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      Confirm label
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

**Note:** Reload confirm dialog uses `AlertDialogAction` WITHOUT the destructive className (per UI-SPEC.md — reload is a neutral replacement, not a destruction). Only delete uses the destructive styling.

### Transient Feedback Button Label

**Source:** `src/ui/PreviewPane/CopyButton.tsx` lines 9–18
**Apply to:** `SaveButton.tsx`

```typescript
const [saved, setSaved] = useState(false)
// in handler:
setSaved(true)
setTimeout(() => setSaved(false), 2000)
// in render:
{saved ? 'Saved!' : 'Save to library'}
```

### Zod safeParse for Untrusted Input

**Source:** `src/domain/prompt/model.ts` (schema definition) + `src/domain/prompt/model.test.ts` (validation tests)
**Apply to:** `src/domain/library/import.ts` (import pipeline)

```typescript
const result = LibraryEntrySchema.safeParse(item)
if (result.success) {
  // use result.data — fully typed
} else {
  skipped++
}
```

### Named Exports Only (no default exports in domain files)

**Source:** All existing domain files — `model.ts`, `serialize.ts`, `helpers.ts`, `sanitize.ts`
**Apply to:** `schema.ts`, `snapshot.ts`, `import.ts`

No `export default` in any domain or utility file. UI components may use default export only if the file exports a single component (consistent with `ClearDialog.tsx` which uses named export).

### `@/` Path Alias

**Source:** All existing source files (e.g., `buildSession.ts` line 2: `import type { Chip } from '../domain/prompt/model'` — note: some files use relative paths; shadcn-generated files use `@/`)
**Apply to:** All new files

New files should use `@/` alias for imports crossing directory boundaries (e.g., `@/domain/library/schema`, `@/persistence/db`, `@/state/buildSession`). Sibling imports within the same directory may use relative paths.

---

## No Analog Found

Files with no close match in the codebase — use RESEARCH.md patterns as primary reference:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/persistence/adapter.ts` | utility | CRUD | First persistence abstraction in the project; no prior interface pattern exists |
| `src/persistence/db.ts` | utility | CRUD | First Dexie/IndexedDB usage; no prior database module exists |
| `src/components/ui/sheet.tsx` | component | request-response | Added via `npx shadcn@latest add sheet` — generated, not hand-written |

---

## Installation Prerequisite (Wave 0 Gate)

Before any implementation file can be written, these must run:

```bash
npm install dexie dexie-react-hooks
npm install --save-dev fake-indexeddb
npx shadcn@latest add sheet
```

`fake-indexeddb/auto` must appear as the first import in every Dexie-touching test file. The `sheet` shadcn component must exist before `LibraryDrawer.tsx` imports from it.

---

## Metadata

**Analog search scope:** `src/` — all TypeScript/TSX files (13 files total)
**Files scanned:** 13 source files read in full
**Key codebase constraints carried forward:**
- `AlertDialogTrigger render={<Button />}` — not `asChild` (Base UI polymorphism, ClearDialog.tsx line 45)
- Per-field Zustand selectors mandatory for React 19 (ClearDialog.tsx inline comment)
- No default exports in domain/utility files
- `crypto.randomUUID()` already used in `buildSession.ts` line 45 — no uuid package needed
- `sanitize()` applied at `addChip()` entry point — stored `intent` and chip labels are already sanitized; no re-sanitization on read
**Pattern extraction date:** 2026-06-28
