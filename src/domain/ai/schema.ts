import { z } from 'zod'

export const PaletteOptionSchema = z.object({
  label: z.string().min(1).max(60),
  description: z.string().max(120).optional(),
})

const EMPTY_OPTS: z.infer<typeof PaletteOptionSchema>[] = []

export const PaletteResponseSchema = z.object({
  styleMedium: z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  lighting: z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  cameraLens: z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  composition: z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  color: z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
  mood: z.array(PaletteOptionSchema).catch(EMPTY_OPTS),
})

export type PaletteMap = z.infer<typeof PaletteResponseSchema>
export type PaletteOption = z.infer<typeof PaletteOptionSchema>
