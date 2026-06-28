import { sanitize } from './sanitize'
import type { PromptDraft } from './model'
import { serializeFlag, getVersionParameter } from '../flags/helpers'

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

  // Phase 2: build flag tail (version first, then flags in array order)
  const flagParts: string[] = []

  if (draft.selectedVersionId !== null) {
    const param = getVersionParameter(draft.selectedVersionId)
    if (param) flagParts.push(param)
  }

  for (const { flagId, value } of draft.flags) {
    const fragment = serializeFlag(flagId, value)
    if (fragment) flagParts.push(fragment)
  }

  // D-02: join descriptors with ", "; append flag tail separated by space
  const descriptors = parts.join(', ')
  if (flagParts.length === 0) return descriptors
  return descriptors ? `${descriptors} ${flagParts.join(' ')}` : flagParts.join(' ')
}
