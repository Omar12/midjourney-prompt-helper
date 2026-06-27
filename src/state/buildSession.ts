import { create } from 'zustand'
import type { Chip } from '../domain/prompt/model'
import { sanitize } from '../domain/prompt/sanitize'

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
    // Sanitize before storing — single chokepoint (D-08 / T-04-02).
    // Phase 4 AI-supplied labels will also route through addChip and inherit this gate.
    const sanitized = sanitize(trimmed)
    if (!sanitized) return
    const { chips } = get()
    // Deduplicate by sanitized label (case-sensitive, per Claude's Discretion)
    if (chips.some((c) => c.label === sanitized)) return
    set({
      chips: [
        ...chips,
        {
          id: crypto.randomUUID(),
          label: sanitized,
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
