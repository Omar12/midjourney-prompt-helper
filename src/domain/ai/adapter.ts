import type { PaletteMap } from './schema'

export type PaletteError =
  | { type: 'auth'; message: string }
  | { type: 'network'; message: string }
  | { type: 'malformed'; message: string }

export type PaletteCallResult =
  | { ok: true; palettes: PaletteMap }
  | { ok: false; error: PaletteError }

export interface PaletteAdapter {
  readonly providerId: string
  generatePalettes(intent: string, key: string): Promise<PaletteCallResult>
}
