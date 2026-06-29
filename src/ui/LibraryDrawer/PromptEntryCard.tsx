import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RotateCcw, Trash2 } from 'lucide-react'
import { dexieAdapter } from '@/persistence/db'
import type { LibraryEntry } from '@/domain/library/schema'

interface PromptEntryCardProps {
  entry: LibraryEntry
  onReload: (entry: LibraryEntry) => void
}

export function PromptEntryCard({ entry, onReload }: PromptEntryCardProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftName, setDraftName] = useState(entry.name)

  const handleRenameCommit = async () => {
    const finalName = draftName.trim() || entry.name // empty → revert to original (D-03 fallback)
    await dexieAdapter.renameEntry(entry.id, finalName)
    setIsRenaming(false)
  }

  const timestamp = new Date(entry.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="flex flex-col gap-1 p-3 rounded-md bg-card border border-border">
      {/* name row */}
      {isRenaming ? (
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={handleRenameCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleRenameCommit()
            if (e.key === 'Escape') {
              setDraftName(entry.name)
              setIsRenaming(false)
            }
          }}
          autoFocus
        />
      ) : (
        <span
          className="text-sm font-medium truncate cursor-pointer"
          title={entry.name}
          onClick={() => setIsRenaming(true)}
        >
          {entry.name}
        </span>
      )}

      {/* timestamp row */}
      <span className="text-xs text-muted-foreground">Saved {timestamp}</span>

      {/* action row */}
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => onReload(entry)}>
          <RotateCcw size={16} />
          Reload prompt
        </Button>

        {/* Delete with confirmation — AlertDialogTrigger uses render= (Base UI polymorphism), not asChild */}
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                aria-label={`Delete ${entry.name}`}
              />
            }
          >
            <Trash2 size={16} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this prompt?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{entry.name}&rdquo; will be permanently removed from your library.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void dexieAdapter.deleteEntry(entry.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete prompt
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
