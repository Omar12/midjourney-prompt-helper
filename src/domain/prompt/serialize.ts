import { sanitize } from './sanitize'
import type { PromptDraft } from './model'

/**
 * Deterministic serializer: same PromptDraft → same string (D-04).
 *
 * Format: <intent>, <chip1>, <chip2>, ... [, <flag1> <flag2> ...]
 *
 * - D-01: intent emitted first, chips follow in insertion order
 * - D-02: segments joined by ", "
 * - D-03: intent is one opaque block — NOT split on the user's own commas
 * - D-04: pure function with no side effects; no Date.now(), no Math.random()
 *
 * Flags are appended at the tail in Phase 2. The flags array is always empty
 * in Phase 1 and is skipped here intentionally.
 */
export function serialize(draft: PromptDraft): string {
  const parts: string[] = []

  // D-01 + D-03: intent first, as one opaque block
  const intentSanitized = sanitize(draft.intent.trim())
  if (intentSanitized) parts.push(intentSanitized)

  // D-01: chips follow in insertion order
  for (const chip of draft.chips) {
    if (!chip.enabled) continue // disabled chips excluded (ASM-01)
    const labelSanitized = sanitize(chip.label.trim())
    if (labelSanitized) parts.push(labelSanitized)
  }

  // Phase 2 extension point: flags appended at the tail here
  // draft.flags is always [] in Phase 1 — skipped intentionally

  // D-02: join with ", "
  return parts.join(', ')
}
