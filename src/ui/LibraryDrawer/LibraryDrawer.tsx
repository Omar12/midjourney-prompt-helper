import { useLiveQuery } from 'dexie-react-hooks'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Library, BookOpen } from 'lucide-react'
import { db } from '@/persistence/db'

export function LibraryDrawer() {
  // Third argument [] is defaultResult — ensures entries is always LibraryEntry[], never undefined
  const entries = useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray(), [], [])

  return (
    <Sheet>
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
            Your saved Midjourney prompt library
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
              <div
                key={entry.id}
                className="flex flex-col gap-1 p-3 rounded-md bg-card border border-border"
              >
                <span className="text-sm font-medium truncate" title={entry.name}>
                  {entry.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
