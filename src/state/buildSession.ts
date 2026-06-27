import { create } from 'zustand'
import type { Chip } from '../domain/prompt/model'

interface BuildSessionState {
  intent: string
  chips: Chip[]
  setIntent(intent: string): void
  addChip(label: string): void
  removeChip(id: string): void
  toggleChip(id: string): void
  clearAll(): void
}

export const useBuildSession = create<BuildSessionState>()((set, get) => ({
  intent: '',
  chips: [],

  setIntent: (intent) => set({ intent }),

  addChip: (label) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const { chips } = get()
    // Deduplicate by label (case-sensitive, per Claude's Discretion)
    if (chips.some((c) => c.label === trimmed)) return
    set({
      chips: [
        ...chips,
        {
          id: crypto.randomUUID(),
          label: trimmed,
          source: 'custom',
          enabled: true,
        },
      ],
    })
  },

  removeChip: (id) => set({ chips: get().chips.filter((c) => c.id !== id) }),

  toggleChip: (id) =>
    set({
      chips: get().chips.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      ),
    }),

  clearAll: () => set({ intent: '', chips: [] }),
}))
