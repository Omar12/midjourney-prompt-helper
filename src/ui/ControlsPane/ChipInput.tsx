import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useBuildSession } from '@/state/buildSession'

export function ChipInput() {
  const [value, setValue] = useState('')
  const addChip = useBuildSession((s) => s.addChip)

  const handleAdd = () => {
    if (!value.trim()) return
    addChip(value.trim())
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="chip-input" className="text-sm font-medium">
        Add a style keyword
      </label>
      <div className="flex gap-2">
        <Input
          id="chip-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAdd()
              e.preventDefault()
            }
          }}
          placeholder="e.g. cinematic, neon, oil painting"
        />
        <Button
          variant="outline"
          onClick={handleAdd}
          disabled={!value.trim()}
        >
          Add keyword
        </Button>
      </div>
    </div>
  )
}
