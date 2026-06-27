interface LivePreviewProps {
  preview: string
}

export function LivePreview({ preview }: LivePreviewProps) {
  if (!preview) {
    return (
      <pre className="flex-1 whitespace-pre-wrap text-sm font-mono break-words text-muted-foreground">
        Your prompt will appear here…
      </pre>
    )
  }

  return (
    <pre className="flex-1 whitespace-pre-wrap text-sm font-mono break-words">
      {preview}
    </pre>
  )
}
