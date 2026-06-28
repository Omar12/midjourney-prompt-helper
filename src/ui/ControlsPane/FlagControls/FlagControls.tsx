import { useBuildSession } from '@/state/buildSession'
import { getFlagsForVersion } from '@/domain/flags'
import type { FlagDefinition } from '@/domain/flags'
import { VersionSelect } from './VersionSelect'
import { ARControl } from './ARControl'
import { SliderFlagControl } from './SliderFlagControl'
import { NumberFlagControl } from './NumberFlagControl'
import { TextFlagControl } from './TextFlagControl'

// Separate per-field selectors — avoids React 19 referential-instability infinite loop
// (object selector creates a new reference on every call; see Plan 03 deviation notes).
export function FlagControls() {
  const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
  const flagValues = useBuildSession((s) => s.flagValues)
  const setFlags = useBuildSession((s) => s.setFlags)
  const setFlag = useBuildSession((s) => s.setFlag)
  const unsetFlag = useBuildSession((s) => s.unsetFlag)

  const flagDefs = getFlagsForVersion(selectedVersionId)

  // D-01: always visible — do NOT early-return null; section renders even when nothing is set.
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">Flags</h3>
      {/* VersionSelect reads from store directly — no props needed (Plan 04 design). */}
      <VersionSelect />
      {flagDefs.map((def) => {
        switch (def.control.type) {
          case 'aspect-ratio':
            // ARControl reads flagValues['ar'] from the store directly.
            return <ARControl key={def.id} />
          case 'slider': {
            type SliderDef = Omit<FlagDefinition, 'control'> & {
              control: { type: 'slider'; min: number; max: number; step: number }
            }
            const sliderDef = def as SliderDef
            return (
              <SliderFlagControl
                key={def.id}
                def={sliderDef}
                value={(flagValues[def.id] as number) ?? sliderDef.control.min}
                isSet={setFlags[def.id] ?? false}
                onChange={(v) => setFlag(def.id, v)}
                onClear={() => unsetFlag(def.id)}
              />
            )
          }
          case 'number': {
            type NumberDef = Omit<FlagDefinition, 'control'> & {
              control: { type: 'number'; min: number; max: number }
            }
            const numberDef = def as NumberDef
            return (
              <NumberFlagControl
                key={def.id}
                def={numberDef}
                value={(flagValues[def.id] as number) ?? null}
                isSet={setFlags[def.id] ?? false}
                onChange={(v) => setFlag(def.id, v)}
                onClear={() => unsetFlag(def.id)}
              />
            )
          }
          case 'text': {
            type TextDef = Omit<FlagDefinition, 'control'> & {
              control: { type: 'text'; placeholder?: string; maxLength?: number }
            }
            const textDef = def as TextDef
            return (
              <TextFlagControl
                key={def.id}
                def={textDef}
                value={(flagValues[def.id] as string) ?? ''}
                isSet={setFlags[def.id] ?? false}
                onChange={(v) => {
                  // v is already sanitized by TextFlagControl on commit — do NOT sanitize again.
                  if (v) setFlag(def.id, v)
                  else unsetFlag(def.id)
                }}
                onClear={() => unsetFlag(def.id)}
              />
            )
          }
          default:
            return null
        }
      })}
    </div>
  )
}
