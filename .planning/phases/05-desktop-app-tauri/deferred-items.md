# Deferred Items — Phase 05 (desktop-app-tauri)

## Pre-existing test failures unrelated to Plan 05-01

**Found during:** Plan 05-01, Task 2 (`npx vitest run` verification step)

**Issue:** 3 test files fail with `Failed to resolve import "ai"`:
- `src/domain/ai/openrouter.test.ts`
- (2 other files importing from the `ai` package, same root cause)

**Root cause:** The `ai` npm package (Vercel AI SDK core) is not present in `node_modules` or listed in `package.json`/`package-lock.json`, despite `@ai-sdk/*` and `@openrouter/ai-sdk-provider` packages being installed. This is a Phase 4 dependency gap — not caused by this plan's changes (verified: `git diff package-lock.json` shows zero changes to any `ai`/`@ai-sdk`/`@openrouter` entries).

**Status:** Out of scope for Plan 05-01 (files_modified for this plan is `vite.config.ts`, `package.json` scripts key, and `src-tauri/*` — installing a missing runtime dependency for Phase 4 code is outside this plan's scope per the deviation-rules SCOPE BOUNDARY).

**199 of 202 tests pass; the 3 failures are pre-existing and unrelated to Tauri scaffolding.**

**Recommended follow-up:** File a fix-forward task in Phase 4 (or a maintenance plan) to add `"ai"` to `package.json` dependencies and reinstall.
