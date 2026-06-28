import { Switch } from '@base-ui/react/switch'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { FlagDefinition } from '@/domain/flags'

// Props narrow the control type to 'slider' so callers get type-safe access to
// def.control.min / max / step without runtime narrowing in this component.
interface SliderControl {
  type: 'slider'
  min: number
  max: number
  step: number
}

interface SliderFlagControlProps {
  def: Omit<FlagDefinition, 'control'> & { control: SliderControl }
  /** Current numeric value of the slider. Parent supplies def.control.min when unset. */
  value: number
  /** Whether this flag is actively set (emitted into the prompt). */
  isSet: boolean
  /** Called on slider interaction with the new value. Parent wires to setFlag(def.id, v). */
  onChange: (v: number) => void
  /** Called when the Switch is toggled OFF. Parent wires to unsetFlag(def.id). */
  onClear: () => void
}

// SliderFlagControl does NOT call useBuildSession directly — all state via props.
// This keeps the component pure and testable. Parent FlagControls.tsx owns store wiring.
export function SliderFlagControl({
  def,
  value,
  isSet,
  onChange,
  onClear,
}: SliderFlagControlProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Label row: flag name left, enable Switch right */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{def.label}</span>
        <Switch.Root
          checked={isSet}
          onCheckedChange={(checked) => {
            if (!checked) {
              onClear()
            } else {
              // Activate at the current slider position (parent provides def.control.min when unset)
              onChange(value)
            }
          }}
          aria-label={`Enable ${def.label}`}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isSet ? 'bg-primary' : 'bg-input',
          )}
        >
          <Switch.Thumb
            className={cn(
              'pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0',
              'transition-transform duration-200 ease-in-out',
              isSet ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </Switch.Root>
      </div>

      {/* Slider: dimmed and non-interactive when flag is unset (D-05) */}
      <div className={cn(isSet ? '' : 'opacity-50 pointer-events-none')}>
        <Slider
          value={[value]}
          min={def.control.min}
          max={def.control.max}
          step={def.control.step}
          onValueChange={(vals) => onChange(Array.isArray(vals) ? vals[0] : vals)}
          aria-label={`${def.label} value`}
        />
      </div>

      {/* Caption: numeric value when set, em dash when unset */}
      <span
        className={cn(
          'text-xs',
          isSet ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {isSet ? value : '—'}
      </span>
    </div>
  )
}
