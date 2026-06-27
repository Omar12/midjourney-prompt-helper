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
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'

// Separate per-field selectors — avoids React 19 referential-instability infinite loop
// (object selector creates a new reference on every call; see Plan 03 deviation notes).
export function ClearButton() {
  const intent = useBuildSession((s) => s.intent)
  const chips = useBuildSession((s) => s.chips)
  const clearAll = useBuildSession((s) => s.clearAll)

  const hasContent = intent.trim() !== '' || chips.length > 0

  // D-11: when builder is already empty, render a disabled button with no dialog.
  // Do NOT use window.confirm() — it is blocked in Tauri webviews (RESEARCH.md §"Don't Hand-Roll").
  if (!hasContent) {
    return (
      <Button variant="ghost" disabled>
        Clear all
      </Button>
    )
  }

  return (
    <AlertDialog>
      {/* Base UI Trigger uses the `render` prop for polymorphism — not `asChild`.
          Passing render={<Button />} merges trigger event handlers into the Button
          element, avoiding the nested-button HTML violation. */}
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        Clear all
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start over?</AlertDialogTitle>
          <AlertDialogDescription>
            This will clear your intent and all chips. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            onClick={clearAll}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Clear everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
