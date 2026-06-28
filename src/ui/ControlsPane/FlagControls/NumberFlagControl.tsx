import { NumberField } from '@base-ui/react/number-field'
import { Button } from '@/components/ui/button'
import type { FlagDefinition } from '@/domain/flags'

// Props narrow the control type to 'number' so callers get type-safe access to
// def.control.min / max without runtime narrowing in this component.
interface NumberControl {
  type: 'number'
  min: number
  max: number
}

interface NumberFlagControlProps {
  def: Omit<FlagDefinition, 'control'> & { control: NumberControl }
  /** Current value; null when unset (field shows placeholder). */
  value: number | null
  /** Whether this flag is actively set (emitted into the prompt). */
  isSet: boolean
  /** Called when the user commits a numeric value. Parent wires to setFlag(def.id, v). */
  onChange: (v: number) => void
  /** Called when the user clicks ×. Parent wires to unsetFlag(def.id). */
  onClear: () => void
}

// NumberFlagControl does NOT call useBuildSession directly — all state via props.
// This keeps the component pure and testable. Parent FlagControls.tsx owns store wiring.
//
// Seed uses NumberField (not Slider) because the max is 4,294,967,295 —
// impractical UX for a drag slider (RESEARCH.md Pitfall 1).
export function NumberFlagControl({
  def,
  value,
  isSet,
  onChange,
  onClear,
}: NumberFlagControlProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Label row: flag name left, × clear button right (shown only when set) */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{def.label}</span>
        {isSet && (
          <Button
            size="icon"
            variant="ghost"
            className="min-w-[44px] min-h-[44px] size-auto p-1 rounded-sm"
            aria-label={`Clear ${def.label}`}
            onClick={onClear}
          >
            ✕
          </Button>
        )}
      </div>

      {/* NumberField: typed entry + increment/decrement buttons */}
      <NumberField.Root
        value={isSet ? value : null}
        min={def.control.min}
        max={def.control.max}
        onValueChange={(v) => {
          if (v !== null) onChange(v)
        }}
        className="flex w-full"
      >
        <NumberField.Group className="flex w-full rounded-lg border border-input bg-transparent text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <NumberField.Decrement
            aria-label="Decrease seed"
            className="flex items-center justify-center px-2.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50 select-none"
          >
            −
          </NumberField.Decrement>
          <NumberField.Input
            placeholder="random (MJ default)"
            className="h-8 flex-1 min-w-0 bg-transparent px-1 text-center outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          <NumberField.Increment
            aria-label="Increase seed"
            className="flex items-center justify-center px-2.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50 select-none"
          >
            +
          </NumberField.Increment>
        </NumberField.Group>
      </NumberField.Root>
    </div>
  )
}
