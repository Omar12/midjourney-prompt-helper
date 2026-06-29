import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Upload } from 'lucide-react'
import { exportLibrary, importLibrary } from '@/domain/library/import'
import type { LibraryEntry } from '@/domain/library/schema'

interface ExportImportProps {
  entries: LibraryEntry[]
}

export function ExportImport({ entries }: ExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  const showStatus = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(null), 4000)
  }

  const handleExport = async () => {
    await exportLibrary(entries)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await importLibrary(file)
    if (result.error) {
      showStatus('Could not read file — please try a valid JSON backup.')
    } else if (result.imported === 0) {
      showStatus('Nothing imported — no valid entries found.')
    } else if (result.skipped > 0) {
      showStatus(
        `Imported ${result.imported} prompt${result.imported !== 1 ? 's' : ''}. ${result.skipped} skipped (invalid format).`,
      )
    } else {
      showStatus(`Imported ${result.imported} prompt${result.imported !== 1 ? 's' : ''}.`)
    }
    // Reset input so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleExport}
        disabled={entries.length === 0}
      >
        <Download size={16} /> Export library
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={16} /> Import backup
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </div>
  )
}
