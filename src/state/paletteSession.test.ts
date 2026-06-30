import { describe, test, expect, beforeEach } from 'vitest'
import { usePaletteSession } from './paletteSession'
import type { PaletteMap } from '../domain/ai/schema'

const mockPaletteMap: PaletteMap = {
  styleMedium: [],
  lighting: [],
  cameraLens: [],
  composition: [],
  color: [],
  mood: [],
}

const mockPaletteMap2: PaletteMap = {
  styleMedium: [{ label: 'Cinematic' }],
  lighting: [],
  cameraLens: [],
  composition: [],
  color: [],
  mood: [],
}

beforeEach(() => {
  usePaletteSession.setState({ palettes: null, isLoading: false, error: null })
})

describe('initial state', () => {
  test('palettes is null', () => {
    expect(usePaletteSession.getState().palettes).toBeNull()
  })

  test('isLoading is false', () => {
    expect(usePaletteSession.getState().isLoading).toBe(false)
  })

  test('error is null', () => {
    expect(usePaletteSession.getState().error).toBeNull()
  })
})

describe('setPalettes', () => {
  test('Test 1: setPalettes stores palettes (replace, D-07)', () => {
    usePaletteSession.getState().setPalettes(mockPaletteMap)
    expect(usePaletteSession.getState().palettes).toEqual(mockPaletteMap)
  })

  test('Test 2: setPalettes called twice — second call wins (replace, not merge)', () => {
    usePaletteSession.getState().setPalettes(mockPaletteMap)
    usePaletteSession.getState().setPalettes(mockPaletteMap2)
    expect(usePaletteSession.getState().palettes).toEqual(mockPaletteMap2)
  })

  test('Test 4: setPalettes after setError — error is cleared on success', () => {
    usePaletteSession.getState().setError({ type: 'auth', message: 'bad key' })
    usePaletteSession.getState().setPalettes(mockPaletteMap)
    expect(usePaletteSession.getState().error).toBeNull()
    expect(usePaletteSession.getState().palettes).toEqual(mockPaletteMap)
  })
})

describe('setError', () => {
  test('Test 3: setError stores error with type auth', () => {
    usePaletteSession.getState().setError({ type: 'auth', message: 'invalid key' })
    expect(usePaletteSession.getState().error?.type).toBe('auth')
  })

  test('setError(null) clears the error', () => {
    usePaletteSession.getState().setError({ type: 'network', message: 'timeout' })
    usePaletteSession.getState().setError(null)
    expect(usePaletteSession.getState().error).toBeNull()
  })
})

describe('setLoading', () => {
  test('Test 5: setLoading(true) → isLoading true; setLoading(false) → isLoading false', () => {
    usePaletteSession.getState().setLoading(true)
    expect(usePaletteSession.getState().isLoading).toBe(true)
    usePaletteSession.getState().setLoading(false)
    expect(usePaletteSession.getState().isLoading).toBe(false)
  })
})

describe('clearPalettes', () => {
  test('Test 6: clearPalettes resets palettes to null and error to null', () => {
    usePaletteSession.getState().setPalettes(mockPaletteMap)
    usePaletteSession.getState().setError({ type: 'malformed', message: 'bad' })
    usePaletteSession.getState().clearPalettes()
    expect(usePaletteSession.getState().palettes).toBeNull()
    expect(usePaletteSession.getState().error).toBeNull()
  })
})
