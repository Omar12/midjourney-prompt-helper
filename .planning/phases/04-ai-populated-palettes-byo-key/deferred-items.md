# Deferred Items — Phase 04

## Pre-existing test failures (out of scope for 04-03)

Discovered during 04-03 execution. These tests were failing before 04-03 changes
and are not caused by files modified in this plan.

| Test File | Failing Tests | Notes |
|-----------|---------------|-------|
| src/ui/ChipArea.test.tsx | clicking ✕ button removes chip; ✕ button aria-label | Pre-existing |
| src/ui/ChipInput.test.tsx | typing label + clicking "Add keyword" creates chip | Pre-existing |
| src/ui/ClearButton.test.tsx | triggers confirm dialog; clearing dialog clears state | Pre-existing |
| src/ui/IntentInput.test.tsx | typing into textarea calls setIntent | Pre-existing |

**Count:** 6 failing tests in 4 files, all unrelated to paletteSession/SettingsModal.
