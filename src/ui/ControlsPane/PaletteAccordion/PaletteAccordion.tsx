import { sanitize } from '@/domain/prompt/sanitize'
import { useBuildSession } from '@/state/buildSession'
import { usePaletteSession } from '@/state/paletteSession'
import type { PaletteMap } from '@/domain/ai/schema'
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionPanel,
} from '@/components/ui/accordion'
import { PaletteOption } from './PaletteOption'

// Human-readable labels for each PaletteMap category key
const CATEGORY_LABELS: Record<keyof PaletteMap, string> = {
  styleMedium: 'Style / Medium',
  lighting: 'Lighting',
  cameraLens: 'Camera & Lens',
  composition: 'Composition',
  color: 'Color',
  mood: 'Mood',
}

// Canonical display order for the six categories
const CATEGORY_KEYS: (keyof PaletteMap)[] = [
  'styleMedium',
  'lighting',
  'cameraLens',
  'composition',
  'color',
  'mood',
]

function SkeletonSection() {
  return (
    <div className="border-b py-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-4 w-4 rounded bg-muted" />
      </div>
    </div>
  )
}

export function PaletteAccordion() {
  // Per-field selectors — avoids React 19 referential-instability infinite loop
  const palettes = usePaletteSession((s) => s.palettes)
  const isLoading = usePaletteSession((s) => s.isLoading)
  const chips = useBuildSession((s) => s.chips)

  // D-08: build set of sanitized palette-chip labels for isSelected matching
  const selectedPaletteLabels = new Set(
    chips.filter((c) => c.source === 'palette').map((c) => c.label)
  )

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading palette suggestions">
        {CATEGORY_KEYS.map((key) => (
          <SkeletonSection key={key} />
        ))}
      </div>
    )
  }

  if (palettes === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Enter your intent above and click Suggest options to get AI-generated palette suggestions.
      </p>
    )
  }

  return (
    <Accordion multiple defaultValue={['styleMedium']}>
      {CATEGORY_KEYS.map((key) => {
        const options = palettes[key]
        const selectedCount = options.reduce(
          (n, o) => (selectedPaletteLabels.has(sanitize(o.label)) ? n + 1 : n),
          0
        )
        return (
          <AccordionItem key={key} value={key}>
            <AccordionHeader>
              <AccordionTrigger>
                <span className="flex items-center gap-2.5">
                  {/* Category wayfinding dot — reinforcement; label carries the meaning */}
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--cat-${key})` }}
                  />
                  {CATEGORY_LABELS[key]}
                  {selectedCount > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none tabular-nums"
                      style={{
                        color: `var(--cat-${key})`,
                        backgroundColor: `color-mix(in oklch, var(--cat-${key}) 16%, var(--background))`,
                      }}
                    >
                      {selectedCount}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel>
              <div className="flex flex-wrap gap-2 pb-3 pt-1">
                {options.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No suggestions for this category.</p>
                ) : (
                  options.map((option) => (
                    <PaletteOption
                      key={option.label}
                      option={option}
                      category={key}
                      isSelected={selectedPaletteLabels.has(sanitize(option.label))}
                    />
                  ))
                )}
              </div>
            </AccordionPanel>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
