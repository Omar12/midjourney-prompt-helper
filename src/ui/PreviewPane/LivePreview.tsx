interface LivePreviewProps {
  preview: string
}

// The built prompt is the hero (PRODUCT.md): it lives in its own card "well"
// on the brand-tinted panel so it reads as the celebrated, copyable artifact
// rather than loose text. Geist Mono (via font-mono token) keeps flag syntax
// aligned and on-brand.
export function LivePreview({ preview }: LivePreviewProps) {
  return (
    <div className="flex-1 min-h-32 overflow-y-auto rounded-xl border border-primary/15 bg-card p-4 shadow-sm">
      {preview ? (
        <pre className="whitespace-pre-wrap break-words font-mono text-base leading-relaxed text-card-foreground">
          {preview}
        </pre>
      ) : (
        <p className="font-mono text-base italic leading-relaxed text-muted-foreground">
          Your prompt will appear here…
        </p>
      )}
    </div>
  )
}
