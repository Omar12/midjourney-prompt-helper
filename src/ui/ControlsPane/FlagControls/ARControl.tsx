import { useState } from 'react'
import { useBuildSession } from '@/state/buildSession'
import { FLAG_DEFINITIONS } from '@/domain/flags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const AR_PATTERN = /^\d+:\d+$/

// Separate per-field selectors — avoids React 19 referential-instability infinite loop
// (object selector creates a new reference on every call; see Plan 03 deviation notes).
export function ARControl() {
  const flagValues = useBuildSession((s) => s.flagValues)
  const setFlags = useBuildSession((s) => s.setFlags)
  const setFlag = useBuildSession((s) => s.setFlag)
  const unsetFlag = useBuildSession((s) => s.unsetFlag)

  const [customInput, setCustomInput] = useState('')
  const [customError, setCustomError] = useState<string | null>(null)

  // All hooks called before any conditional returns — required by React rules.
  const arDef = FLAG_DEFINITIONS.find((f) => f.id === 'ar')
  if (!arDef || arDef.control.type !== 'aspect-ratio') return null

  const presets = arDef.control.presets
  const currentArValue = flagValues['ar'] as string | undefined
  const isARSet = setFlags['ar'] === true

  // A preset is "active" only when the stored value exactly matches a preset string.
  // Custom values that don't match any preset leave activePreset as null.
  const activePreset = isARSet && presets.includes(currentArValue ?? '') ? currentArValue : null

  const handlePresetClick = (preset: string) => {
    // D-06: clicking already-selected preset does NOT deselect. Clearing is only via × button.
    if (isARSet && currentArValue === preset) return
    setFlag('ar', preset)
    setCustomInput('')
    setCustomError(null)
  }

  const handleCustomSubmit = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    if (!AR_PATTERN.test(trimmed)) {
      setCustomError('Use W:H format, e.g. 21:9')
      return
    }
    const [w, h] = trimmed.split(':').map(Number)
    if (w === 0 || h === 0) {
      setCustomError('Width and height must be greater than 0')
      return
    }
    // T-02-02: /^\d+:\d+$/ validation makes injection structurally impossible.
    // Only digits and one colon pass — "16:9 --stylize 999" is rejected by the pattern above.
    setFlag('ar', trimmed)
    setCustomError(null)
    // Leave customInput set so the user can see the value they entered.
  }

  const handleClear = () => {
    unsetFlag('ar')
    setCustomInput('')
    setCustomError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Aspect Ratio</span>
        {isARSet && (
          <Button
            size="icon"
            variant="ghost"
            className="min-w-[44px] min-h-[44px] size-auto p-1 rounded-sm"
            aria-label="Clear aspect ratio"
            onClick={handleClear}
          >
            ✕
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset}
            size="sm"
            variant={activePreset === preset ? 'default' : 'outline'}
            aria-pressed={activePreset === preset}
            onClick={() => handlePresetClick(preset)}
          >
            {preset}
          </Button>
        ))}
      </div>
      <Input
        type="text"
        placeholder="Custom (e.g. 21:9)"
        value={customInput}
        onChange={(e) => {
          setCustomInput(e.target.value)
          setCustomError(null)
        }}
        onBlur={handleCustomSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleCustomSubmit()
            e.preventDefault()
          }
        }}
      />
      {customError !== null && (
        <span className="text-xs text-destructive">{customError}</span>
      )}
    </div>
  )
}
