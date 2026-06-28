import { describe, test, expect } from 'vitest'
import {
  FlagDefinitionSchema,
  VersionDefinitionSchema,
} from './schema'
import { FLAG_DEFINITIONS } from './definitions'
import { VERSION_DEFINITIONS } from './versions'

describe('FlagDefinitionSchema', () => {
  test('validates a slider control', () => {
    expect(() =>
      FlagDefinitionSchema.parse({
        id: 'stylize',
        label: 'Stylize',
        paramName: '--stylize',
        control: { type: 'slider', min: 0, max: 1000, step: 1 },
        availableOn: ['v7'],
      }),
    ).not.toThrow()
  })

  test('validates a number control', () => {
    expect(() =>
      FlagDefinitionSchema.parse({
        id: 'seed',
        label: 'Seed',
        paramName: '--seed',
        control: { type: 'number', min: 0, max: 4294967295 },
        availableOn: ['v7'],
      }),
    ).not.toThrow()
  })

  test('validates an aspect-ratio control', () => {
    expect(() =>
      FlagDefinitionSchema.parse({
        id: 'ar',
        label: 'Aspect Ratio',
        paramName: '--ar',
        control: { type: 'aspect-ratio', presets: ['1:1', '16:9'] },
        availableOn: ['v7'],
      }),
    ).not.toThrow()
  })

  test('validates a text control', () => {
    expect(() =>
      FlagDefinitionSchema.parse({
        id: 'no',
        label: 'Exclude (--no)',
        paramName: '--no',
        control: { type: 'text', placeholder: 'trees, text, watermark', maxLength: 500 },
        availableOn: ['v7'],
      }),
    ).not.toThrow()
  })

  test('rejects control with unknown type', () => {
    expect(() =>
      FlagDefinitionSchema.parse({
        id: 'x',
        label: 'x',
        paramName: '--x',
        control: { type: 'unknown' },
        availableOn: [],
      }),
    ).toThrow()
  })
})

describe('VersionDefinitionSchema', () => {
  test('validates a valid version definition', () => {
    expect(() =>
      VersionDefinitionSchema.parse({
        id: 'v7',
        label: 'V7',
        parameter: '--v 7',
        supportedFlagIds: ['ar', 'stylize'],
      }),
    ).not.toThrow()
  })

  test('rejects missing parameter field', () => {
    expect(() =>
      VersionDefinitionSchema.parse({
        id: 'v7',
        label: 'V7',
        supportedFlagIds: ['ar'],
      }),
    ).toThrow()
  })
})

describe('FLAG_DEFINITIONS', () => {
  test('contains exactly 5 entries', () => {
    expect(FLAG_DEFINITIONS).toHaveLength(5)
  })

  test('ids are in canonical order: ar, stylize, chaos, seed, no', () => {
    expect(FLAG_DEFINITIONS.map((f) => f.id)).toEqual([
      'ar',
      'stylize',
      'chaos',
      'seed',
      'no',
    ])
  })

  test('stylize control is a slider with min=0, max=1000, step=1', () => {
    const stylize = FLAG_DEFINITIONS.find((f) => f.id === 'stylize')!
    expect(stylize.control.type).toBe('slider')
    if (stylize.control.type === 'slider') {
      expect(stylize.control.min).toBe(0)
      expect(stylize.control.max).toBe(1000)
      expect(stylize.control.step).toBe(1)
    }
  })

  test('seed control is a number with max=4294967295', () => {
    const seed = FLAG_DEFINITIONS.find((f) => f.id === 'seed')!
    expect(seed.control.type).toBe('number')
    if (seed.control.type === 'number') {
      expect(seed.control.min).toBe(0)
      expect(seed.control.max).toBe(4294967295)
    }
  })

  test('no control is text with placeholder and maxLength=500', () => {
    const no = FLAG_DEFINITIONS.find((f) => f.id === 'no')!
    expect(no.control.type).toBe('text')
    if (no.control.type === 'text') {
      expect(no.control.placeholder).toBe('trees, text, watermark')
      expect(no.control.maxLength).toBe(500)
    }
  })

  test('ar control has exactly 7 presets', () => {
    const ar = FLAG_DEFINITIONS.find((f) => f.id === 'ar')!
    expect(ar.control.type).toBe('aspect-ratio')
    if (ar.control.type === 'aspect-ratio') {
      expect(ar.control.presets).toEqual([
        '1:1',
        '4:5',
        '3:2',
        '2:3',
        '16:9',
        '9:16',
        '21:9',
      ])
    }
  })

  test('every flag is available on all 5 versions', () => {
    const allVersionIds = ['v8.1', 'v7', 'v6.1', 'niji7', 'niji6']
    for (const def of FLAG_DEFINITIONS) {
      expect(def.availableOn).toEqual(allVersionIds)
    }
  })
})

describe('VERSION_DEFINITIONS', () => {
  test('contains exactly 5 entries', () => {
    expect(VERSION_DEFINITIONS).toHaveLength(5)
  })

  test('first entry id is v8.1 (latest first)', () => {
    expect(VERSION_DEFINITIONS[0].id).toBe('v8.1')
  })

  test('niji7 has correct parameter --niji 7', () => {
    const niji7 = VERSION_DEFINITIONS.find((v) => v.id === 'niji7')!
    expect(niji7.parameter).toBe('--niji 7')
  })

  test('v6.1 has correct parameter --v 6.1', () => {
    const v61 = VERSION_DEFINITIONS.find((v) => v.id === 'v6.1')!
    expect(v61.parameter).toBe('--v 6.1')
  })

  test('niji6 has correct parameter --niji 6', () => {
    const niji6 = VERSION_DEFINITIONS.find((v) => v.id === 'niji6')!
    expect(niji6.parameter).toBe('--niji 6')
  })

  test('v7 has correct parameter --v 7', () => {
    const v7 = VERSION_DEFINITIONS.find((v) => v.id === 'v7')!
    expect(v7.parameter).toBe('--v 7')
  })
})
