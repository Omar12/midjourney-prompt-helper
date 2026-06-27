import { useBuildSession } from '@/state/buildSession'
import { serialize } from '@/domain/prompt/serialize'
import { IntentInput } from './ControlsPane/IntentInput'
import { ChipInput } from './ControlsPane/ChipInput'
import { ChipArea } from './ControlsPane/ChipArea'
import { LivePreview } from './PreviewPane/LivePreview'
import { CopyButton } from './PreviewPane/CopyButton'
import { ClearButton } from './ClearDialog'

export default function App() {
  const intent = useBuildSession((s) => s.intent)
  const chips = useBuildSession((s) => s.chips)

  // Derive preview inline to avoid referential instability in selectors (RESEARCH.md Open Question 1)
  const preview = serialize({
    id: '',
    intent,
    chips,
    flags: [],
    schemaVersion: 1,
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
