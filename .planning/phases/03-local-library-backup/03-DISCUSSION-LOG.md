# Phase 3: Local Library + Backup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 3-Local Library + Backup
**Areas discussed:** Save semantics, Reload vs unsaved work, Import strategy, Library UI surface

---

## Save semantics

### Save mode

| Option | Description | Selected |
|--------|-------------|----------|
| Always new entry | Save always creates a fresh entry; no current-entry tracking | ✓ |
| Update if reloaded | Overwrite the reloaded entry in place; needs current-id + dirty tracking | |

**User's choice:** Always new entry

### Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog, dupes OK | Name dialog on save, duplicate names allowed | |
| Dialog, names unique | Name dialog with uniqueness validation | |
| Auto-name, rename later | Instant save with generated name, inline rename in list | ✓ |

**User's choice:** Auto-name, rename later

### Auto-name source

| Option | Description | Selected |
|--------|-------------|----------|
| Intent text | First chars of intent, timestamp fallback | |
| Timestamp | Date/time only | |
| Intent + timestamp | Both, e.g. "cyberpunk city — Jun 27" | ✓ |

**User's choice:** Intent + timestamp

**Notes:** Entries keyed by internal id; duplicate names therefore allowed by construction.

---

## Reload vs unsaved work

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm if dirty | Confirm before replacing only when builder has content; instant if empty | ✓ |
| Always silent swap | Reload immediately, no prompt | |
| Always confirm | Confirm on every reload | |

**User's choice:** Confirm if dirty

**Notes:** Reuse the Phase 1 clear-dialog pattern (P1 D-11). "Dirty" = intent OR chips OR flags present.

---

## Import strategy

### Merge behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Merge / append | Add imported entries, keep existing, fresh ids, non-destructive | ✓ |
| Replace all | Wipe library, load only the file | |
| Merge, ask on collision | Append with per-collision skip/overwrite/keep-both prompt | |

**User's choice:** Merge / append

### Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Validate, skip bad | Zod-validate per entry, import valid, skip + report invalid/mismatched | ✓ |
| All-or-nothing | Any failure rejects the whole import | |
| Best-effort import | Import anything that parses, no schema gate | |

**User's choice:** Validate, skip bad

**Notes:** Import is the only backup → safe failure mode is duplicates, never lost entries. Wrong schemaVersion entries skipped (no migration; only v2 exists).

---

## Library UI surface

| Option | Description | Selected |
|--------|-------------|----------|
| Slide-over drawer | Library opens in a drawer over the builder; two-pane layout intact | ✓ |
| Separate view/route | Dedicated Library screen | |
| Inline third panel | Persistent panel in the builder layout | |

**User's choice:** Slide-over drawer

**Notes:** Drawer holds list + per-entry reload/delete/rename + export/import. Save action stays on the builder (preview pane), not in the drawer.

---

## Claude's Discretion

- Storage engine: locked by CLAUDE.md to Dexie/IndexedDB behind one abstraction (not yet installed). Schema/abstraction shape = planner.
- Library entry record shape + session↔draft snapshot helper (none exists yet).
- Export filename + JSON envelope format.
- Delete confirmation UX (lightweight confirm or undo acceptable).
- Durable-storage request timing for `navigator.storage.persist()` (PLT-03).
- Empty-library state and microcopy.

## Deferred Ideas

- Update-in-place / "save over" an entry (rejected; revisit if duplicate clutter hurts).
- Per-entry search / tags / folders / sorting (not in LIB requirements).
- Import collision-resolution UI (rejected for append-with-fresh-ids simplicity).
- Cross-device sync / cloud backup (permanently out of scope per PROJECT.md).
