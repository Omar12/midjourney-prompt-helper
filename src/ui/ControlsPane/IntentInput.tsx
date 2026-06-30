import { Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'
import { usePaletteSession } from '@/state/paletteSession'
import { useKeyStorage } from '@/hooks/useKeyStorage'
import { openRouterAdapter } from '@/domain/ai/openrouter'

export function IntentInput() {
  // Per-field selectors — avoids React 19 referential-instability infinite loop
  const intent = useBuildSession((s) => s.intent)
  const setIntent = useBuildSession((s) => s.setIntent)

  const isLoading = usePaletteSession((s) => s.isLoading)
  const setLoading = usePaletteSession((s) => s.setLoading)
  const setPalettes = usePaletteSession((s) => s.setPalettes)
  const setError = usePaletteSession((s) => s.setError)

  const { key } = useKeyStorage()

  const handleSuggest = async () => {
    // Double-fire guard (D-09): bail if a call is already in flight
    if (isLoading) return

    setLoading(true)
    setError(null)

    try {
      const result = await openRouterAdapter.generatePalettes(intent, key)
      if (result.ok) {
        setPalettes(result.palettes)
      } else {
        setError(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const canSuggest = !isLoading && intent.trim().length > 0 && key.length > 0

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
      <Button
        onClick={handleSuggest}
        disabled={!canSuggest}
        className="self-end"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Suggesting…
          </>
        ) : (
          'Suggest options'
        )}
      </Button>
    </div>
  )
}
