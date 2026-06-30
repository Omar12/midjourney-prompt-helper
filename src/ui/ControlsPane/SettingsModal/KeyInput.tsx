import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useKeyStorage } from '@/hooks/useKeyStorage'

export function KeyInput() {
  const { key, saveKey, clearKey } = useKeyStorage()
  const [inputValue, setInputValue] = useState(key)

  const handleSave = () => {
    saveKey(inputValue)
  }

  const handleClear = () => {
    clearKey()
    setInputValue('')
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="api-key-input" className="text-sm font-medium">
        API Key
      </label>
      <Input
        id="api-key-input"
        type="password"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter your API key"
        autoComplete="off"
      />
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={inputValue === key || inputValue.trim() === ''}
        >
          Save key
        </Button>
        <Button
          variant="ghost"
          onClick={handleClear}
          disabled={key === ''}
        >
          Clear key
        </Button>
      </div>
    </div>
  )
}
