import { describe, test, expect } from 'vitest'
import { sessionToEntry, entryToSession } from '@/domain/library/snapshot'
import { LibraryEntrySchema } from '@/domain/library/schema'

// Shared fixture for session state
const baseSession = {
  intent: 'a beautiful sunset over mountains',
  chips: [
    { id: crypto.randomUUID(), label: 'cinematic', source: 'custom' as const, enabled: true },
  ],
  selectedVersionId: 'v7',
  flagValues: { stylize: 250, chaos: 10 },
  setFlags: { stylize: true, chaos: false }, // chaos is NOT set → should not appear in entry.flags
}

describe('sessionToEntry', () => {
  test('produces a LibraryEntry with correct name', () => {
    const entry = sessionToEntry(baseSession, 'My name')
    expect(entry.name).toBe('My name')
  })

  test('intent, chips, selectedVersionId equal the session values', () => {
    const entry = sessionToEntry(baseSession, 'x')
    expect(entry.intent).toBe(baseSession.intent)
    expect(entry.chips).toEqual(baseSession.chips)
    expect(entry.selectedVersionId).toBe(baseSession.selectedVersionId)
  })

  test('schemaVersion is always 2', () => {
    const entry = sessionToEntry(baseSession, 'x')
    expect(entry.schemaVersion).toBe(2)
  })

  test('id is a non-empty UUID string', () => {
    const entry = sessionToEntry(baseSession, 'x')
    expect(typeof entry.id).toBe('string')
    expect(entry.id.length).toBeGreaterThan(0)
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('createdAt and updatedAt are equal ISO strings at creation time', () => {
    const entry = sessionToEntry(baseSession, 'x')
    expect(entry.createdAt).toBe(entry.updatedAt)
    // Valid ISO datetime
    expect(() => new Date(entry.createdAt)).not.toThrow()
    expect(new Date(entry.createdAt).toISOString()).toBe(entry.createdAt)
  })

  test('only includes flags where setFlags[flagId] === true', () => {
    const entry = sessionToEntry(baseSession, 'x')
    // stylize is true → included; chaos is false → excluded
    expect(entry.flags).toHaveLength(1)
    expect(entry.flags[0].flagId).toBe('stylize')
    expect(entry.flags[0].value).toBe(250)
  })

  test('excludes flags with setFlags[flagId] = false or undefined', () => {
    const session = {
      ...baseSession,
      flagValues: { stylize: 100, chaos: 5, weird: 999 },
      setFlags: { stylize: false, chaos: false, weird: false },
    }
    const entry = sessionToEntry(session, 'x')
    expect(entry.flags).toHaveLength(0)
  })

  test('result passes LibraryEntrySchema.safeParse', () => {
    const entry = sessionToEntry(baseSession, 'My test prompt')
    const r = LibraryEntrySchema.safeParse(entry)
    expect(r.success).toBe(true)
  })

  test('each call produces a unique id', () => {
    const e1 = sessionToEntry(baseSession, 'x')
    const e2 = sessionToEntry(baseSession, 'x')
    expect(e1.id).not.toBe(e2.id)
  })
})

describe('entryToSession', () => {
  test('restores all 5 session fields correctly', () => {
    const now = new Date().toISOString()
    const entry = {
      id: crypto.randomUUID(),
      name: 'Test entry',
      intent: 'ocean waves',
      chips: [{ id: crypto.randomUUID(), label: 'dramatic', source: 'custom' as const, enabled: true }],
      selectedVersionId: 'v6.1',
      flags: [{ flagId: 'stylize', value: 300 }],
      schemaVersion: 2 as const,
      createdAt: now,
      updatedAt: now,
    }
    const session = entryToSession(entry)
    expect(session.intent).toBe('ocean waves')
    expect(session.chips).toEqual(entry.chips)
    expect(session.selectedVersionId).toBe('v6.1')
    expect(session.flagValues).toEqual({ stylize: 300 })
    expect(session.setFlags).toEqual({ stylize: true })
  })

  test('entry with no flags returns flagValues = {} and setFlags = {}', () => {
    const now = new Date().toISOString()
    const entry = {
      id: crypto.randomUUID(),
      name: 'No flags entry',
      intent: 'test',
      chips: [],
      selectedVersionId: null,
      flags: [],
      schemaVersion: 2 as const,
      createdAt: now,
      updatedAt: now,
    }
    const session = entryToSession(entry)
    expect(session.flagValues).toEqual({})
    expect(session.setFlags).toEqual({})
  })

  test('round-trip: sessionToEntry then entryToSession produces equal session fields', () => {
    const session = {
      intent: 'mountain landscape',
      chips: [{ id: crypto.randomUUID(), label: 'golden hour', source: 'custom' as const, enabled: true }],
      selectedVersionId: 'v7',
      flagValues: { stylize: 500, chaos: 20 },
      setFlags: { stylize: true, chaos: true },
    }
    const entry = sessionToEntry(session, 'round-trip test')
    const restored = entryToSession(entry)
    expect(restored.intent).toBe(session.intent)
    expect(restored.chips).toEqual(session.chips)
    expect(restored.selectedVersionId).toBe(session.selectedVersionId)
    // flagValues should contain both flags that were set
    expect(restored.flagValues.stylize).toBe(500)
    expect(restored.flagValues.chaos).toBe(20)
    expect(restored.setFlags.stylize).toBe(true)
    expect(restored.setFlags.chaos).toBe(true)
  })
})
