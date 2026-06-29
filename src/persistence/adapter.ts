import type { LibraryEntry } from '@/domain/library/schema'

export interface StorageAdapter {
  saveEntry(entry: LibraryEntry): Promise<void>
  getAllEntries(): Promise<LibraryEntry[]>
  deleteEntry(id: string): Promise<void>
  renameEntry(id: string, name: string): Promise<void>
}
