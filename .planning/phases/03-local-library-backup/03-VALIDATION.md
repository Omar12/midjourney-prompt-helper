---
phase: 3
slug: local-library-backup
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-28
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Ported from 03-RESEARCH.md §Validation Architecture; per-task map derived from 03-01..03-04 PLAN.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 |
| **Config file** | `vite.config.ts` (unified config) |
| **Quick run command** | `npx vitest run src/domain/library && npx vitest run src/persistence` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/domain/library && npx vitest run src/persistence`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | LIB-01 / LIB-04 / PLT-03 | T-03-02 | Entry names rendered as text only (no innerHTML) | integration | `npx vitest run src/persistence/adapter.test.ts` | ❌ W0 (TDD) | ⬜ pending |
| 03-01-02 | 01 | 1 | LIB-01 / LIB-03 | — | N/A (pure functions) | unit | `npx vitest run src/domain/library/snapshot.test.ts` | ❌ W0 (TDD) | ⬜ pending |
| 03-01-03 | 01 | 1 | LIB-02 / PLT-03 | T-03-02 | useLiveQuery defaultResult `[]`; no dangerouslySetInnerHTML | component | `npx tsc --noEmit && npx vitest run` | ❌ W0 (TDD) | ⬜ pending |
| 03-02-01 | 02 | 2 | LIB-04 | T-03-02 | Delete confirm; names as text | typecheck | `npx tsc --noEmit` | ❌ W0 (TDD) | ⬜ pending |
| 03-02-02 | 02 | 2 | LIB-03 | — | Reload confirm-if-dirty | component | `npx tsc --noEmit && npx vitest run` | ❌ W0 (TDD) | ⬜ pending |
| 03-03-01 | 03 | 2 | LIB-05 | T-03-import | Per-entry safeParse validate-and-skip; fresh ids; non-destructive merge | unit | `npx vitest run src/domain/library/import.test.ts` | ❌ W0 (TDD) | ⬜ pending |
| 03-03-02 | 03 | 2 | LIB-05 | T-03-import | Export envelope round-trips import schema | unit | `npx tsc --noEmit && npx vitest run` | ❌ W0 (TDD) | ⬜ pending |
| 03-04-01 | 04 | 3 | LIB-05 | T-03-info | Import status = integer counts only, no file content reflected | component | `npx tsc --noEmit && npx vitest run` | ❌ W0 (TDD) | ⬜ pending |
| 03-04-02 | 04 | 3 | LIB-05 / PLT-03 | — | Manual smoke: export→import round-trip; durable storage requested | manual | checkpoint:human-verify | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Dependencies and scaffolding required before TDD tasks run. **All satisfied** (verified in package.json 2026-06-28):

- [x] `dexie ^4.4.4` installed
- [x] `dexie-react-hooks ^4.4.0` installed
- [x] `fake-indexeddb ^6.2.5` installed (devDependency)
- [x] `vitest ^4.1.9` present
- [x] shadcn `sheet` component added (`src/components/ui/sheet.tsx`)

Test files (`adapter.test.ts`, `snapshot.test.ts`, `import.test.ts`) are created by their owning TDD tasks (RED→GREEN) within the plans — not pre-stubbed in Wave 0.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `navigator.storage.persist()` called on first save only (count===1), skipped on subsequent saves | PLT-03 | Mocking the browser StorageManager + count gate is high-cost for low value; covered by code-presence grep in 03-01-03 acceptance + manual smoke | In dev server, clear IndexedDB, save once, confirm a single persist request fires; save again, confirm no second request |
| Full export→import round-trip restores entries with fresh ids; existing library untouched | LIB-05 | Real file download + re-upload through the browser file picker | 03-04 Task 2 checkpoint: export library, import the file, confirm duplicate entries appear and originals remain |
| Saved prompts survive a full browser page reload | LIB-01/LIB-02 | Requires real IndexedDB persistence across reload | Save a prompt, reload the page, confirm it still appears in the drawer |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are explicit manual checkpoints
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (deps installed; test files created by TDD tasks)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-28
