import type { FlagDefinition } from './schema'

const ALL_VERSION_IDS = ['v8.1', 'v7', 'v6.1', 'niji7', 'niji6'] as const

export const FLAG_DEFINITIONS: FlagDefinition[] = [
  {
    id: 'ar',
    label: 'Aspect Ratio',
    paramName: '--ar',
    control: {
      type: 'aspect-ratio',
      presets: ['1:1', '4:5', '3:2', '2:3', '16:9', '9:16', '21:9'],
    },
    availableOn: [...ALL_VERSION_IDS],
  },
  {
    id: 'stylize',
    label: 'Stylize',
    paramName: '--stylize',
    control: { type: 'slider', min: 0, max: 1000, step: 1 },
    availableOn: [...ALL_VERSION_IDS],
  },
  {
    id: 'chaos',
    label: 'Chaos',
    paramName: '--chaos',
    control: { type: 'slider', min: 0, max: 100, step: 1 },
    availableOn: [...ALL_VERSION_IDS],
  },
  {
    id: 'seed',
    label: 'Seed',
    paramName: '--seed',
    control: { type: 'number', min: 0, max: 4294967295 },
    availableOn: [...ALL_VERSION_IDS],
  },
  {
    id: 'no',
    label: 'Exclude (--no)',
    paramName: '--no',
    control: {
      type: 'text',
      placeholder: 'trees, text, watermark',
      maxLength: 500,
    },
    availableOn: [...ALL_VERSION_IDS],
  },
]
