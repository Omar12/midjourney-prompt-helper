import { describe, test, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyStorage } from './useKeyStorage'

const KEY = 'mj-ph-api-key'

beforeEach(() => {
  localStorage.removeItem(KEY)
})

describe('useKeyStorage', () => {
  test('saveKey writes the key to localStorage', () => {
    const { result } = renderHook(() => useKeyStorage())
    act(() => {
      result.current.saveKey('sk-test')
    })
    expect(localStorage.getItem(KEY)).toBe('sk-test')
    expect(result.current.key).toBe('sk-test')
  })

  test('clearKey removes the key from localStorage', () => {
    localStorage.setItem(KEY, 'sk-existing')
    const { result } = renderHook(() => useKeyStorage())
    act(() => {
      result.current.clearKey()
    })
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(result.current.key).toBe('')
  })

  test('hook initializes with existing localStorage value', () => {
    localStorage.setItem(KEY, 'sk-preexisting')
    const { result } = renderHook(() => useKeyStorage())
    expect(result.current.key).toBe('sk-preexisting')
  })

  test('saveKey then clearKey leaves localStorage empty and key === ""', () => {
    const { result } = renderHook(() => useKeyStorage())
    act(() => {
      result.current.saveKey('sk-temp')
    })
    act(() => {
      result.current.clearKey()
    })
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(result.current.key).toBe('')
  })
})
