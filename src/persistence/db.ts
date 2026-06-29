import Dexie, { type EntityTable } from 'dexie'
import type { LibraryEntry } from '@/domain/library/schema'
import type { StorageAdapter } from './adapter'

const db = new Dexie('mj-prompt-library') as Dexie & {
  entries: EntityTable<LibraryEntry, 'id'>
}

// Schema string: "id" = plain string PK (no ++ = no auto-increment).
// "createdAt" indexed for orderBy('createdAt') queries.
// All other LibraryEntry fields stored without being listed here.
db.version(1).stores({
  entries: 'id, createdAt',
})

export { db }

export const dexieAdapter: StorageAdapter = {
  saveEntry: (entry) => db.entries.put(entry).then(() => undefined),
  getAllEntries: () => db.entries.orderBy('createdAt').reverse().toArray(),
  deleteEntry: (id) => db.entries.delete(id),
  renameEntry: (id, name) =>
    db.entries.update(id, { name, updatedAt: new Date().toISOString() }).then(() => undefined),
}
