import { z } from 'zod'

export const ChipSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
  source: z.enum(['custom', 'palette']), // 'palette' used in Phase 4
  paletteCategory: z.string().optional(), // Phase 4: "camera", "style", etc.
  enabled: z.boolean().default(true), // toggle without deleting
})

export const FlagValueSchema = z.object({
  flagId: z.string(), // references FlagDefinition.id in Phase 2
  value: z.unknown(),
})

export const PromptDraftSchema = z.object({
  id: z.string().uuid(),
  intent: z.string().max(2000), // opaque block, not split
  chips: z.array(ChipSchema), // insertion-ordered discrete descriptors
  flags: z.array(FlagValueSchema), // empty in Phase 1; Phase 2 populates
  schemaVersion: z.literal(1), // bump on breaking changes; enables migration
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Chip = z.infer<typeof ChipSchema>
export type FlagValue = z.infer<typeof FlagValueSchema>
export type PromptDraft = z.infer<typeof PromptDraftSchema>
