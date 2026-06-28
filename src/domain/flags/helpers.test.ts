import { describe, test, expect } from 'vitest'
import { getFlagsForVersion, serializeFlag, getVersionParameter, validateAspectRatio } from './helpers'
import { FLAG_DEFINITIONS } from './definitions'

describe('getFlagsForVersion', () => {
  const allFlagIds = ['ar', 'stylize', 'chaos', 'seed', 'no']

  test('null versionId returns all 5 flags', () => {
    const result = getFlagsForVersion(null)
    expect(result).toHaveLength(5)
    expect(result.map((f) => f.id)).toEqual(allFlagIds)
  })

  test('known version id v7 returns all 5 flags (all support V7)', () => {
    const result = getFlagsForVersion('v7')
    expect(result).toHaveLength(5)
    expect(result.map((f) => f.id)).toEqual(allFlagIds)
  })

  test('known version id v8.1 returns all 5 flags', () => {
    const result = getFlagsForVersion('v8.1')
    expect(result).toHaveLength(5)
  })

  test('known version id niji7 returns all 5 flags', () => {
    const result = getFlagsForVersion('niji7')
    expect(result).toHaveLength(5)
  })

  test('unknown version id returns all flags (fallback behavior)', () => {
    const result = getFlagsForVersion('UNKNOWN')
    expect(result).toHaveLength(5)
    expect(result).toEqual(FLAG_DEFINITIONS)
  })

  test('returns FlagDefinition objects (not just ids)', () => {
    const result = getFlagsForVersion('v7')
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('paramName')
    expect(result[0]).toHaveProperty('control')
    expect(result[0]).toHaveProperty('availableOn')
  })
})

describe('serializeFlag', () => {
  const goldenCases = [
    { desc: 'stylize with numeric value', flagId: 'stylize', value: 250, expected: '--stylize 250' },
    { desc: 'ar with ratio string', flagId: 'ar', value: '16:9', expected: '--ar 16:9' },
    { desc: 'no with text value', flagId: 'no', value: 'trees, watermark', expected: '--no trees, watermark' },
    { desc: 'chaos with numeric value', flagId: 'chaos', value: 50, expected: '--chaos 50' },
    { desc: 'seed with large number', flagId: 'seed', value: 12345, expected: '--seed 12345' },
    { desc: 'stylize with zero (D-06: default value still emits)', flagId: 'stylize', value: 0, expected: '--stylize 0' },
    { desc: 'chaos with zero (D-06)', flagId: 'chaos', value: 0, expected: '--chaos 0' },
  ]

  test.each(goldenCases)('$desc', ({ flagId, value, expected }) => {
    expect(serializeFlag(flagId, value)).toBe(expected)
  })

  test('returns null for null value', () => {
    expect(serializeFlag('stylize', null)).toBeNull()
  })

  test('returns null for undefined value', () => {
    expect(serializeFlag('stylize', undefined)).toBeNull()
  })

  test('returns null for empty string value', () => {
    expect(serializeFlag('stylize', '')).toBeNull()
  })

  test('returns null for nonexistent flag id', () => {
    expect(serializeFlag('NONEXISTENT', 123)).toBeNull()
  })

  test('returns null for empty flagId', () => {
    expect(serializeFlag('', 'value')).toBeNull()
  })
})

describe('getVersionParameter', () => {
  const goldenCases = [
    { desc: 'v7 returns --v 7', versionId: 'v7', expected: '--v 7' },
    { desc: 'niji7 returns --niji 7', versionId: 'niji7', expected: '--niji 7' },
    { desc: 'niji6 returns --niji 6', versionId: 'niji6', expected: '--niji 6' },
    { desc: 'v6.1 returns --v 6.1', versionId: 'v6.1', expected: '--v 6.1' },
    { desc: 'v8.1 returns --v 8.1', versionId: 'v8.1', expected: '--v 8.1' },
  ]

  test.each(goldenCases)('$desc', ({ versionId, expected }) => {
    expect(getVersionParameter(versionId)).toBe(expected)
  })

  test('returns null for unknown version id', () => {
    expect(getVersionParameter('UNKNOWN')).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(getVersionParameter('')).toBeNull()
  })
})

describe('validateAspectRatio', () => {
  const validCases = [
    { desc: 'standard 16:9', input: '16:9', expected: '16:9' },
    { desc: 'square 1:1', input: '1:1', expected: '1:1' },
    { desc: 'large resolution 1920:1080', input: '1920:1080', expected: '1920:1080' },
    { desc: 'portrait 9:16', input: '9:16', expected: '9:16' },
    { desc: '21:9 cinematic', input: '21:9', expected: '21:9' },
  ]

  test.each(validCases)('$desc', ({ input, expected }) => {
    expect(validateAspectRatio(input)).toBe(expected)
  })

  test('trims whitespace and returns valid ratio', () => {
    expect(validateAspectRatio(' 16:9 ')).toBe('16:9')
  })

  test('rejects injection attempt with flag syntax', () => {
    expect(validateAspectRatio('16:9 --stylize 999')).toBeNull()
  })

  test('rejects zero width', () => {
    expect(validateAspectRatio('0:9')).toBeNull()
  })

  test('rejects zero height', () => {
    expect(validateAspectRatio('16:0')).toBeNull()
  })

  test('rejects non-ratio string', () => {
    expect(validateAspectRatio('not-a-ratio')).toBeNull()
  })

  test('rejects empty string', () => {
    expect(validateAspectRatio('')).toBeNull()
  })

  test('rejects decimal ratios', () => {
    expect(validateAspectRatio('16.5:9')).toBeNull()
  })

  test('rejects negative numbers', () => {
    expect(validateAspectRatio('-16:9')).toBeNull()
  })
})
