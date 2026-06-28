# Phase 3: Local Library + Backup - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A user can save the current builder state to a named local library entry, see it in a list of saved prompts, reload any entry to **fully restored, editable builder state** (intent + chips + flags + selected MJ version — not just the rendered string), delete entries, and export/import the whole library as a JSON file. JSON export/import is the **only backup** against IndexedDB eviction, so durable storage is requested (PLT-03).

**In scope:** save current builder to a named entry (LIB-01); list saved prompts (LIB-02); reload restoring full `buildSession` state (LIB-03); delete an entry (LIB-04); export entire library to JSON + import it back (LIB-05); request durable storage via `navigator.storage.persist()` (PLT-03).

**Out of scope (other phases):** AI-populated palettes + BYO key (Phase 4); desktop/Tauri build + cross-target storage parity PLT-01/PLT-02 (Phase 5). Cross-device sync, server accounts, and cloud backup are permanently out of scope (PROJECT.md). No per-entry sharing, tagging, search, or folders — not in this phase's requirements.

</domain>

<decisions>
## Implementation Decisions

### Save Semantics (LIB-01)
- **D-01:** **Save always creates a NEW library entry.** No update-in-place, no "currently-loaded entry" tracking, no dirty-state-vs-saved diffing. Editing a reloaded prompt and saving produces a separate duplicate the user can delete. Simplest mental model; Save never destroys an existing entry.
- **D-02:** **Auto-name on save; rename inline later.** Save does not block on a name dialog — it generates a name and persists immediately. The user renames in the library list afterward (inline rename UI required).
- **D-03:** **Auto-name source = intent text + timestamp** (e.g. `cyberpunk city — Jun 27 14:30`). When intent is empty, fall back to timestamp alone so the name is never blank.
- **D-04:** **Duplicate names allowed.** Entries are keyed by an internal id (uuid), not by name. No uniqueness validation on names.

### Reload Behavior (LIB-03)
- **D-05:** **Confirm-if-dirty.** Reloading replaces the builder. If the builder has content (intent OR chips OR flags set), show a confirm dialog before replacing — **reuse the Phase 1 clear-dialog pattern (P1 D-11)**. If the builder is empty, reload instantly with no prompt.
- **D-06:** Reload restores **full `buildSession` state**: `intent`, `chips`, `selectedVersionId`, `flagValues`, and `setFlags` — i.e. everything `clearAll()` resets. The serializer re-derives the preview string from restored state; the saved string is never the source of truth on reload.

### Import / Export Backup (LIB-05)
- **D-07:** **Import is merge/append and non-destructive.** Imported entries are added to the existing library; existing entries are never deleted by an import. Imported entries receive **fresh ids** so they can never collide with or overwrite current entries (a re-import of the same backup yields duplicates, which is acceptable and safe).
- **D-08:** **Validate-and-skip on import.** Each entry in the imported file is Zod-validated individually. Valid entries import; invalid or wrong-`schemaVersion` entries are **skipped**, and the user is shown a count of imported vs skipped. A fully malformed/garbage file imports nothing and leaves the existing library untouched. No migration logic — only `schemaVersion: 2` exists today; older/newer versions are skipped, not coerced.
- **D-09:** **Export = entire library as one JSON file** (LIB-05 "export the saved library"). Treat all imported JSON as untrusted input (file could be hand-edited or from another machine) — parse + validate, never `eval`/trust shape.

### Library UI Surface (LIB-02, LIB-04)
- **D-10:** **Slide-over drawer.** The saved-prompts library opens in a slide-over panel/drawer over the builder, triggered by a "Library" button. The established two-pane builder layout (P1 D-09: controls left, sticky preview right) is left intact. The drawer holds: the entry list, per-entry reload / delete / inline-rename, and the export + import controls.
- **D-11:** The **Save action lives on the builder** (near the existing copy/clear controls on the preview pane), not inside the drawer — saving is a builder action; the drawer is for managing what's already saved.

### Claude's Discretion (deferred to research/planning)
- **Storage engine** — locked by CLAUDE.md to **Dexie/IndexedDB behind one storage abstraction** (the seam Phase 5 reuses for desktop). Dexie is **not yet installed** — add it (`dexie` + `dexie-react-hooks` for `useLiveQuery` reactive list). Exact table/schema shape and the abstraction interface are planner's call, subject to: must round-trip a full `PromptDraft`/session snapshot, must carry `schemaVersion`, must be swappable for a desktop backend in Phase 5 without touching UI.
- **Library entry record shape** — what exactly a saved entry stores (a serialized `PromptDraft` built from session, plus `name`, `id`, `createdAt`, `updatedAt`). The model already has `PromptDraftSchema` (schemaVersion 2) and `buildSession` carries the live fields; planner maps session ↔ entry. There is currently no session→draft snapshot helper — one is needed.
- **Export filename/format detail** — sensible default (e.g. `mj-prompt-library-<date>.json`, top-level `{ schemaVersion, exportedAt, entries: [] }`). Wrap entries so import can version-gate the whole file too.
- **Delete confirmation** — follow the established confirm-on-destructive pattern (P1 D-11) at planner discretion; deleting a single saved entry is lower-stakes than wiping the builder, so a lightweight confirm or undo is acceptable.
- **Durable-storage request timing (PLT-03)** — when to call `navigator.storage.persist()` (e.g. on first save, or app init). Pick a non-intrusive moment; it's a request, not a guarantee — handle denial silently.
- **Empty-library state** and microcopy — standard sensible defaults.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & requirements
- `.planning/ROADMAP.md` §"Phase 3: Local Library + Backup" — phase goal, 5 success criteria, requirement set (LIB-01..05, PLT-03).
- `.planning/REQUIREMENTS.md` §"Library" (LIB-01..05) + §"Platform" (PLT-03) — exact requirement text. Note PLT-01/PLT-02 are Phase 5, not here.
- `.planning/PROJECT.md` — core value, local-only constraint, "Local-only persistence, no backend" key decision; out-of-scope (no sync/accounts/cloud).

### Phase 1 & 2 foundations this phase extends
- `.planning/phases/01-manual-prompt-builder/01-CONTEXT.md` — two-pane layout (D-09), confirm-on-destroy clear dialog (D-11, reused here for reload + delete), serializer is deterministic/pure (reload re-derives, doesn't trust saved string).
- `.planning/phases/02-data-driven-flag-controls/02-CONTEXT.md` — flag state model; a saved entry must round-trip flags + version, not just intent/chips.
- `src/domain/prompt/model.ts` — `PromptDraftSchema` (`schemaVersion: z.literal(2)`, `intent`, `chips`, `flags`, `selectedVersionId`, `createdAt`, `updatedAt`). This is the record validated on import (D-08). Bump `schemaVersion` only on a breaking reshape.
- `src/state/buildSession.ts` — Zustand session store holding the live builder fields (`intent`, `chips`, `selectedVersionId`, `flagValues`, `setFlags`) and `clearAll()`. Save snapshots from here; reload restores into here. No session↔entry helper exists yet — add one.

### Tech stack (locked)
- `CLAUDE.md` §"Persistence Strategy" — **Dexie/IndexedDB, one path for both targets**; library + cache → IndexedDB via Dexie; `dexie-react-hooks` `useLiveQuery` for the reactive list. §"What NOT to Use" — do NOT use Tauri Store/`fs` (desktop-only, breaks single persistence path) or `localStorage`-only for the library.
- `CLAUDE.md` §"Security Implications" — treat imported JSON as untrusted; validate, no `dangerouslySetInnerHTML` on entry names/content; strict XSS posture since the API key (Phase 4) shares the origin.
- `CLAUDE.md` §"Persistence Strategy" / PLT-03 — durable storage via `navigator.storage.persist()` to reduce silent eviction.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/state/buildSession.ts`: `clearAll()` already resets the full session (`intent`, `chips`, `selectedVersionId`, `flagValues`, `setFlags`) — defines exactly what a saved entry must capture and reload must restore (D-06).
- `src/domain/prompt/model.ts`: `PromptDraftSchema` (schemaVersion 2) is the canonical, Zod-validatable record shape for import validation (D-08).
- `src/components/ui/*`: shadcn-style primitives incl. `alert-dialog` (reuse for reload confirm-if-dirty, D-05). A drawer/sheet primitive likely needs adding via the shadcn CLI for the library surface (D-10).
- Phase 1 clear-dialog flow: the existing "confirm before destroying builder content" UX is the template for reload-if-dirty.

### Established Patterns
- Two-pane builder layout (`ControlsPane` left / `PreviewPane` right). Library is a slide-over over this, not a layout change (D-10).
- Zustand for session state + pure serializer re-deriving preview. New: a persistence store/abstraction (Dexie) separate from the in-memory session; `useLiveQuery` drives the reactive list.
- No persistence layer exists yet — Phase 3 introduces the first storage code. Build it behind one abstraction so Phase 5 (desktop) swaps the backend without touching UI/state.

### Integration Points
- **Save:** builder action → snapshot `buildSession` into a `PromptDraft` entry → Dexie put. Needs a new session→draft helper.
- **Reload:** read entry → confirm-if-dirty → restore fields into `buildSession` (inverse of the snapshot helper) → serializer re-derives preview.
- **Delete/rename:** operate on Dexie by entry id; list re-renders via `useLiveQuery`.
- **Export/import:** serialize all Dexie entries to a versioned JSON envelope / parse + per-entry Zod-validate on import (merge, fresh ids, skip invalid).
- **Durable storage:** call `navigator.storage.persist()` at a non-intrusive point (PLT-03).

</code_context>

<specifics>
## Specific Ideas

- Reload restores **editable state, not the string** — explicitly: a reloaded prompt must be as editable as one just built by hand (LIB-03 is the headline guarantee of this phase).
- Import must never be able to destroy the user's current library (D-07) — it's the only backup, so the safe failure mode is "duplicate entries," never "lost entries."
- Library UI is a slide-over drawer, keeping the build loop's sticky preview always usable.

</specifics>

<deferred>
## Deferred Ideas

- **Update-in-place / "save over" an existing entry** — considered and rejected for this phase (D-01 chose always-new). Could revisit if duplicate clutter becomes a real pain point; would require current-entry + dirty tracking in `buildSession`.
- **Per-entry search / tags / folders / sorting** — not in LIB requirements; a future organization phase if the library grows large.
- **Import collision resolution UI (skip/overwrite/keep-both)** — considered; rejected in favor of always-append-with-fresh-ids (D-07) for safety + simplicity. Revisit only if users complain about duplicates on re-import.
- **Cross-device sync / cloud backup** — permanently out of scope (PROJECT.md); JSON export is the deliberate manual-backup substitute.

</deferred>

---

*Phase: 3-Local Library + Backup*
*Context gathered: 2026-06-27*
