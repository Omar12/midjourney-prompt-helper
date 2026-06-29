import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'
import { sessionToEntry } from '@/domain/library/snapshot'
import { dexieAdapter, db } from '@/persistence/db'

export function SaveButton() {
  const [saved, setSaved] = useState(false)

  // Per-field selectors — avoids React 19 referential-instability infinite loop
  // (object selector creates a new reference on every call; see ClearDialog.tsx pattern)
  const intent = useBuildSession((s) => s.intent)
  const chips = useBuildSession((s) => s.chips)
  const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
  const flagValues = useBuildSession((s) => s.flagValues)
  const setFlags = useBuildSession((s) => s.setFlags)

  const hasContent =
    intent.trim() !== '' ||
    chips.length > 0 ||
    selectedVersionId !== null ||
    Object.values(setFlags).some(Boolean)

  const handleSave = async () => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    const name = intent.trim()
      ? `${intent.trim().slice(0, 40)} — ${timestamp}`
      : timestamp

    const entry = sessionToEntry({ intent, chips, selectedVersionId, flagValues, setFlags }, name)
    await dexieAdapter.saveEntry(entry)

    // PLT-03: request durable storage on first-ever save (silently, fire-and-forget)
    const count = await db.entries.count()
    if (count === 1) void navigator.storage?.persist()

    setSaved(true)
    setTimeout(() => setSaved(false), 2000) // same delay as CopyButton
  }

  return (
    <Button
      variant="outline"
      onClick={handleSave}
      disabled={!hasContent}
      className="w-full"
    >
      {saved ? 'Saved!' : 'Save to library'}
    </Button>
  )
}
