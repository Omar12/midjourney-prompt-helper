import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Library, BookOpen } from 'lucide-react'
import { db } from '@/persistence/db'
import { ExportImport } from './ExportImport'
import { PromptEntryCard } from './PromptEntryCard'
import { entryToSession } from '@/domain/library/snapshot'
import { useBuildSession } from '@/state/buildSession'
import type { LibraryEntry } from '@/domain/library/schema'

export function LibraryDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingEntry, setPendingEntry] = useState<LibraryEntry | null>(null)

  // Per-field Zustand selectors — avoids React 19 referential-instability infinite loop
  // (object selector creates a new reference on every call)
  const intent = useBuildSession((s) => s.intent)
  const chips = useBuildSession((s) => s.chips)
  const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
  const setFlags = useBuildSession((s) => s.setFlags)

  const hasContent =
    intent.trim() !== '' ||
    chips.length > 0 ||
    selectedVersionId !== null ||
    Object.values(setFlags).some(Boolean)

  // Third argument [] is defaultResult — ensures entries is always LibraryEntry[], never undefined
  const entries = useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray(), [], [])

  const handleReload = (entry: LibraryEntry) => {
    if (!hasContent) {
      // Builder is empty — restore instantly with no dialog
      useBuildSession.setState(entryToSession(entry))
      setIsOpen(false)
    } else {
      // Builder has content — gate with confirm dialog (D-05)
      setPendingEntry(entry)
    }
  }

  const handleConfirmReload = () => {
    if (pendingEntry) {
      useBuildSession.setState(entryToSession(pendingEntry))
      setPendingEntry(null)
      setIsOpen(false)
    }
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-1.5" />
          }
        >
          <Library size={14} />
          Library
        </SheetTrigger>

        <SheetContent side="right" className="w-80 flex flex-col">
          <SheetHeader>
            <SheetTitle>Saved Prompts</SheetTitle>
            <SheetDescription className="sr-only">
              Your saved prompt library. Reload, rename, or delete entries.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 py-4 px-4">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <BookOpen size={32} className="text-muted-foreground" />
                <span className="text-sm font-medium">No saved prompts yet</span>
                <span className="text-xs text-muted-foreground">
                  Save your current prompt with &ldquo;Save to library&rdquo; to start your
                  collection.
                </span>
              </div>
            ) : (
              entries.map((entry) => (
                <PromptEntryCard
                  key={entry.id}
                  entry={entry}
                  onReload={handleReload}
                />
              ))
            )}
          </div>

          <SheetFooter className="border-t pt-4">
            <ExportImport entries={entries} />
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Reload confirm-if-dirty dialog (D-05) — controlled by pendingEntry state.
          Confirm uses DEFAULT (non-destructive) styling: reload is a neutral replacement,
          not a destructive deletion. */}
      <AlertDialog
        open={pendingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setPendingEntry(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current work will be replaced with the saved prompt. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingEntry(null)}>
              Keep current
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReload}>
              Load saved prompt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
