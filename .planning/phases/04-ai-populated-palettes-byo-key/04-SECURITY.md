# SECURITY.md — Phase 04: AI-Populated Palettes (BYO Key)

**ASVS Level:** L1
**Audit disposition:** SECURED — 20/20 threats closed (13 mitigate verified, 7 accept documented)
**Block policy:** block_on=high → no open high-severity threats; phase may ship.
**Register mode:** authored-at-plan-time (verification only; no new-threat scan).

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-04-01-01 | InfoDisclosure | mitigate | CLOSED | `src/domain/ai/openrouter.ts:50-53` — key accepted as arg, guarded, never logged/returned |
| T-04-01-02 | Tampering | mitigate | CLOSED | `src/domain/ai/schema.ts:10-17` — 6 fields, `.catch(EMPTY_OPTS)` per field |
| T-04-01-03 | InfoDisclosure | mitigate | CLOSED | `src/domain/ai/openrouter.ts:26-45` — fixed error strings; `err.responseBody` never surfaced |
| T-04-01-04 | Tampering | mitigate | CLOSED | `src/domain/ai/openrouter.ts:57` — `createOpenRouter({ apiKey })` direct to openrouter.ai, no proxy |
| T-04-01-SC | Tampering | accept | CLOSED (accepted) | ai@7.0.5 + @openrouter/ai-sdk-provider@2.10.0 passed slopcheck (04-01-SUMMARY) |
| T-04-02-01 | InfoDisclosure | accept | CLOSED (accepted) | `src/hooks/useKeyStorage.ts:30-31` — plaintext localStorage, web v1 per CLAUDE.md; XSS controls are mitigating |
| T-04-02-02 | Tampering | mitigate | CLOSED | `src/state/buildSession.ts:57` — `sanitize()` on every palette label |
| T-04-02-03 | InfoDisclosure | mitigate | CLOSED | `src/hooks/useKeyStorage.ts:30-33` — no logging; repo-wide grep: zero `console.*`/analytics in `src/` |
| T-04-02-SC | Tampering | accept | CLOSED (accepted) | No new packages (04-02-SUMMARY) |
| T-04-03-01 | InfoDisclosure | mitigate | CLOSED | `src/ui/ControlsPane/SettingsModal/KeyInput.tsx:26` — `type="password"`; key not in aria/logs |
| T-04-03-02 | Tampering | mitigate | CLOSED | `src/state/paletteSession.ts:20` — `setPalettes` full replace, no merge |
| T-04-03-03 | InfoDisclosure | accept | CLOSED (accepted) | `src/ui/ControlsPane/SettingsModal/SettingsModal.tsx:20-22` — local-only privacy statement |
| T-04-03-04 | Tampering | mitigate | CLOSED | `SettingsModal.tsx:16-27` — static JSX text; no `dangerouslySetInnerHTML` |
| T-04-03-SC | Tampering | accept | CLOSED (accepted) | No new packages (04-03-SUMMARY) |
| T-04-04-01 | Tampering | mitigate | CLOSED | `src/ui/ControlsPane/PaletteAccordion/PaletteOption.tsx:42` — `{option.label}` React text node |
| T-04-04-02 | InfoDisclosure | mitigate | CLOSED | `src/ui/ControlsPane/IntentInput.tsx:19,29` — key read at call time, never logged |
| T-04-04-03 | EoP | mitigate | CLOSED | `index.html:8` — CSP `connect-src 'self' https://openrouter.ai` |
| T-04-04-04 | DoS | mitigate | CLOSED | `IntentInput.tsx:23` isLoading guard; `:56` button `disabled={!canSuggest}` |
| T-04-04-05 | Tampering | mitigate | CLOSED | `src/ui/App.tsx:72` — renders `error.message` (fixed mapError strings) as text node |
| T-04-04-06 | Tampering | mitigate | CLOSED | `paletteSession.ts:20` replaces options only; `PaletteOption.tsx:22` sanitize label matching |
| T-04-04-SC | Tampering | accept | CLOSED (accepted) | No new packages (04-04-SUMMARY) |

## Accepted Risks Log

- **T-04-02-01 — API key in plaintext localStorage (web v1).** Accepted per CLAUDE.md security section: local-only single-user tool, no first-party server. Compensating control: strict CSP + no `dangerouslySetInnerHTML` + all AI/user text rendered as React text nodes to control XSS (the only vector that could read the key). Desktop OS-keychain hardening deferred.
- **T-04-03-03 — Privacy disclosure.** Accepted; user is informed via SettingsModal that the key is stored locally and sent only to their chosen provider.
- **T-04-01-SC / T-04-02-SC / T-04-03-SC / T-04-04-SC — Supply-chain package audit.** Accepted; only `ai` + `@openrouter/ai-sdk-provider` introduced (04-01), passed slopcheck; no further packages added.

## Unregistered Flags

None. All four SUMMARY threat-surface sections report no new endpoints, auth paths, or schema changes. Every T-04-04-* / T-04-03-* flag listed maps to an existing register ID.

## Cross-Cutting Verification

- Repo-wide grep of `src/` for `console.*`, `analytics`, `telemetry`, `dangerouslySetInnerHTML`: **zero matches** — corroborates all no-logging (T-04-01-01/03, T-04-02-03, T-04-04-02) and no-innerHTML (T-04-03-04, T-04-04-01/05) claims across all entry points, not just the cited files.
- `mapError` (openrouter.ts:26-45) is the sole producer of `PaletteError.message`; every UI error path (`IntentInput` → `setError` → `App.tsx` banner) renders only these fixed strings. Raw `err.responseBody`/SDK bodies never reach the DOM.
