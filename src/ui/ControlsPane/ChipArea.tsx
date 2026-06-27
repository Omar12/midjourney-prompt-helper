import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'

export function ChipArea() {
  const chips = useBuildSession((s) => s.chips)
  const removeChip = useBuildSession((s) => s.removeChip)

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="secondary"
          className="h-auto overflow-visible flex items-center gap-1 pr-0"
        >
          <span className="truncate max-w-[200px]" title={chip.label}>
            {chip.label}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="min-w-[44px] min-h-[44px] size-auto p-1 rounded-sm"
            aria-label={`Remove ${chip.label}`}
            onClick={() => removeChip(chip.id)}
          >
            ✕
          </Button>
        </Badge>
      ))}
    </div>
  )
}
