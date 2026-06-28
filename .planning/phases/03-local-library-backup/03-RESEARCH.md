# Phase 3: Local Library + Backup — Research

**Researched:** 2026-06-28
**Domain:** IndexedDB persistence (Dexie 4), reactive list (useLiveQuery), session↔draft snapshot, browser file export/import, durable storage
**Confidence:** HIGH (all key claims verified via official docs or npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Save always creates a NEW library entry. No update-in-place.
- **D-02:** Auto-name on save; rename inline later. Save does not block on a name dialog.
- **D-03:** Auto-name source = intent text (truncated to 40 chars) + " — " + formatted timestamp. Empty intent → timestamp only.
- **D-04:** Duplicate names allowed. Entries keyed by uuid, not name.
- **D-05:** Confirm-if-dirty before reload. Reuse the Phase 1 clear-dialog pattern (AlertDialog).
- **D-06:** Reload restores full `buildSession` state: `intent`, `chips`, `selectedVersionId`, `flagValues`, `setFlags`.
- **D-07:** Import is merge/append, non-destructive. Fresh ids on every imported entry.
- **D-08:** Validate-and-skip on import. Per-entry Zod validation. Count imported vs skipped. Malformed file → no-op.
- **D-09:** Export = entire library as one JSON file.
- **D-10:** Slide-over drawer (shadcn `<Sheet side="right">`). Library button in preview pane header.
- **D-11:** Save action on the builder (preview pane), not inside the drawer.

### Claude's Discretion

- Storage engine locked to **Dexie/IndexedDB**. Exact table/schema shape and the abstraction interface (seam for Phase 5 swap).
- Library entry record shape.
- Export filename/format detail.
- Delete confirmation pattern.
- Durable-storage request timing (PLT-03).
- Empty-library state and microcopy.

### Deferred Ideas (OUT OF SCOPE)

- Update-in-place / "save over" an existing entry.
- Per-entry search, tags, folders, sorting.
- Import collision resolution UI.
- Cross-device sync / cloud backup (permanently out of scope).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIB-01 | User can save the current prompt to a named local library entry | Dexie `put()` + session→draft snapshot helper; auto-name from intent+timestamp |
| LIB-02 | User can view a list of saved prompts | `useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray())` |
| LIB-03 | User can reload a saved prompt, restoring full builder state (intent, chips, flags) | draft→session restore helper; confirm-if-dirty via AlertDialog |
| LIB-04 | User can delete a saved prompt | `db.entries.delete(id)` inside AlertDialog confirm handler |
| LIB-05 | User can export the saved library to JSON and import it back | Blob + `<a download>` export; `<input type="file">` + `File.text()` + per-entry Zod validation import |
| PLT-03 | Local persistence requests durable storage to reduce silent eviction | `navigator.storage.persist()` called on first save, result discarded silently |
</phase_requirements>

---

## Summary

Phase 3 introduces the first persistence layer in the project. The standard approach is a singleton Dexie 4 database class exposing one table (`entries`) typed with `EntityTable<LibraryEntry, 'id'>` and keyed by a user-supplied UUID string. The same Dexie instance is the only persistence backend in this phase; Phase 5 can swap it behind a `StorageAdapter` interface without touching UI or session code.

Reactive UI is driven by `useLiveQuery` from `dexie-react-hooks`. The critical caveat is that `useLiveQuery` returns `undefined` on the initial render before the IndexedDB query resolves — every consumer must handle the `undefined` case (render empty/loading state, not an error). A `defaultResult` third argument can suppress this.

Session↔draft translation is a pure mapping: `buildSession` fields (`intent`, `chips`, `selectedVersionId`, `flagValues`, `setFlags`) → `PromptDraft` fields on save, and the inverse on reload. The mapping does not call `serialize()` — the serializer is re-run from restored state, not stored as a string.

Export uses a `Blob` + `<a download>` anchor pattern (no File System Access API needed — Safari lacks it). Import reads the file via `File.text()`, parses JSON, Zod-validates each entry against `PromptDraftSchema`, assigns fresh `crypto.randomUUID()` ids, and bulk-adds valid entries. Durable storage is requested silently via `navigator.storage.persist()` on the first save action.

**Primary recommendation:** Build the Dexie db module at `src/persistence/db.ts` behind a `StorageAdapter` interface at `src/persistence/adapter.ts`. All UI and state code imports only the adapter interface; the Dexie implementation is injected at app init. This seam costs one extra file now and saves a full rewrite in Phase 5.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Save current builder state | Browser / Client | — | Snapshot Zustand session → Dexie write; no server involved |
| Reactive saved-prompts list | Browser / Client | — | `useLiveQuery` observes IndexedDB; re-renders on any write |
| Reload entry → restore session | Browser / Client | — | Read Dexie entry → populate Zustand store; serializer re-derives preview |
| Delete entry | Browser / Client | — | Dexie delete by id; list re-renders via `useLiveQuery` |
| Export library to JSON | Browser / Client | — | Read all Dexie entries → Blob → `<a download>` |
| Import JSON backup | Browser / Client | — | File.text() → JSON.parse → Zod → Dexie bulkAdd |
| Durable storage request | Browser / Client | — | `navigator.storage.persist()` in-browser API; no server |
| Persistence abstraction seam | Browser / Client | Desktop (Phase 5) | `StorageAdapter` interface; Dexie impl on web, Tauri SQLite impl in Phase 5 |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `dexie` | 4.4.4 | IndexedDB wrapper — typed tables, declarative schema, transactions | Official CLAUDE.md choice; supports web + Tauri webview; 12 yr track record; 100k+ users |
| `dexie-react-hooks` | 4.4.0 | `useLiveQuery` — reactive query hook for React | Official companion package from same Dexie.js repo; no separate observer wiring needed |

### Supporting (dev only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fake-indexeddb` | 6.2.5 | In-memory IndexedDB polyfill for Vitest/happy-dom | Tests for Dexie domain logic (db.ts, snapshot helpers, import pipeline); happy-dom does not implement IndexedDB |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dexie | Raw `indexedDB` API | More control, zero abstraction cost; but Dexie schema migrations, typed tables, and `liveQuery` eliminate enormous boilerplate |
| `dexie-react-hooks` `useLiveQuery` | Polling `useEffect` | No polling needed; `useLiveQuery` is change-reactive via IDBObserver; polling re-renders are wasteful and miss rapid mutations |
| `<a download>` Blob | `showSaveFilePicker` | File System Access API is not supported in Safari — `<a download>` is the universal fallback and sufficient for a JSON export |

**Installation (new packages only; Dexie not yet in package.json):**
```bash
npm install dexie dexie-react-hooks
npm install --save-dev fake-indexeddb
```

**Version verification (confirmed against npm registry 2026-06-28):** [VERIFIED: npm registry]
- `dexie` → 4.4.4 (published 2026-06-16)
- `dexie-react-hooks` → 4.4.0 (published 2026-03-26)
- `fake-indexeddb` → 6.2.5 (published 2025-11-07)

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `dexie` | npm | ~12 yrs (2014-08-21) | Very high (npmjs trending) | github.com/dexie/Dexie.js | [OK] | Approved |
| `dexie-react-hooks` | npm | ~6 yrs (2020-11-19) | High | github.com/dexie/Dexie.js (same monorepo) | [OK] | Approved |
| `fake-indexeddb` | npm | ~11 yrs (2015-05-09) | High | github.com/dumbmatter/fakeIndexedDB | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

No postinstall scripts found on any package (`npm view <pkg> scripts.postinstall` returned empty for all three). [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
User click "Save to library"
         │
         ▼
  buildSession (Zustand)
  intent, chips, selectedVersionId, flagValues, setFlags
         │
         ▼ sessionToEntry() helper
  LibraryEntry (PromptDraft shape + name + id + timestamps)
         │
         ▼ db.entries.put()
  IndexedDB / Dexie
         │
         ├──► useLiveQuery (LibraryDrawer)  →  PromptEntryCard list (re-renders reactively)
         │
         └──► Export: toArray() → JSON Blob → <a download>
                                                    ▲
  Import: <input file> → File.text() → JSON.parse → per-entry PromptDraftSchema.safeParse()
                                                      │ fresh ids  │ skip invalids
                                                      ▼
                                                   bulkAdd()
                                                      │
                                                      └──► useLiveQuery re-renders list

User click "Reload prompt"
         │
         ▼ dirty check (intent||chips||flags||version)
    [if dirty] AlertDialog confirm
         │
         ▼ entryToSession() helper
  buildSession.setState({ intent, chips, selectedVersionId, flagValues, setFlags })
         │
         ▼
  serialize() re-derives preview (D-06: saved string is never source of truth)
```

### Recommended Project Structure

```
src/
├── persistence/
│   ├── adapter.ts          # StorageAdapter interface (the Phase 5 seam)
│   ├── db.ts               # Dexie singleton + DexieStorageAdapter implementation
│   └── adapter.test.ts     # Dexie integration tests via fake-indexeddb
├── domain/
│   └── library/
│       ├── snapshot.ts     # sessionToEntry() + entryToSession() pure helpers
│       └── snapshot.test.ts
├── ui/
│   └── LibraryDrawer/
│       ├── LibraryDrawer.tsx
│       ├── PromptEntryCard.tsx
│       ├── SaveButton.tsx
│       └── ExportImport.tsx
└── state/
    └── buildSession.ts     # existing; no structural changes needed
```

### Pattern 1: Dexie Database Module (Singleton)

**What:** A single exported `db` instance typed with `EntityTable`. Only import this in the adapter implementation — all other code imports the adapter interface.

**When to use:** Every Dexie read/write operation in the adapter.

```typescript
// src/persistence/db.ts
// Source: https://dexie.org/docs/Tutorial/React#defining-the-database
import Dexie, { type EntityTable } from 'dexie'
import type { PromptDraft } from '@/domain/prompt/model'

export interface LibraryEntry extends PromptDraft {
  name: string  // display name, mutable via inline rename
}

const db = new Dexie('mj-prompt-library') as Dexie & {
  entries: EntityTable<LibraryEntry, 'id'>
}

// Schema string: "id" = plain string primary key (no ++ = no auto-increment).
// Only fields needed for indexed lookups go in the schema string.
// All PromptDraft fields are stored without being listed here — IndexedDB
// stores the full object; only indexed fields need declaration.
// "createdAt" is indexed so we can orderBy('createdAt') efficiently.
db.version(1).stores({
  entries: 'id, createdAt',
})

export { db }
```

**Key schema string rules** [VERIFIED: dexie.org/docs/IndexSpec]:
- `++id` = auto-increment integer primary key (not what we want)
- `id` (no prefix) = string primary key; caller must supply the value
- Fields listed after the primary key are indexed (enables `.where()` / `.orderBy()`)
- Fields NOT listed are still stored and retrievable — they just cannot be used in `.where()` index scans; use `.filter()` on them instead

### Pattern 2: StorageAdapter Interface (Phase 5 Seam)

**What:** Thin interface abstracting all persistence calls. Phase 5 provides an alternate implementation backed by Tauri SQL or a different engine.

**When to use:** Always import `StorageAdapter` in UI/state code; inject the concrete Dexie adapter at app init.

```typescript
// src/persistence/adapter.ts
import type { LibraryEntry } from './db'

export interface StorageAdapter {
  saveEntry(entry: LibraryEntry): Promise<void>
  getAllEntries(): Promise<LibraryEntry[]>
  deleteEntry(id: string): Promise<void>
  renameEntry(id: string, name: string): Promise<void>
}

// src/persistence/db.ts (continued) — Dexie implementation
export const dexieAdapter: StorageAdapter = {
  saveEntry: (entry) => db.entries.put(entry).then(() => undefined),
  getAllEntries: () => db.entries.orderBy('createdAt').reverse().toArray(),
  deleteEntry: (id) => db.entries.delete(id),
  renameEntry: (id, name) => db.entries.update(id, { name }).then(() => undefined),
}
```

**Note:** `useLiveQuery` must reference the Dexie `db` object directly — it cannot go through an interface adapter because the reactivity depends on Dexie's internal transaction tracking. Keep `useLiveQuery` calls in a thin hook that imports `db` directly; all non-reactive mutations go through the adapter.

### Pattern 3: useLiveQuery for Reactive List

**What:** Subscribe to a Dexie query so the component re-renders whenever the underlying table changes.

**Critical caveat:** Returns `undefined` on the first render while the query is in-flight. Always guard against this.

```typescript
// Source: https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/persistence/db'
import type { LibraryEntry } from '@/persistence/db'

function useLibraryEntries(): LibraryEntry[] {
  // Third arg is the defaultResult — returned synchronously on initial render
  // before the IndexedDB query resolves. Using [] avoids undefined checks
  // in the consuming component.
  const entries = useLiveQuery(
    () => db.entries.orderBy('createdAt').reverse().toArray(),
    [],   // no closure deps; query is stable
    []    // defaultResult: empty array (not undefined)
  )
  return entries  // always LibraryEntry[] due to defaultResult
}
```

**Dependency array rules** [VERIFIED: dexie.org docs]:
- Works identically to `useEffect` deps
- Include any variables closed over by the querier function
- For a query with no external deps (like the full-table scan above), pass `[]`
- Omitting `deps` entirely is valid when querier has no deps — re-runs on every Dexie mutation

### Pattern 4: Session ↔ Entry Snapshot

**What:** Pure functions translating between `buildSession` fields and a `LibraryEntry`. These are the only place the field mapping is defined.

**When to use:** `sessionToEntry()` on Save; `entryToSession()` on Reload.

```typescript
// src/domain/library/snapshot.ts
import { v4 as uuidv4 } from 'uuid'  // or crypto.randomUUID() — see note below
import type { LibraryEntry } from '@/persistence/db'
import type { BuildSessionState } from '@/state/buildSession'

// Snapshot: session state → storable entry
export function sessionToEntry(
  session: Pick<BuildSessionState, 'intent' | 'chips' | 'selectedVersionId' | 'flagValues' | 'setFlags'>,
  name: string
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

// Restore: stored entry → session state fields
// Returns plain object — caller spreads into buildSession.setState()
export function entryToSession(
  entry: LibraryEntry
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

**`crypto.randomUUID()` availability** [VERIFIED: MDN + caniuse.com]:
- Chrome 92+ / Firefox 95+ / Safari 15.4+ / Edge 92+
- Safari 15.4 released March 2022 — universally available in any browser that can run this Vite app
- Tauri webviews (WebKit on macOS/iOS, WebView2/Chromium on Windows, WebKitGTK on Linux) all ship engines newer than these minimums
- No polyfill needed

### Pattern 5: Export Library

**What:** Read all Dexie entries, wrap in a versioned envelope, serialize to JSON, trigger browser download via Blob + anchor.

**When to use:** "Export library" button click handler.

```typescript
// Source: https://web.dev/patterns/files/save-a-file
async function exportLibrary(entries: LibraryEntry[]): Promise<void> {
  const envelope = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    entries,
  }
  const json = JSON.stringify(envelope, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const blobUrl = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = `mj-prompt-library-${date}.json`
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl)
    a.remove()
  }, 1000)
}
```

**Why not `showSaveFilePicker`:** Safari does not support the File System Access API. The Blob + anchor fallback works universally and is the right choice for this app's browser target. [VERIFIED: web.dev/patterns/files/save-a-file]

### Pattern 6: Import Backup

**What:** File input click → `File.text()` → JSON.parse → per-entry Zod validation → fresh ids → `db.entries.bulkAdd()`.

**When to use:** "Import backup" button click handler.

```typescript
import { PromptDraftSchema } from '@/domain/prompt/model'
import type { LibraryEntry } from '@/persistence/db'
import { db } from '@/persistence/db'

interface ImportResult {
  imported: number
  skipped: number
  error?: string
}

async function importLibrary(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    const text = await file.text()
    raw = JSON.parse(text)
  } catch {
    return { imported: 0, skipped: 0, error: 'parse' }
  }

  // Treat entire file shape as untrusted (D-09)
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as Record<string, unknown>).entries)
  ) {
    return { imported: 0, skipped: 0, error: 'parse' }
  }

  const rawEntries = (raw as { entries: unknown[] }).entries
  const valid: LibraryEntry[] = []
  let skipped = 0

  for (const item of rawEntries) {
    const result = PromptDraftSchema.safeParse(item)
    if (result.success) {
      // D-07: fresh id so imported entry cannot collide with existing
      valid.push({
        ...(result.data as LibraryEntry),
        id: crypto.randomUUID(),
      })
    } else {
      skipped++
    }
  }

  if (valid.length > 0) {
    // bulkAdd with { allKeys: false } (default) — partial success: valid entries
    // persist even if some fail; failures are logged in the BulkError.
    // Source: https://dexie.org/docs/Table/Table.bulkAdd()
    try {
      await db.entries.bulkAdd(valid)
    } catch {
      // BulkError: some entries may still have been added.
      // Swallow — import is best-effort; the user sees the count.
    }
  }

  return { imported: valid.length, skipped }
}
```

**Note on `PromptDraftSchema` for import validation:** The existing `PromptDraftSchema` uses `z.literal(2)` for `schemaVersion`. Entries with any other `schemaVersion` will fail `.safeParse()` and be counted as skipped — which is exactly D-08's "only `schemaVersion: 2` exists today; older/newer versions are skipped, not coerced." No migration logic is needed.

**`LibraryEntry extends PromptDraft` note:** The `name` field on `LibraryEntry` is not in `PromptDraftSchema`. The import must supply the `name` separately. If the raw import object has a `name` string field, use it; otherwise fall back to `entry.intent.slice(0, 40) + ' — imported'` or similar. The planner must decide whether to extend `PromptDraftSchema` to include `name` for round-trippable exports, or derive the name from intent on import. **Recommendation:** extend the export envelope entry shape with `name` (stored in `LibraryEntry`) and add it back on valid import.

### Pattern 7: Durable Storage (PLT-03)

**What:** Request that IndexedDB data survive browser storage-pressure eviction.

**When to call:** On the first Save action — after the first `db.entries.put()` succeeds, call `navigator.storage.persist()` if not already granted. This ties the request to a user gesture (the save click), which satisfies Chrome's heuristic and Firefox's prompt timing recommendation. [VERIFIED: web.dev/articles/persistent-storage]

```typescript
// Source: https://dexie.org/docs/StorageManager + https://web.dev/articles/persistent-storage
async function requestDurableStorage(): Promise<void> {
  // Guard: check if API available (it is in all modern browsers; guard is future-proofing)
  if (!navigator.storage?.persist) return
  // Pre-flight: skip if already persisted
  const already = await navigator.storage.persisted()
  if (already) return
  // Request — result is discarded silently per PLT-03
  await navigator.storage.persist()
}

// Call after first-ever db.entries.put() succeeds:
// if ((await db.entries.count()) === 1) { requestDurableStorage() }
```

**Browser behavior** [VERIFIED: web.dev/articles/persistent-storage + MDN]:
- **Chrome/Chromium (incl. Windows WebView2):** Auto-grants or silently denies based on site engagement heuristics. No user prompt.
- **Firefox:** Shows a user permission popup. The save-button gesture is the right moment to trigger this.
- **Safari:** Auto-grants or silently denies. Safari previously evicted IndexedDB after 7 days of non-use — persistent storage exempts the origin from this. [CITED: developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria]

**Tauri note:** The Dexie.js homepage explicitly lists Electron support and states it targets "hybrid runtimes." Tauri's webviews (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux) all expose IndexedDB. `navigator.storage.persist()` is available inside Tauri webviews because the webview hosts a full browser engine. No special Tauri configuration is needed in Phase 3. [CITED: dexie.org]

### Anti-Patterns to Avoid

- **Instantiating Dexie inside a component or hook:** Dexie must be a module-level singleton. Creating a new `Dexie('mj-prompt-library')` inside a hook will re-open the database on each render, causing performance issues and potential version upgrade conflicts.
- **Trusting the shape of imported JSON:** Always Zod-validate before writing to IndexedDB. Never spread raw parsed JSON into a Dexie `put()` call.
- **Storing the serialized preview string as the source of truth:** Only store the `PromptDraft` fields. On reload, call `serialize()` again from restored session state. (D-06)
- **Putting the useLiveQuery call behind the StorageAdapter interface:** `useLiveQuery` must call Dexie APIs directly — its reactivity depends on Dexie's internal subscription tracking. The adapter interface is for mutations only.
- **Using `.add()` for Save:** Use `.put()` instead. While D-01 mandates always-new entries (preventing accidental overwrites), `.put()` is safer because if a UUID collision ever occurs (astronomically unlikely), it replaces rather than errors. For intent-driven differentiation, the UUID uniqueness is the actual guard.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB schema + versioning | Custom `indexedDB.open()` + `onupgradeneeded` | Dexie `db.version().stores()` | Raw IDB versioning is notoriously error-prone; schema migrations require manual cursor logic |
| Reactive list re-render on IDB writes | Poll `useEffect` with `setInterval` | `useLiveQuery` | `useLiveQuery` uses IDBObserver / mutation tracking — zero polling, zero missed updates |
| UUID generation | Custom random hex string | `crypto.randomUUID()` | Native, cryptographically random, available in all target browsers |
| IndexedDB in tests | `jest-fake-indexeddb` / custom mock | `fake-indexeddb` (import `fake-indexeddb/auto`) | Full-spec in-memory IDB implementation; works with Dexie's `liveQuery` global dependency |
| File download | Custom base64 encoding | `Blob` + `URL.createObjectURL` + `<a download>` | One-shot pattern, zero deps, universally supported |
| Schema validation on import | Manual type checking | `PromptDraftSchema.safeParse()` | Already defined in `model.ts`; catches all field-level type errors and the `schemaVersion: 2` guard |

**Key insight:** Dexie's `liveQuery` / `useLiveQuery` is the primary reason to use the library rather than raw IDB. Reactivity to database changes without polling is non-trivial to implement correctly; Dexie handles it via an internal binary range tree algorithm that detects which queries are affected by which mutations.

---

## Common Pitfalls

### Pitfall 1: `useLiveQuery` Returns `undefined` on First Render

**What goes wrong:** Component renders with `entries === undefined`, crashes on `entries.map()` or `entries.length`.

**Why it happens:** `useLiveQuery` is async; it returns `undefined` synchronously on the first render while the IndexedDB query is in-flight. [VERIFIED: dexie.org/docs/dexie-react-hooks/useLiveQuery()]

**How to avoid:** Always supply the `defaultResult` third argument when the return type matters on first render:
```typescript
const entries = useLiveQuery(
  () => db.entries.orderBy('createdAt').reverse().toArray(),
  [],
  []   // <-- defaultResult; entries is always LibraryEntry[], never undefined
)
```
Or guard: `if (!entries) return <LoadingState />`

**Warning signs:** TypeScript accepting `entries?.map(...)` without complaining = correct; TypeScript error on `entries.map(...)` = you forgot the default.

### Pitfall 2: Dexie Database Name Mismatch Across Environments

**What goes wrong:** Development, test, and production all share the same IndexedDB database name. Tests pollute the real library, or schema version conflicts arise when upgrading.

**Why it happens:** `new Dexie('mj-prompt-library')` uses the literal string globally within the origin.

**How to avoid:** In tests, use `fake-indexeddb` (see Pitfall 4) — it runs in-memory and never touches real IndexedDB. In production, the single name `'mj-prompt-library'` is correct.

### Pitfall 3: Non-Dexie Promises Inside `useLiveQuery` Querier

**What goes wrong:** Mixing non-Dexie async calls (e.g. `fetch()`, `crypto.subtle`) inside the `useLiveQuery` querier causes the observation context to break — Dexie can no longer track which IDB ranges were accessed.

**Why it happens:** Dexie patches the global Promise to track access during query execution. Non-Dexie promises bypass this tracking. [VERIFIED: dexie.org/docs/dexie-react-hooks/useLiveQuery()]

**How to avoid:** Keep `useLiveQuery` querier functions as pure IDB queries. All non-Dexie async work goes outside the querier.

### Pitfall 4: Testing Dexie with happy-dom (No Native IndexedDB)

**What goes wrong:** `db.entries.put()` throws or returns silently in Vitest/happy-dom tests because happy-dom does not implement IndexedDB.

**Why it happens:** happy-dom is a lightweight DOM simulator; IndexedDB is not part of its implementation.

**How to avoid:** Install `fake-indexeddb` and import `fake-indexeddb/auto` in the test setup file **or** at the top of each Dexie-touching test file. This polyfills `globalThis.indexedDB` and `globalThis.IDBKeyRange` — both required by Dexie's `liveQuery` subscription system. [VERIFIED: github.com/dumbmatter/fakeIndexedDB]

```typescript
// In a Dexie integration test or test setup:
import 'fake-indexeddb/auto'
import { db } from '@/persistence/db'
```

**Important:** `fake-indexeddb/auto` must be imported before `dexie` is imported, or Dexie will have already captured the real (absent) `indexedDB` global.

### Pitfall 5: `LibraryEntry` Includes `name` — PromptDraftSchema Does Not

**What goes wrong:** On import, `PromptDraftSchema.safeParse(rawEntry)` succeeds but the validated object lacks `name`. Spreading `result.data` into Dexie produces entries with `name: undefined`.

**Why it happens:** `LibraryEntry extends PromptDraft` adds the `name` field, but `PromptDraftSchema` (the import validation schema) does not know about `name`.

**How to avoid:** Two options:
1. **Recommended:** Create `LibraryEntrySchema = PromptDraftSchema.extend({ name: z.string() })` and use it for both the Dexie table type and import validation. Export envelopes always include `name` per entry.
2. **Alternative:** Derive `name` from `entry.intent` on import when `name` is absent. Simpler but loses the stored display name from the exporting machine.

The planner should pick option 1 to make exports fully round-trippable.

### Pitfall 6: Safari IndexedDB Eviction Without Persistence

**What goes wrong:** Safari evicts IndexedDB data for origins not visited in 7+ days without `navigator.storage.persist()` having been granted.

**Why it happens:** Safari's ITP (Intelligent Tracking Prevention) treats inactive origins as candidates for storage reclamation. [CITED: developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria]

**How to avoid:** Call `navigator.storage.persist()` on the first save action (PLT-03). Safari auto-grants or auto-denies based on engagement; the call is non-blocking and silent. This is the minimum viable defense against eviction for a local-first app.

**Warning signs:** User reports losing library data after not opening the app for a week → Safari eviction. The JSON export/import (LIB-05) is the explicit user-controlled backup hedge for exactly this failure mode.

### Pitfall 7: Mutation Caching in Dexie 4 (Deep Clone)

**What goes wrong:** After calling `useLiveQuery`, you mutate the returned objects in-place (e.g. `entries[0].name = 'new name'`), then call `db.entries.put(entries[0])`. The `useLiveQuery` re-render does not fire because the cached object was mutated before Dexie could detect the change.

**Why it happens:** Dexie 4 deeply clones query results on read to isolate consumers from in-place mutations. If you mutate the clone and put it back, the subscription may not detect the diff correctly.

**How to avoid:** Always call `db.entries.update(id, { name: newName })` for partial updates rather than mutating and putting back the full object. For the rename use case, use `update()` not `put()`. [CITED: github.com/dexie/Dexie.js/discussions/1661]

---

## Code Examples

### Full Save Flow (SaveButton click handler)

```typescript
// Source: patterns above + dexie.org/docs/Tutorial/React
import { useBuildSession } from '@/state/buildSession'
import { sessionToEntry } from '@/domain/library/snapshot'
import { dexieAdapter } from '@/persistence/db'

async function handleSave(): Promise<void> {
  const session = useBuildSession.getState()
  const intent = session.intent.trim()
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
  const name = intent
    ? `${intent.slice(0, 40)} — ${timestamp}`
    : timestamp

  const entry = sessionToEntry(session, name)
  await dexieAdapter.saveEntry(entry)

  // PLT-03: request durable storage on first-ever save
  const count = await db.entries.count()
  if (count === 1) {
    requestDurableStorage()  // fire-and-forget, result discarded
  }
}
```

### Rename in Place

```typescript
// Source: dexie.org/docs/Table/Table.update()
// Use update() not put() — avoids cache mutation pitfall (Pitfall 7)
await db.entries.update(entryId, { name: newName, updatedAt: new Date().toISOString() })
```

### Delete with AlertDialog Pattern

```typescript
// AlertDialog confirm → call adapter
await dexieAdapter.deleteEntry(entryId)
// useLiveQuery in LibraryDrawer auto-re-renders with updated list
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `localStorage` for structured data | IndexedDB via Dexie | Dexie 1.x → ongoing | Transactions, binary data, no 5MB quota, queryable |
| Dexie `liveQuery` requires RxJS | `useLiveQuery` hook in `dexie-react-hooks` | Dexie 3.x | React-native hook; no observable subscription management needed |
| Raw IndexedDB in Electron desktop apps | Dexie in Tauri webview (same code) | Tauri 2.x | Single codebase; Dexie explicitly supports hybrid runtimes |
| `showSaveFilePicker` for file download | `Blob` + `<a download>` fallback | Ongoing | Safari still lacks File System Access API; fallback is the universal choice |
| Dexie schema `++id` for string PKs | `id` (no prefix) for UUID string PKs | Always | `++` only works for auto-increment integers |

**Deprecated/outdated:**
- `idb-keyval`: Simpler but no `liveQuery`, no schema versioning, no typed tables. Not appropriate here.
- `localForage`: Does not support `liveQuery` reactivity. Use Dexie.
- Per-vendor IndexedDB transaction patterns: Dexie wraps these; never write `db.transaction('rw', ...)` manually when Dexie's `.put()` / `.add()` auto-transact.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `LibraryEntry extends PromptDraft` with an added `name: string` field is the correct shape for the stored record | Architecture Patterns / Pattern 1 | If the planner chooses a different record shape, the schema string and TypeScript types must change |
| A2 | `navigator.storage.persist()` is available in Tauri webviews on all three platforms | Pitfall 6, Pattern 7 | If unavailable in a specific webview, PLT-03 silently no-ops — harmless but uncovered |
| A3 | The existing `PromptDraftSchema` does not yet include `name` (confirmed by reading `model.ts`) — extending it to `LibraryEntrySchema` is a Phase 3 addition | Pitfall 5 | Already verified; not assumed |

**If this table is empty:** All other claims in this research were verified or cited.

---

## Open Questions (RESOLVED)

1. **`LibraryEntry.name` in the import/export schema**
   - What we know: `PromptDraftSchema` (the import validator) lacks `name`. `LibraryEntry` needs it.
   - What's unclear: Whether to extend `PromptDraftSchema` with `name` or validate name separately on import.
   - RESOLVED: Create `LibraryEntrySchema = PromptDraftSchema.extend({ name: z.string() })` in a new `src/domain/library/schema.ts` file. Use this for both the Dexie `EntityTable` type and import validation. Export envelopes serialize the full `LibraryEntry` (including `name`) per entry, making exports round-trippable. (Implemented in 03-01 Task 1.)

2. **Inline rename's `updatedAt` update**
   - What we know: `PromptDraftSchema` includes `updatedAt`.
   - What's unclear: Whether renaming an entry should update `updatedAt` (it's a metadata change, not a prompt change).
   - RESOLVED: Yes, update `updatedAt` on rename — `updatedAt` semantically means "entry record last modified," not "prompt content last modified." (Implemented in 03-01 `dexieAdapter.renameEntry`.)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `dexie` npm package | LIB-01..05 | ✗ (not yet installed) | 4.4.4 on registry | None — must install |
| `dexie-react-hooks` npm package | LIB-02 | ✗ (not yet installed) | 4.4.0 on registry | None — must install |
| `fake-indexeddb` npm package | Persistence tests | ✗ (not yet installed) | 6.2.5 on registry | None — tests will fail without it |
| `navigator.storage.persist()` | PLT-03 | ✓ (available in all modern browsers + Tauri webviews) | API — no version | Silent no-op if absent |
| `crypto.randomUUID()` | uuid generation | ✓ (Safari 15.4+, Chrome 92+, Firefox 95+) | API — no version | None needed |
| `Blob` + `URL.createObjectURL` | LIB-05 export | ✓ (universally available) | API — no version | None needed |
| `File.text()` | LIB-05 import | ✓ (modern browsers) | API — no version | `FileReader.readAsText()` |

**Missing dependencies with no fallback:** `dexie`, `dexie-react-hooks`, `fake-indexeddb` — must be installed in Wave 0.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vite.config.ts` (unified config) |
| Quick run command | `npx vitest run src/domain/library` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIB-01 | `sessionToEntry()` produces a valid `LibraryEntry` with correct fields | unit | `npx vitest run src/domain/library/snapshot.test.ts` | ❌ Wave 0 |
| LIB-01 | `dexieAdapter.saveEntry()` persists an entry (round-trips via `getAllEntries`) | integration | `npx vitest run src/persistence/adapter.test.ts` | ❌ Wave 0 |
| LIB-02 | `useLiveQuery` list re-renders when a new entry is saved | component | `npx vitest run` (RTL) | ❌ Wave 0 |
| LIB-03 | `entryToSession()` restores all 5 session fields correctly | unit | `npx vitest run src/domain/library/snapshot.test.ts` | ❌ Wave 0 |
| LIB-04 | `dexieAdapter.deleteEntry()` removes entry from `getAllEntries()` result | integration | `npx vitest run src/persistence/adapter.test.ts` | ❌ Wave 0 |
| LIB-05 | `importLibrary()` validates-and-skips invalid entries, returns correct counts | unit | `npx vitest run src/domain/library/import.test.ts` | ❌ Wave 0 |
| LIB-05 | Re-import of same backup yields duplicates (fresh ids), existing entries unaffected | integration | `npx vitest run src/persistence/adapter.test.ts` | ❌ Wave 0 |
| PLT-03 | `requestDurableStorage()` is called after first save and not on subsequent saves | unit (mock) | `npx vitest run src/persistence/adapter.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/library && npx vitest run src/persistence`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/domain/library/schema.ts` — `LibraryEntrySchema` (PromptDraftSchema extended with `name`)
- [ ] `src/domain/library/snapshot.ts` — `sessionToEntry()` + `entryToSession()` helpers
- [ ] `src/domain/library/snapshot.test.ts` — covers LIB-01 (save), LIB-03 (restore)
- [ ] `src/domain/library/import.test.ts` — covers LIB-05 import pipeline (validate-and-skip)
- [ ] `src/persistence/adapter.ts` — `StorageAdapter` interface
- [ ] `src/persistence/db.ts` — Dexie singleton + `dexieAdapter` + `LibraryEntry` type
- [ ] `src/persistence/adapter.test.ts` — integration tests using `fake-indexeddb/auto`
- [ ] Install: `npm install dexie dexie-react-hooks && npm install --save-dev fake-indexeddb`
- [ ] Install shadcn Sheet: `npx shadcn@latest add sheet` (per 03-UI-SPEC.md)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (local-only, no auth) |
| V3 Session Management | no | — |
| V4 Access Control | no | — (single-user local app) |
| V5 Input Validation | yes | `PromptDraftSchema.safeParse()` on all imported JSON |
| V6 Cryptography | no | `crypto.randomUUID()` is a standard browser API, not hand-rolled |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed imported JSON causes app crash or data corruption | Tampering | `JSON.parse` in try/catch; `PromptDraftSchema.safeParse()` per entry; invalid entries silently skipped |
| Imported entry names reflected into DOM as XSS vector | Tampering | Render all names as React text children only — never `dangerouslySetInnerHTML`; entry names from import are validated strings |
| Intent text containing MJ syntax injected into stored record | Tampering | `sanitize()` already applied before text enters `buildSession`; stored `intent` is already sanitized; no second sanitization needed on read |
| Import status message leaks file content into DOM | Information Disclosure | Status messages contain only controlled copy + integer counts assembled via template literals; no file content reflected |

**Note on API key (Phase 4 concern):** Phase 3 does not store or handle API keys. However, the XSS posture established here (no `dangerouslySetInnerHTML`, treat imported data as untrusted) directly protects the key storage that Phase 4 will add to the same origin.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint | Impact on Phase 3 |
|-----------|-----------|-------------------|
| Single codebase for web + desktop | Tauri + Vite SPA | All persistence must use web-native APIs (IndexedDB/Dexie), not Tauri-specific plugins |
| Local-only persistence | No backend | Dexie/IndexedDB is the correct and only persistence layer |
| Do NOT use Tauri Store/fs plugin | CLAUDE.md §"What NOT to Use" | Not applicable in Phase 3 (web only); enforced at Phase 5 |
| Do NOT use localStorage for library | CLAUDE.md §"Persistence Strategy" | Library stored in Dexie/IndexedDB only |
| Treat imported JSON as untrusted | CLAUDE.md §"Security Implications" | Per-entry `safeParse()` on import; no `eval` |
| No `dangerouslySetInnerHTML` on untrusted content | CLAUDE.md §"Security Implications" | Entry names/content rendered as React text children only |
| API key never sent to first-party server | CLAUDE.md §"Security" | Not applicable in Phase 3; no key handling yet |
| Dexie/IndexedDB for prompt library | CLAUDE.md §"Persistence Strategy" | Locked — no alternative |
| `dexie-react-hooks` `useLiveQuery` for reactive list | CLAUDE.md §"Persistence Strategy" | Locked — use `useLiveQuery`, not polling |
| XSS prevention is a hard requirement | CLAUDE.md §"Security Implications" | Phase 3 adds the import pipeline — the riskiest new input surface; validate everything |

---

## Sources

### Primary (HIGH confidence)
- [dexie.org/docs/Tutorial/React](https://dexie.org/docs/Tutorial/React) — Dexie database class pattern, `EntityTable`, singleton, `useLiveQuery` usage
- [dexie.org/docs/dexie-react-hooks/useLiveQuery()](https://dexie.org/docs/dexie-react-hooks/useLiveQuery()) — Full signature, undefined initial state, deps array, defaultResult
- [dexie.org/docs/Table/Table.put()](https://dexie.org/docs/Table/Table.put()) — put() upsert semantics
- [dexie.org/docs/Table/Table.bulkAdd()](https://dexie.org/docs/Table/Table.bulkAdd()) — bulkAdd() partial success behavior, BulkError
- [dexie.org/docs/IndexSpec](https://dexie.org/docs/IndexSpec) — Schema string prefix syntax (`++`, `&`, `*`)
- [dexie.org/docs/StorageManager](https://dexie.org/docs/StorageManager) — navigator.storage.persist() / persisted() usage
- [web.dev/articles/persistent-storage](https://web.dev/articles/persistent-storage) — Browser-specific persist() behavior (Chrome auto-grant, Firefox prompt, Safari)
- [web.dev/patterns/files/save-a-file](https://web.dev/patterns/files/save-a-file) — Blob + `<a download>` + `showSaveFilePicker` pattern
- [developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) — crypto.randomUUID() browser support
- [caniuse.com/mdn-api_crypto_randomuuid](https://caniuse.com/mdn-api_crypto_randomuuid) — Safari 15.4+ confirmed
- npm registry (2026-06-28): `dexie` 4.4.4, `dexie-react-hooks` 4.4.0, `fake-indexeddb` 6.2.5

### Secondary (MEDIUM confidence)
- [github.com/dexie/Dexie.js/discussions/1661](https://github.com/dexie/Dexie.js/discussions/1661) — extra renders / mutation caching in Dexie 4
- [github.com/dumbmatter/fakeIndexedDB](https://github.com/dumbmatter/fakeIndexedDB) — fake-indexeddb setup with liveQuery
- [v2.tauri.app/reference/webview-versions/](https://v2.tauri.app/reference/webview-versions/) — Tauri 2 webview engines per platform

### Tertiary (LOW confidence)
- None — all key claims verified via official docs or registry.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `dexie` + `dexie-react-hooks` are the CLAUDE.md-locked choices; versions confirmed via npm registry 2026-06-28
- Architecture / patterns: HIGH — all code patterns derived from official Dexie docs
- Pitfalls: HIGH — undefined initial state, schema prefix syntax, testing gap all confirmed via official docs and GitHub discussions
- Browser API surface (storage.persist, crypto.randomUUID, Blob): HIGH — confirmed via MDN + web.dev

**Research date:** 2026-06-28
**Valid until:** 2026-09-28 (90 days — Dexie and browser APIs are stable; re-verify if upgrading Dexie major version)
