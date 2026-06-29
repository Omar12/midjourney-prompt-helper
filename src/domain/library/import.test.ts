import 'fake-indexeddb/auto'
import { describe, test, expect, beforeEach } from 'vitest'
import { db } from '@/persistence/db'
import { importLibrary } from '@/domain/library/import'

beforeEach(async () => {
  await db.entries.clear()
})

// Helper: build a minimal valid LibraryEntry for use in envelopes
function makeValidEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Prompt',
    intent: 'a moody forest scene',
    chips: ['moody', 'forest'],
    flags: [],
    selectedVersionId: 'v6',
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// Helper: build a valid JSON envelope File
function makeValidEnvelope(entries: unknown[] = [makeValidEntry()]) {
  const envelope = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    entries,
  }
  return new File([JSON.stringify(envelope)], 'test.json', { type: 'application/json' })
}

describe('importLibrary', () => {
  test('valid file imports all entries and returns { imported: 1, skipped: 0 }', async () => {
    const file = makeValidEnvelope([makeValidEntry()])
    const result = await importLibrary(file)
    expect(result).toEqual({ imported: 1, skipped: 0 })
    expect(await db.entries.count()).toBe(1)
  })

  test('mixed file imports valid entries and skips invalids, returns correct counts', async () => {
    const entries = [
      makeValidEntry(),             // valid
      makeValidEntry({ name: '' }), // invalid: name must be min(1)
      makeValidEntry({ schemaVersion: 999 }), // invalid: wrong schemaVersion
    ]
    const file = makeValidEnvelope(entries)
    const result = await importLibrary(file)
    expect(result).toEqual({ imported: 1, skipped: 2 })
    expect(await db.entries.count()).toBe(1)
  })

  test('fully invalid file returns { imported: 0, skipped: N } and existing entries unaffected', async () => {
    // pre-seed one entry
    await db.entries.add(makeValidEntry() as Parameters<typeof db.entries.add>[0])
    const entries = [
      makeValidEntry({ name: '' }),
      makeValidEntry({ name: '' }),
    ]
    const file = makeValidEnvelope(entries)
    const result = await importLibrary(file)
    expect(result).toEqual({ imported: 0, skipped: 2 })
    // existing entry untouched
    expect(await db.entries.count()).toBe(1)
  })

  test('non-JSON file returns { imported: 0, skipped: 0, error: "parse" }', async () => {
    const file = new File(['this is not json!!!'], 'bad.json', { type: 'application/json' })
    const result = await importLibrary(file)
    expect(result).toEqual({ imported: 0, skipped: 0, error: 'parse' })
    expect(await db.entries.count()).toBe(0)
  })

  test('valid JSON but wrong top-level shape returns { imported: 0, skipped: 0, error: "shape" }', async () => {
    const file = new File(
      [JSON.stringify({ schemaVersion: 2, notEntries: [] })],
      'bad.json',
      { type: 'application/json' },
    )
    const result = await importLibrary(file)
    expect(result).toEqual({ imported: 0, skipped: 0, error: 'shape' })
    expect(await db.entries.count()).toBe(0)
  })

  test('re-import of same backup yields duplicates (fresh ids — D-07)', async () => {
    const file = makeValidEnvelope([makeValidEntry()])
    await importLibrary(file)
    // re-import the same envelope — needs a new File object (same contents)
    const file2 = makeValidEnvelope([makeValidEntry()])
    await importLibrary(file2)
    // two imports of 1-entry envelopes should produce 2 entries (not 1 via overwrite)
    expect(await db.entries.count()).toBe(2)
  })

  test('after successful import, db.entries.count() increases by the number of valid entries', async () => {
    const entries = [makeValidEntry(), makeValidEntry(), makeValidEntry()]
    const file = makeValidEnvelope(entries)
    const result = await importLibrary(file)
    expect(result.imported).toBe(3)
    expect(await db.entries.count()).toBe(3)
  })
})
