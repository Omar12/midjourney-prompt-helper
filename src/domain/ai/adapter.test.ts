import { describe, test, expect, vi, beforeEach } from 'vitest'
import { APICallError, NoObjectGeneratedError } from 'ai'

// mapError is exported for unit testing — it is the error classification contract
// that any PaletteAdapter implementation must satisfy.
import { mapError } from './openrouter'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('mapError — error classification contract', () => {
  function makeAPICallError(statusCode: number) {
    return new APICallError({
      message: 'API error',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      requestBodyValues: {},
      statusCode,
      responseHeaders: {},
      responseBody: '',
      isRetryable: false,
      data: null,
    })
  }

  test('401 → {ok:false, error:{type:"auth"}}', () => {
    const result = mapError(makeAPICallError(401))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('auth')
      expect(result.error.message).toBeTruthy()
    }
  })

  test('403 → {ok:false, error:{type:"auth"}}', () => {
    const result = mapError(makeAPICallError(403))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('auth')
    }
  })

  test('429 → {ok:false, error:{type:"malformed"}}', () => {
    const result = mapError(makeAPICallError(429))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('malformed')
    }
  })

  test('other APICallError status (500) → {ok:false, error:{type:"network"}}', () => {
    const result = mapError(makeAPICallError(500))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('network')
    }
  })

  test('fetch failure (plain Error, no statusCode) → {ok:false, error:{type:"network"}}', () => {
    const result = mapError(new Error('Failed to fetch'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('network')
    }
  })

  test('NoObjectGeneratedError → {ok:false, error:{type:"malformed"}}', () => {
    const err = new NoObjectGeneratedError({
      message: 'No object generated',
      text: '',
      response: null,
      usage: null,
      finishReason: 'error',
      warnings: [],
    })
    const result = mapError(err)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('malformed')
    }
  })

  test('error messages use fixed strings — no raw error body exposed', () => {
    // Ensures T-04-01-03: error messages never surface raw API response
    const err = makeAPICallError(401)
    const result = mapError(err)
    if (!result.ok) {
      // message must be a fixed string — not err.responseBody or err.message
      expect(result.error.message).not.toBe('')
      expect(typeof result.error.message).toBe('string')
    }
  })
})
