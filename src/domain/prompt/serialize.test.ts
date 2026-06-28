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
    // Phase 2: flag emission cases
    {
      desc: 'no regression: empty flags and no version (Phase 1 behavior preserved)',
      draft: mkDraft('a cat', [], [], [], null),
      expected: 'a cat',
    },
    {
      desc: 'intent plus ar flag (no version)',
      draft: mkDraft('a cat', [], [], [{ flagId: 'ar', value: '16:9' }], null),
      expected: 'a cat --ar 16:9',
    },
    {
      desc: 'version only no intent no flags',
      draft: mkDraft('', [], [], [], 'v7'),
      expected: '--v 7',
    },
    {
      desc: 'intent plus version plus stylize flag (version first)',
      draft: mkDraft('a cat', ['cinematic'], [], [{ flagId: 'stylize', value: 250 }], 'v7'),
      expected: 'a cat, cinematic --v 7 --stylize 250',
    },
    {
      desc: 'D-04: empty flags array appends nothing to output',
      draft: mkDraft('a cat', [], [], [], null),
      expected: 'a cat',
    },
    {
      desc: 'D-06: set to default value (0) still emits flag',
      draft: mkDraft('a cat', [], [], [{ flagId: 'stylize', value: 0 }], null),
      expected: 'a cat --stylize 0',
    },
    {
      desc: 'unknown flagId omitted from output',
      draft: mkDraft('a cat', [], [], [{ flagId: 'NONEXISTENT', value: 123 }], null),
      expected: 'a cat',
    },
    {
      desc: 'flag only no intent no leading space',
      draft: mkDraft('', [], [], [{ flagId: 'ar', value: '16:9' }], null),
      expected: '--ar 16:9',
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

  // Phase 2: standalone ordering and version-specific tests
  test('version parameter emitted before ar flag in output', () => {
    const result = serialize(mkDraft('a cat', [], [], [{ flagId: 'ar', value: '16:9' }], 'v7'))
    const vPos = result.indexOf('--v 7')
    const arPos = result.indexOf('--ar')
    expect(vPos).toBeGreaterThanOrEqual(0)
    expect(arPos).toBeGreaterThanOrEqual(0)
    expect(vPos).toBeLessThan(arPos)
  })

  test('niji7 version emits --niji 7 parameter', () => {
    const result = serialize(mkDraft('', [], [], [], 'niji7'))
    expect(result).toBe('--niji 7')
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
