import { describe, test, expect } from 'vitest'
import { serialize } from './serialize'
import type { FlagValue, PromptDraft } from './model'

/** Builds a minimal valid PromptDraft from intent and chip labels. */
function mkDraft(
  intent: string,
  chipLabels: string[],
  disabledLabels: string[] = [],
  flags: FlagValue[] = [],
  selectedVersionId: string | null = null,
): PromptDraft {
  return {
    id: crypto.randomUUID(),
    intent,
    chips: chipLabels.map((label) => ({
      id: crypto.randomUUID(),
      label,
      source: 'custom' as const,
      enabled: !disabledLabels.includes(label),
    })),
    flags,
    schemaVersion: 2,
    selectedVersionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('serialize', () => {
  // Golden-string table (D-01..D-04)
  const goldenCases = [
    {
      desc: 'intent only',
      draft: mkDraft('a cat', []),
      expected: 'a cat',
    },
    {
      desc: 'intent + 1 chip',
      draft: mkDraft('a cat', ['cinematic']),
      expected: 'a cat, cinematic',
    },
    {
      desc: 'intent + 2 chips',
      draft: mkDraft('a cat', ['cinematic', 'hazy']),
      expected: 'a cat, cinematic, hazy',
    },
    {
      desc: 'empty intent with chip',
      draft: mkDraft('', ['cinematic']),
      expected: 'cinematic',
    },
    {
      desc: 'all empty',
      draft: mkDraft('', []),
      expected: '',
    },
    {
      desc: 'disabled chip skipped',
      draft: mkDraft('a cat', ['skip', 'cinematic'], ['skip']),
      expected: 'a cat, cinematic',
    },
    {
      desc: 'intent with user commas preserved (D-03 opaque block)',
      draft: mkDraft('cats, dogs', []),
      expected: 'cats, dogs',
    },
  ]

  test.each(goldenCases)('$desc', ({ draft, expected }) => {
    expect(serialize(draft)).toBe(expected)
  })

  test('intent first then chips joined by `, `', () => {
    expect(serialize(mkDraft('a cat', ['cinematic', 'hazy']))).toBe(
      'a cat, cinematic, hazy',
    )
  })

  test('same input produces same output (deterministic)', () => {
    const draft = mkDraft('a cat', ['cinematic'])
    expect(serialize(draft)).toBe(serialize(draft))
  })

  test('disabled chips are skipped', () => {
    const draft = mkDraft('a cat', ['skip', 'cinematic'], ['skip'])
    expect(serialize(draft)).toBe('a cat, cinematic')
  })

  test('empty draft produces empty string', () => {
    expect(serialize(mkDraft('', []))).toBe('')
  })

  test('intent with user commas is preserved as-is (opaque block, D-03)', () => {
    expect(serialize(mkDraft('cats, dogs', []))).toBe('cats, dogs')
  })

  test('enabled chip whose label trims to empty is excluded from output', () => {
    // A chip with only whitespace sanitizes to '' after trim — should not appear in output
    const draft: PromptDraft = {
      id: crypto.randomUUID(),
      intent: 'a cat',
      chips: [{ id: crypto.randomUUID(), label: '   ', source: 'custom', enabled: true }],
      flags: [],
      schemaVersion: 2,
      selectedVersionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    expect(serialize(draft)).toBe('a cat')
  })
})
