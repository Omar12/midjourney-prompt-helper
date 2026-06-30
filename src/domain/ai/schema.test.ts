import { describe, test, expect } from 'vitest'
import { PaletteResponseSchema, PaletteOptionSchema } from './schema'

describe('PaletteOptionSchema', () => {
  test('validates a valid option with label and description', () => {
    expect(() =>
      PaletteOptionSchema.parse({ label: 'Golden Hour', description: 'Warm sunset light' }),
    ).not.toThrow()
  })

  test('validates a valid option with label only (description optional)', () => {
    expect(() =>
      PaletteOptionSchema.parse({ label: 'Oil Painting' }),
    ).not.toThrow()
  })

  test('rejects label that is empty string', () => {
    expect(() =>
      PaletteOptionSchema.parse({ label: '' }),
    ).toThrow()
  })
})

describe('PaletteResponseSchema — valid full object', () => {
  test('parses a valid full 6-category response without throwing', () => {
    const input = {
      styleMedium: [{ label: 'Oil Painting', description: 'Classic media' }],
      lighting: [{ label: 'Golden Hour', description: 'Warm sunset' }],
      cameraLens: [{ label: '85mm Portrait', description: 'Flattering focal length' }],
      composition: [{ label: 'Rule of Thirds', description: 'Classic composition' }],
      color: [{ label: 'Muted Earth Tones', description: 'Warm naturals' }],
      mood: [{ label: 'Ethereal', description: 'Dreamy atmosphere' }],
    }
    expect(() => PaletteResponseSchema.parse(input)).not.toThrow()
    const result = PaletteResponseSchema.parse(input)
    expect(result.styleMedium).toHaveLength(1)
    expect(result.lighting).toHaveLength(1)
  })
})

describe('PaletteResponseSchema — .catch([]) graceful degradation', () => {
  test('null in one category field → that field becomes [], other fields intact', () => {
    const input = {
      styleMedium: [{ label: 'Oil Painting' }],
      lighting: null,
      cameraLens: [{ label: '85mm Portrait' }],
      composition: [{ label: 'Rule of Thirds' }],
      color: [{ label: 'Muted Earth Tones' }],
      mood: [{ label: 'Ethereal' }],
    }
    // Must NOT throw — .catch([]) should handle the null
    expect(() => PaletteResponseSchema.parse(input)).not.toThrow()
    const result = PaletteResponseSchema.parse(input)
    expect(result.lighting).toEqual([])
    expect(result.styleMedium).toHaveLength(1)
    expect(result.cameraLens).toHaveLength(1)
  })

  test('wrong-type field (string instead of array) → that field becomes []', () => {
    const input = {
      styleMedium: [{ label: 'Oil Painting' }],
      lighting: 'not-an-array',
      cameraLens: [{ label: '85mm Portrait' }],
      composition: [{ label: 'Rule of Thirds' }],
      color: [{ label: 'Muted Earth Tones' }],
      mood: [{ label: 'Ethereal' }],
    }
    expect(() => PaletteResponseSchema.parse(input)).not.toThrow()
    const result = PaletteResponseSchema.parse(input)
    expect(result.lighting).toEqual([])
    expect(result.styleMedium).toHaveLength(1)
  })

  test('all 6 fields null → all fields [], total === 0', () => {
    const input = {
      styleMedium: null,
      lighting: null,
      cameraLens: null,
      composition: null,
      color: null,
      mood: null,
    }
    expect(() => PaletteResponseSchema.parse(input)).not.toThrow()
    const result = PaletteResponseSchema.parse(input)
    expect(result.styleMedium).toEqual([])
    expect(result.lighting).toEqual([])
    expect(result.cameraLens).toEqual([])
    expect(result.composition).toEqual([])
    expect(result.color).toEqual([])
    expect(result.mood).toEqual([])
    const total = Object.values(result).reduce((n, arr) => n + arr.length, 0)
    expect(total).toBe(0)
  })

  test('per-category: valid categories survive, malformed ones drop independently', () => {
    const input = {
      styleMedium: [{ label: 'Watercolor' }],
      lighting: [{ label: 'Volumetric Fog' }],
      cameraLens: 42, // wrong type
      composition: null, // null
      color: [{ label: 'Vibrant' }],
      mood: [{ label: 'Serene' }],
    }
    expect(() => PaletteResponseSchema.parse(input)).not.toThrow()
    const result = PaletteResponseSchema.parse(input)
    expect(result.styleMedium).toHaveLength(1)
    expect(result.lighting).toHaveLength(1)
    expect(result.cameraLens).toEqual([])
    expect(result.composition).toEqual([])
    expect(result.color).toHaveLength(1)
    expect(result.mood).toHaveLength(1)
  })
})
