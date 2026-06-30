import { create } from 'zustand'
import type { PaletteMap } from '../domain/ai/schema'
import type { PaletteError } from '../domain/ai/adapter'

interface PaletteSessionState {
  palettes: PaletteMap | null
  isLoading: boolean
  error: PaletteError | null
  setPalettes(palettes: PaletteMap): void
  setLoading(loading: boolean): void
  setError(error: PaletteError | null): void
  clearPalettes(): void
}

export const usePaletteSession = create<PaletteSessionState>()((set) => ({
  palettes: null,
  isLoading: false,
  error: null,

  setPalettes: (palettes) => set({ palettes, error: null }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearPalettes: () => set({ palettes: null, error: null }),
}))
