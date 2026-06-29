import 'fake-indexeddb/auto'
import { describe, test, expect, beforeEach } from 'vitest'
import { db, dexieAdapter } from '@/persistence/db'

// Build a valid fixture that satisfies LibraryEntrySchema
function makeEntry(overrides?: Partial<{ id: string; name: string }>) {
  const now = new Date().toISOString()
  return {
    id: overrides?.id ?? crypto.randomUUID(),
    name: overrides?.name ?? 'Test prompt',
    intent: 'a beautiful sunset',
    chips: [],
    flags: [],
    selectedVersionId: null,
    schemaVersion: 2 as const,
    createdAt: now,
    updatedAt: now,
  }
}

beforeEach(async () => {
  await db.entries.clear()
})

describe('dexieAdapter.saveEntry', () => {
  test('persists an entry (round-trips via getAllEntries)', async () => {
    const entry = makeEntry()
    await dexieAdapter.saveEntry(entry)
    const all = await dexieAdapter.getAllEntries()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(entry.id)
    expect(all[0].name).toBe(entry.name)
  })

  test('saving multiple entries persists all of them', async () => {
    await dexieAdapter.saveEntry(makeEntry({ id: crypto.randomUUID(), name: 'First' }))
    await dexieAdapter.saveEntry(makeEntry({ id: crypto.randomUUID(), name: 'Second' }))
    const all = await dexieAdapter.getAllEntries()
    expect(all).toHaveLength(2)
  })
})

describe('dexieAdapter.getAllEntries', () => {
  test('returns entries ordered newest-first (createdAt descending)', async () => {
    const older = makeEntry({ id: crypto.randomUUID(), name: 'Older' })
    // ensure different timestamps
    await new Promise((r) => setTimeout(r, 5))
    const newer = { ...makeEntry({ id: crypto.randomUUID(), name: 'Newer' }), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await dexieAdapter.saveEntry(older)
    await dexieAdapter.saveEntry(newer)
    const all = await dexieAdapter.getAllEntries()
    expect(all[0].name).toBe('Newer')
    expect(all[1].name).toBe('Older')
  })

  test('returns empty array when no entries exist', async () => {
    const all = await dexieAdapter.getAllEntries()
    expect(all).toEqual([])
  })
})

describe('dexieAdapter.deleteEntry', () => {
  test('removes entry from getAllEntries result', async () => {
    const entry = makeEntry()
    await dexieAdapter.saveEntry(entry)
    await dexieAdapter.deleteEntry(entry.id)
    const all = await dexieAdapter.getAllEntries()
    expect(all).toHaveLength(0)
  })

  test('delete of non-existent id is a no-op', async () => {
    await dexieAdapter.deleteEntry('nonexistent-id')
    const all = await dexieAdapter.getAllEntries()
    expect(all).toHaveLength(0)
  })
})

describe('dexieAdapter.renameEntry', () => {
  test('updates name and updatedAt on the entry', async () => {
    const entry = makeEntry()
    await dexieAdapter.saveEntry(entry)
    const originalUpdatedAt = entry.updatedAt

    // Small delay to ensure a different timestamp
    await new Promise((r) => setTimeout(r, 5))

    await dexieAdapter.renameEntry(entry.id, 'new name')
    const all = await dexieAdapter.getAllEntries()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('new name')
    expect(all[0].updatedAt).not.toBe(originalUpdatedAt)
  })
})
