import { useSyncExternalStore } from 'react'

const KEY = 'mj-ph-api-key'

// Module-level subscribers so every useKeyStorage instance shares one reactive
// source of truth. localStorage alone is not reactive within a tab, so a save
// in SettingsModal would never reach IntentInput without this notifier.
const listeners = new Set<() => void>()

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): string {
  return localStorage.getItem(KEY) ?? ''
}

function emit(): void {
  listeners.forEach((cb) => cb())
}

export function useKeyStorage(): {
  key: string
  saveKey: (value: string) => void
  clearKey: () => void
} {
  const key = useSyncExternalStore(subscribe, getSnapshot)

  const saveKey = (value: string) => {
    localStorage.setItem(KEY, value)
    emit()
  }

  const clearKey = () => {
    localStorage.removeItem(KEY)
    emit()
  }

  return { key, saveKey, clearKey }
}
