import { describe, test, expect, beforeEach } from 'vitest'
import { useBuildSession } from './buildSession'

beforeEach(() => {
  useBuildSession.setState({
    intent: '',
    chips: [],
    selectedVersionId: null,
    flagValues: {},
    setFlags: {},
  })
})

describe('initial state', () => {
  test('selectedVersionId is null', () => {
    expect(useBuildSession.getState().selectedVersionId).toBeNull()
  })

  test('flagValues is empty object', () => {
    expect(useBuildSession.getState().flagValues).toEqual({})
  })

  test('setFlags is empty object', () => {
    expect(useBuildSession.getState().setFlags).toEqual({})
  })
})

describe('setVersion', () => {
  test('setVersion("v7") stores selectedVersionId === "v7"', () => {
    useBuildSession.getState().setVersion('v7')
    expect(useBuildSession.getState().selectedVersionId).toBe('v7')
  })

  test('setVersion(null) stores selectedVersionId === null', () => {
    useBuildSession.getState().setVersion('v7')
    useBuildSession.getState().setVersion(null)
    expect(useBuildSession.getState().selectedVersionId).toBeNull()
  })

  test('setVersion updates replace the previous value', () => {
    useBuildSession.getState().setVersion('v6.1')
    useBuildSession.getState().setVersion('v7')
    expect(useBuildSession.getState().selectedVersionId).toBe('v7')
  })
})

describe('setFlag', () => {
  test('setFlag("stylize", 250) stores flagValues.stylize === 250 and setFlags.stylize === true', () => {
    useBuildSession.getState().setFlag('stylize', 250)
    expect(useBuildSession.getState().flagValues.stylize).toBe(250)
    expect(useBuildSession.getState().setFlags.stylize).toBe(true)
  })

  test('setFlag("chaos", 0) stores 0 (zero is a valid set value — D-06)', () => {
    useBuildSession.getState().setFlag('chaos', 0)
    expect(useBuildSession.getState().flagValues.chaos).toBe(0)
    expect(useBuildSession.getState().setFlags.chaos).toBe(true)
  })

  test('setFlag twice with different values — latest value wins', () => {
    useBuildSession.getState().setFlag('stylize', 100)
    useBuildSession.getState().setFlag('stylize', 500)
    expect(useBuildSession.getState().flagValues.stylize).toBe(500)
    expect(useBuildSession.getState().setFlags.stylize).toBe(true)
  })

  test('setting one flag does not affect another', () => {
    useBuildSession.getState().setFlag('stylize', 250)
    useBuildSession.getState().setFlag('chaos', 10)
    expect(useBuildSession.getState().flagValues.stylize).toBe(250)
    expect(useBuildSession.getState().setFlags.stylize).toBe(true)
    expect(useBuildSession.getState().flagValues.chaos).toBe(10)
    expect(useBuildSession.getState().setFlags.chaos).toBe(true)
  })
})

describe('unsetFlag', () => {
  test('unsetFlag sets setFlags[flagId] === false but preserves flagValues (D-05 hide-but-retain)', () => {
    useBuildSession.getState().setFlag('stylize', 250)
    useBuildSession.getState().unsetFlag('stylize')
    expect(useBuildSession.getState().setFlags.stylize).toBe(false)
    expect(useBuildSession.getState().flagValues.stylize).toBe(250)
  })

  test('unsetFlag does not affect other flags', () => {
    useBuildSession.getState().setFlag('stylize', 250)
    useBuildSession.getState().setFlag('chaos', 10)
    useBuildSession.getState().unsetFlag('stylize')
    expect(useBuildSession.getState().setFlags.chaos).toBe(true)
    expect(useBuildSession.getState().flagValues.chaos).toBe(10)
  })
})

describe('clearAll', () => {
  test('clearAll resets intent to empty string', () => {
    useBuildSession.getState().setIntent('my intent')
    useBuildSession.getState().clearAll()
    expect(useBuildSession.getState().intent).toBe('')
  })

  test('clearAll resets chips to empty array', () => {
    useBuildSession.getState().addChip('cinematic')
    useBuildSession.getState().clearAll()
    expect(useBuildSession.getState().chips).toEqual([])
  })

  test('clearAll resets selectedVersionId to null', () => {
    useBuildSession.getState().setVersion('v7')
    useBuildSession.getState().clearAll()
    expect(useBuildSession.getState().selectedVersionId).toBeNull()
  })

  test('clearAll resets flagValues to empty object', () => {
    useBuildSession.getState().setFlag('stylize', 250)
    useBuildSession.getState().clearAll()
    expect(useBuildSession.getState().flagValues).toEqual({})
  })

  test('clearAll resets setFlags to empty object', () => {
    useBuildSession.getState().setFlag('stylize', 250)
    useBuildSession.getState().clearAll()
    expect(useBuildSession.getState().setFlags).toEqual({})
  })

  test('clearAll after setVersion + setFlag resets all fields', () => {
    useBuildSession.getState().setVersion('v7')
    useBuildSession.getState().setFlag('stylize', 250)
    useBuildSession.getState().setFlag('chaos', 10)
    useBuildSession.getState().clearAll()
    const state = useBuildSession.getState()
    expect(state.intent).toBe('')
    expect(state.chips).toEqual([])
    expect(state.selectedVersionId).toBeNull()
    expect(state.flagValues).toEqual({})
    expect(state.setFlags).toEqual({})
  })
})

describe('addPaletteChip', () => {
  test('addPaletteChip adds chip with source:"palette" and paletteCategory', () => {
    useBuildSession.getState().addPaletteChip('Cinematic', 'styleMedium')
    const { chips } = useBuildSession.getState()
    expect(chips).toHaveLength(1)
    expect(chips[0]).toMatchObject({
      label: 'Cinematic',
      source: 'palette',
      paletteCategory: 'styleMedium',
      enabled: true,
    })
  })

  test('addPaletteChip deduplicates by sanitized label — same label twice results in one chip', () => {
    useBuildSession.getState().addPaletteChip('Cinematic', 'styleMedium')
    useBuildSession.getState().addPaletteChip('Cinematic', 'styleMedium')
    expect(useBuildSession.getState().chips).toHaveLength(1)
  })

  test('addPaletteChip sanitizes label before storing (strips -- injection)', () => {
    useBuildSession.getState().addPaletteChip('unsafe--label', 'camera')
    const { chips } = useBuildSession.getState()
    expect(chips).toHaveLength(1)
    expect(chips[0].label).toBe('unsafe-label')
    expect(chips[0].label).not.toContain('--')
  })

  test('addPaletteChip with empty or whitespace label leaves chips unchanged', () => {
    useBuildSession.getState().addPaletteChip('', 'styleMedium')
    useBuildSession.getState().addPaletteChip('   ', 'styleMedium')
    expect(useBuildSession.getState().chips).toHaveLength(0)
  })

  test('addChip still adds chip with source:"custom" (existing behavior unchanged)', () => {
    useBuildSession.getState().addChip('cinematic')
    const { chips } = useBuildSession.getState()
    expect(chips).toHaveLength(1)
    expect(chips[0].source).toBe('custom')
  })
})
