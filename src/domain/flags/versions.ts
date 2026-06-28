import type { VersionDefinition } from './schema'

const ALL_STANDARD_FLAGS = ['ar', 'stylize', 'chaos', 'seed', 'no'] as const

export const VERSION_DEFINITIONS: VersionDefinition[] = [
  {
    id: 'v8.1',
    label: 'V8.1 (Latest)',
    parameter: '--v 8.1',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
  {
    id: 'v7',
    label: 'V7',
    parameter: '--v 7',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
  {
    id: 'v6.1',
    label: 'V6.1',
    parameter: '--v 6.1',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
  {
    id: 'niji7',
    label: 'Niji 7',
    parameter: '--niji 7',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
  {
    id: 'niji6',
    label: 'Niji 6 (Legacy)',
    parameter: '--niji 6',
    supportedFlagIds: [...ALL_STANDARD_FLAGS],
  },
]
