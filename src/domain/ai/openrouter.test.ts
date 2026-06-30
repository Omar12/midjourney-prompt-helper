import { describe, test, expect, vi, beforeEach } from 'vitest'
import { APICallError } from 'ai'

// Mock the 'ai' module before importing openrouter
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    generateObject: vi.fn(),
  }
})

// Mock the OpenRouter provider
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    chat: vi.fn(() => 'mock-model'),
  })),
}))

import { generateObject } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { openRouterAdapter } from './openrouter'

const mockGenerateObject = vi.mocked(generateObject)
const mockCreateOpenRouter = vi.mocked(createOpenRouter)

const validPalettes = {
  styleMedium: [{ label: 'Oil Painting', description: 'Classic media' }],
  lighting: [{ label: 'Golden Hour', description: 'Warm sunset' }],
  cameraLens: [{ label: '85mm Portrait', description: 'Flattering focal' }],
  composition: [{ label: 'Rule of Thirds', description: 'Classic framing' }],
  color: [{ label: 'Muted Earth Tones', description: 'Warm naturals' }],
  mood: [{ label: 'Ethereal', description: 'Dreamy atmosphere' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  // Re-stub createOpenRouter after clear
  mockCreateOpenRouter.mockReturnValue({ chat: vi.fn(() => 'mock-model') } as ReturnType<typeof createOpenRouter>)
})

describe('openRouterAdapter.providerId', () => {
  test('providerId is "openrouter"', () => {
    expect(openRouterAdapter.providerId).toBe('openrouter')
  })
})

describe('openRouterAdapter.generatePalettes — happy path', () => {
  test('returns {ok:true, palettes} when generateObject resolves with valid data', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: validPalettes } as Awaited<ReturnType<typeof generateObject>>)

    const result = await openRouterAdapter.generatePalettes('sunset over mountains', 'sk-test-key')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.palettes.styleMedium).toHaveLength(1)
      expect(result.palettes.lighting).toHaveLength(1)
      expect(result.palettes.mood).toHaveLength(1)
    }
  })

  test('calls generateObject with schema, system prompt, and intent as prompt', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: validPalettes } as Awaited<ReturnType<typeof generateObject>>)

    await openRouterAdapter.generatePalettes('a foggy forest', 'sk-test-key')

    expect(mockGenerateObject).toHaveBeenCalledOnce()
    const call = mockGenerateObject.mock.calls[0][0]
    expect(call.prompt).toBe('a foggy forest')
    expect(call.schema).toBeDefined()
    expect(call.system).toBeDefined()
  })

  test('calls createOpenRouter with the user key — not a module-level key (T-04-01-01)', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: validPalettes } as Awaited<ReturnType<typeof generateObject>>)

    await openRouterAdapter.generatePalettes('a neon city', 'user-provided-key-123')

    expect(mockCreateOpenRouter).toHaveBeenCalledWith({ apiKey: 'user-provided-key-123' })
  })
})

describe('openRouterAdapter.generatePalettes — empty key guard', () => {
  test('empty string key → {ok:false, error:{type:"auth"}} without calling generateObject', async () => {
    const result = await openRouterAdapter.generatePalettes('some intent', '')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('auth')
    }
    expect(mockGenerateObject).not.toHaveBeenCalled()
  })

  test('whitespace-only key → {ok:false, error:{type:"auth"}} without calling generateObject', async () => {
    const result = await openRouterAdapter.generatePalettes('some intent', '   ')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('auth')
    }
    expect(mockGenerateObject).not.toHaveBeenCalled()
  })
})

describe('openRouterAdapter.generatePalettes — all-empty result', () => {
  test('all arrays empty after resolve → {ok:false, error:{type:"malformed"}}', async () => {
    const emptyPalettes = {
      styleMedium: [],
      lighting: [],
      cameraLens: [],
      composition: [],
      color: [],
      mood: [],
    }
    mockGenerateObject.mockResolvedValueOnce({ object: emptyPalettes } as Awaited<ReturnType<typeof generateObject>>)

    const result = await openRouterAdapter.generatePalettes('some intent', 'sk-test-key')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('malformed')
    }
  })
})

describe('openRouterAdapter.generatePalettes — error paths', () => {
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

  test('generateObject throws 401 → {ok:false, error:{type:"auth"}}', async () => {
    mockGenerateObject.mockRejectedValueOnce(makeAPICallError(401))

    const result = await openRouterAdapter.generatePalettes('some intent', 'bad-key')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('auth')
    }
  })

  test('generateObject throws 429 → {ok:false, error:{type:"malformed"}}', async () => {
    mockGenerateObject.mockRejectedValueOnce(makeAPICallError(429))

    const result = await openRouterAdapter.generatePalettes('some intent', 'sk-test-key')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('malformed')
    }
  })

  test('generateObject throws network error → {ok:false, error:{type:"network"}}', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('Failed to fetch'))

    const result = await openRouterAdapter.generatePalettes('some intent', 'sk-test-key')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('network')
    }
  })
})
