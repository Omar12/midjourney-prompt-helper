import { LibraryEntrySchema } from '@/domain/library/schema'
import type { LibraryEntry } from '@/domain/library/schema'
import { db } from '@/persistence/db'

export interface ImportResult {
  imported: number
  skipped: number
  error?: 'parse' | 'shape'
}

export async function importLibrary(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    const text = await file.text()
    raw = JSON.parse(text)
  } catch {
    return { imported: 0, skipped: 0, error: 'parse' }
  }

  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as Record<string, unknown>).entries)
  ) {
    return { imported: 0, skipped: 0, error: 'shape' }
  }

  const rawEntries = (raw as { entries: unknown[] }).entries
  const valid: LibraryEntry[] = []
  let skipped = 0

  for (const item of rawEntries) {
    const result = LibraryEntrySchema.safeParse(item)
    if (result.success) {
      valid.push({ ...result.data, id: crypto.randomUUID() }) // D-07: fresh id
    } else {
      skipped++
    }
  }

  if (valid.length > 0) {
    try {
      await db.entries.bulkAdd(valid)
    } catch {
      // BulkError: partial success; swallow — import is best-effort
    }
  }

  return { imported: valid.length, skipped }
}

export async function exportLibrary(entries: LibraryEntry[]): Promise<void> {
  const envelope = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    entries,
  }
  const json = JSON.stringify(envelope, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const blobUrl = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = `mj-prompt-library-${date}.json`
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl)
    a.remove()
  }, 1000)
}
