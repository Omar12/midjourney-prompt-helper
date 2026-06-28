import { z } from 'zod'

const SliderControlSchema = z.object({
  type: z.literal('slider'),
  min: z.number(),
  max: z.number(),
  step: z.number().default(1),
})

const NumberControlSchema = z.object({
  type: z.literal('number'),
  min: z.number(),
  max: z.number(),
})

const AspectRatioControlSchema = z.object({
  type: z.literal('aspect-ratio'),
  presets: z.array(z.string()),
})

const TextControlSchema = z.object({
  type: z.literal('text'),
  placeholder: z.string().optional(),
  maxLength: z.number().optional(),
})

export const ControlSpecSchema = z.discriminatedUnion('type', [
  SliderControlSchema,
  NumberControlSchema,
  AspectRatioControlSchema,
  TextControlSchema,
])

export const VersionDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  parameter: z.string(),
  supportedFlagIds: z.array(z.string()),
})

export const FlagDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  paramName: z.string(),
  control: ControlSpecSchema,
  availableOn: z.array(z.string()),
})

export type VersionDefinition = z.infer<typeof VersionDefinitionSchema>
export type FlagDefinition = z.infer<typeof FlagDefinitionSchema>
export type ControlSpec = z.infer<typeof ControlSpecSchema>
