import { describe, test, expect } from 'vitest'
import { PromptDraftSchema, ChipSchema } from './model'

describe('ChipSchema', () => {
  test('validates a valid chip', () => {
    expect(() =>
      ChipSchema.parse({
        id: crypto.randomUUID(),
        label: 'cinematic',
        source: 'custom',
        enabled: true,
      })
    ).not.toThrow()
  })

  test('rejects an id that is not a UUID', () => {
    expect(() =>
      ChipSchema.parse({
        id: 'not-a-uuid',
        label: 'test',
        source: 'custom',
        enabled: true,
      })
    ).toThrow()
  })

  test('rejects an empty label', () => {
    expect(() =>
      ChipSchema.parse({
        id: crypto.randomUUID(),
        label: '',
        source: 'custom',
        enabled: true,
      })
    ).toThrow()
  })
})

describe('PromptDraftSchema', () => {
  test('validates a valid PromptDraft', () => {
    expect(() =>
      PromptDraftSchema.parse({
        id: crypto.randomUUID(),
        intent: 'a cat',
        chips: [],
        flags: [],
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).not.toThrow()
  })

  test('rejects a chip with an empty label', () => {
    expect(() =>
      PromptDraftSchema.parse({
        id: crypto.randomUUID(),
        intent: 'a cat',
        chips: [
          {
            id: crypto.randomUUID(),
            label: '',
            source: 'custom',
            enabled: true,
          },
        ],
        flags: [],
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).toThrow()
  })

  test('rejects schemaVersion other than 1', () => {
    expect(() =>
      PromptDraftSchema.parse({
        id: crypto.randomUUID(),
        intent: 'a cat',
        chips: [],
        flags: [],
        schemaVersion: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).toThrow()
  })
})
