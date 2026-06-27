import { Textarea } from '@/components/ui/textarea'
import { useBuildSession } from '@/state/buildSession'

export function IntentInput() {
  const intent = useBuildSession((s) => s.intent)
  const setIntent = useBuildSession((s) => s.setIntent)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="intent-input" className="text-sm font-medium">
        Describe your image
      </label>
      <Textarea
        id="intent-input"
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder="e.g. a misty mountain lake at dawn, shot from above"
        className="min-h-[96px]"
      />
    </div>
  )
}
