import { useState } from 'react'

const KEY = 'mj-ph-api-key'

export function useKeyStorage(): {
  key: string
  saveKey: (value: string) => void
  clearKey: () => void
} {
  const [key, setKeyState] = useState(() => localStorage.getItem(KEY) ?? '')

  const saveKey = (value: string) => {
    localStorage.setItem(KEY, value)
    setKeyState(value)
  }

  const clearKey = () => {
    localStorage.removeItem(KEY)
    setKeyState('')
  }

  return { key, saveKey, clearKey }
}
