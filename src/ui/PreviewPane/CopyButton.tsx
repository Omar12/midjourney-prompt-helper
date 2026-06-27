import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CopyButtonProps {
  text: string
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    try {
      // Must be called synchronously inside the click handler (user gesture required
      // for Clipboard API in Firefox/Safari) — never in a setTimeout or useEffect.
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silent fallback for non-secure contexts or permission denied (D-10 / T-04-01).
      // Phase 1: no visible error state — revisit in Phase 5 (Tauri) if needed.
    }
  }

  return (
    <Button
      variant="default"
      onClick={handleCopy}
      disabled={!text}
      className="w-full"
    >
      {copied ? 'Copied!' : 'Copy prompt'}
    </Button>
  )
}
