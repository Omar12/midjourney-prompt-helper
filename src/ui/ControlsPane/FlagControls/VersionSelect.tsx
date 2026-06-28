import { useBuildSession } from '@/state/buildSession'
import { VERSION_DEFINITIONS } from '@/domain/flags'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

// Separate per-field selectors — avoids React 19 referential-instability infinite loop
// (object selector creates a new reference on every call; see Plan 03 deviation notes).
export function VersionSelect() {
  const selectedVersionId = useBuildSession((s) => s.selectedVersionId)
  const setVersion = useBuildSession((s) => s.setVersion)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Version</span>
        {selectedVersionId !== null && (
          <Button
            size="icon"
            variant="ghost"
            className="min-w-[44px] min-h-[44px] size-auto p-1 rounded-sm"
            aria-label="Clear version"
            onClick={() => setVersion(null)}
          >
            ✕
          </Button>
        )}
      </div>
      <Select
        value={selectedVersionId ?? undefined}
        onValueChange={(value) => setVersion(value ?? null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="MJ default (no flag)" />
        </SelectTrigger>
        <SelectContent>
          {VERSION_DEFINITIONS.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              {version.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
