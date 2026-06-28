import { useBuildSession } from '@/state/buildSession'
import { serialize } from '@/domain/prompt/serialize'
import { FLAG_DEFINITIONS, VERSION_DEFINITIONS } from '@/domain/flags'
import { IntentInput } from './ControlsPane/IntentInput'
import { ChipInput } from './ControlsPane/ChipInput'
import { ChipArea } from './ControlsPane/ChipArea'
import { FlagControls } from './ControlsPane/FlagControls/FlagControls'
import { LivePreview } from './PreviewPane/LivePreview'
import { CopyButton } from './PreviewPane/CopyButton'
import { ClearButton } from './ClearDialog'

export default function App() {
  const intent = useBuildSession((s) => s.intent)
  const chips = useBuildSession((s) => s.chips)
  const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
  const flagValues = useBuildSession((s) => s.flagValues)
  const setFlags = useBuildSession((s) => s.setFlags)

  // Derive supported flag IDs for the current version.
  // When no version is selected, all flags are eligible (show everything).
  // Pitfall 2 mitigation: a flag retained in setFlags from a previous version
  // is excluded here if the new version doesn't support it.
  const supportedIds = selectedVersionId
    ? (VERSION_DEFINITIONS.find((v) => v.id === selectedVersionId)?.supportedFlagIds ?? [])
    : FLAG_DEFINITIONS.map((f) => f.id)

  // Build ordered flags array: FLAG_DEFINITIONS canonical order, filtered by
  // (a) flag is actively set and (b) current version supports it.
  const flags = FLAG_DEFINITIONS
    .filter((def) => supportedIds.includes(def.id) && setFlags[def.id] === true)
    .map((def) => ({ flagId: def.id, value: flagValues[def.id] }))

  // Derive preview inline to avoid referential instability in selectors (RESEARCH.md Open Question 1)
  const preview = serialize({
    id: '',
    intent,
    chips,
    flags,
    schemaVersion: 2,
    selectedVersionId,
    createdAt: '',
    updatedAt: '',
  })

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-screen">
      {/* Controls pane — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
        <IntentInput />
        <ChipInput />
        <ChipArea />
        <FlagControls />
        <ClearButton />
      </div>

      {/* Preview pane — sticky on wide viewports (D-09) */}
      <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-border md:sticky md:top-0 md:h-screen p-4 md:p-6 flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Preview
        </h2>
        <LivePreview preview={preview} />
        <CopyButton text={preview} />
      </div>
    </div>
  )
}
