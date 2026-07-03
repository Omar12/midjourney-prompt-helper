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
      size="lg"
      onClick={handleCopy}
      disabled={!text}
      data-copied={copied || undefined}
      className="w-full gap-1.5 font-semibold data-[copied]:animate-[copy-confirm_0.5s_cubic-bezier(0.22,1,0.36,1)]"
    >
      {copied && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="size-4"
        >
          <path
            d="M20 6 9 17l-5-5"
            className="[stroke-dasharray:24] [stroke-dashoffset:24] animate-[check-draw_0.35s_0.06s_cubic-bezier(0.65,0,0.35,1)_forwards]"
          />
        </svg>
      )}
      {copied ? 'Copied!' : 'Copy prompt'}
    </Button>
  )
}
