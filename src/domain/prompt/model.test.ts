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
        schemaVersion: 2,
        selectedVersionId: null,
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
        schemaVersion: 2,
        selectedVersionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).toThrow()
  })

  test('accepts schemaVersion 2 and rejects schemaVersion 1', () => {
    // schemaVersion 2 is valid
    expect(() =>
      PromptDraftSchema.parse({
        id: crypto.randomUUID(),
        intent: 'a cat',
        chips: [],
        flags: [],
        schemaVersion: 2,
        selectedVersionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).not.toThrow()

    // schemaVersion 1 is rejected after bump to v2
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
    ).toThrow()
  })

  test('accepts selectedVersionId as a string', () => {
    expect(() =>
      PromptDraftSchema.parse({
        id: crypto.randomUUID(),
        intent: 'a cat',
        chips: [],
        flags: [],
        schemaVersion: 2,
        selectedVersionId: 'v7',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).not.toThrow()
  })

  test('defaults selectedVersionId to null when omitted', () => {
    const result = PromptDraftSchema.parse({
      id: crypto.randomUUID(),
      intent: 'a cat',
      chips: [],
      flags: [],
      schemaVersion: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    expect(result.selectedVersionId).toBeNull()
  })
})
