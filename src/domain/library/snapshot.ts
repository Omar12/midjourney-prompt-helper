import type { LibraryEntry } from '@/domain/library/schema'
import type { BuildSessionState } from '@/state/buildSession'

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
