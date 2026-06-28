import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { sanitize } from '@/domain/prompt/sanitize'
import type { FlagDefinition } from '@/domain/flags'

// Props narrow the control type to 'text' so callers get type-safe access to
// def.control.placeholder / maxLength without runtime narrowing in this component.
interface TextControl {
  type: 'text'
  placeholder?: string
  maxLength?: number
}

interface TextFlagControlProps {
  def: Omit<FlagDefinition, 'control'> & { control: TextControl }
  /** Committed, sanitized value in the store. Empty string when unset. */
  value: string
  /** Whether this flag is actively set (emitted into the prompt). */
  isSet: boolean
  /**
   * onChange fires ONLY on blur/Enter (commit) and always carries an already-sanitized
   * string. Caller must NOT re-sanitize — wire directly to setFlag(def.id, sanitizedValue).
   */
  onChange: (v: string) => void
  /** Called when commit produces empty string or user clicks ×. Parent wires to unsetFlag(def.id). */
  onClear: () => void
}

// TextFlagControl does NOT call useBuildSession directly — all state via props.
// This keeps the component pure and testable. Parent FlagControls.tsx owns store wiring.
export function TextFlagControl({
  def,
  value,
  isSet,
  onChange,
  onClear,
}: TextFlagControlProps) {
  // Local draft holds raw in-progress keystrokes — never passed to the parent.
  // This prevents sanitize() from running on every keystroke, which would corrupt
  // partial input (e.g. "--" typed mid-sentence would immediately become "-").
  const [draft, setDraft] = useState(value)

  // Sync draft to committed store value when it changes externally (clear, reload).
  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    // T-02-01: sanitize() converts "--" sequences to "-" before storing,
    // preventing MJ flag injection via the --no field.
    const sanitized = sanitize(draft.trim())
    if (!sanitized) {
      onClear()
    } else {
      onChange(sanitized)
      setDraft(sanitized)
    }
  }

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
            aria-label="Clear exclusions"
            onClick={onClear}
          >
            ✕
          </Button>
        )}
      </div>

      {/* Input: draft state only — committed to store on blur or Enter */}
      <Input
        type="text"
        placeholder={def.control.placeholder ?? ''}
        maxLength={def.control.maxLength}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit()
            e.preventDefault()
          }
        }}
      />
    </div>
  )
}
