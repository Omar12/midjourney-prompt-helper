import { sanitize } from '@/domain/prompt/sanitize'
import { useBuildSession } from '@/state/buildSession'
import type { PaletteOption as PaletteOptionType } from '@/domain/ai/schema'

interface PaletteOptionProps {
  option: PaletteOptionType
  category: string
  isSelected: boolean
}

export function PaletteOption({ option, category, isSelected }: PaletteOptionProps) {
  // Per-field selectors — avoids React 19 referential-instability infinite loop
  const chips = useBuildSession((s) => s.chips)
  const addPaletteChip = useBuildSession((s) => s.addPaletteChip)
  const removeChip = useBuildSession((s) => s.removeChip)

  const handleClick = () => {
    if (!isSelected) {
      addPaletteChip(option.label, category)
    } else {
      // Find the chip whose sanitized label matches; addPaletteChip stores sanitized labels
      const sanitizedLabel = sanitize(option.label)
      const chip = chips.find((c) => c.label === sanitizedLabel)
      if (chip) removeChip(chip.id)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={option.description ?? option.label}
      aria-pressed={isSelected}
      className={[
        'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-[colors,transform] cursor-pointer active:scale-[0.94]',
        isSelected
          ? 'border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 animate-[token-pop_0.28s_cubic-bezier(0.25,1,0.5,1)]'
          : 'border-border bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ].join(' ')}
    >
      {/* AI output rendered as text node only — untrusted input must not reach innerHTML */}
      <span className="truncate max-w-[180px]">{option.label}</span>
    </button>
  )
}
