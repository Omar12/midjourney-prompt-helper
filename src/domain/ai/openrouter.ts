import { generateObject, APICallError, NoObjectGeneratedError } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { PaletteAdapter, PaletteCallResult } from './adapter'
import { PaletteResponseSchema } from './schema'

// ponytail: hardcoded default; add a model picker in Settings if users need to switch.
// openai/* endpoints are never filtered by OpenRouter's data-training privacy policy
// (unlike Google/free models, which 404 "No endpoints found" when logging is disabled),
// so this is the most reliable BYO-key default for structured-output calls.
export const DEFAULT_MODEL = 'openai/gpt-4o-mini'

export const PALETTE_SYSTEM_PROMPT = `You are an expert Midjourney prompt assistant.
Given a user's creative intent, return 6-8 specific, Midjourney-compatible options for each of the six palette categories below.
Options must be concrete terms a Midjourney user would recognize (not generic adjectives).
Each option has a short label (max 30 chars) and a brief description of how it helps (max 80 chars).

Categories:
- styleMedium: artistic styles and media types (e.g. "oil painting", "cinematic", "ukiyo-e")
- lighting: lighting conditions and quality (e.g. "golden hour", "volumetric fog", "neon glow")
- cameraLens: camera and lens specs (e.g. "85mm portrait", "macro close-up", "wide angle")
- composition: compositional techniques (e.g. "rule of thirds", "bird's-eye view", "silhouette")
- color: color palettes and grading (e.g. "muted earth tones", "vibrant", "monochromatic blue")
- mood: emotional atmosphere (e.g. "ethereal", "dramatic tension", "serene and peaceful")`

// Exported for unit testing in adapter.test.ts
export function mapError(err: unknown): PaletteCallResult {
  if (APICallError.isInstance(err)) {
    const s = err.statusCode
    if (s === 401 || s === 403) {
      return { ok: false, error: { type: 'auth', message: 'Invalid or missing API key. Open settings to update it.' } }
    }
    if (s === 429) {
      return { ok: false, error: { type: 'malformed', message: 'Rate limit reached. Wait a moment and try again.' } }
    }
    if (s !== undefined && s >= 400 && s < 500) {
      // 400 etc. — request rejected (bad model id, unsupported format). Not a connectivity issue.
      return { ok: false, error: { type: 'malformed', message: 'OpenRouter rejected the request. The model may be unavailable — try again.' } }
    }
    return { ok: false, error: { type: 'network', message: 'Could not reach OpenRouter. Check your connection.' } }
  }
  if (NoObjectGeneratedError.isInstance(err)) {
    return { ok: false, error: { type: 'malformed', message: 'Model returned an unreadable response. Try again.' } }
  }
  return { ok: false, error: { type: 'network', message: 'Unexpected error. Try again.' } }
}

export const openRouterAdapter: PaletteAdapter = {
  providerId: 'openrouter',

  async generatePalettes(intent, key) {
    // T-04-01-01: key is accepted as argument, read at call time, never logged
    if (!key || !key.trim()) {
      return { ok: false, error: { type: 'auth', message: 'No API key set. Open settings to add one.' } }
    }

    // T-04-01-04: calls openrouter.ai directly — no proxy, no first-party server
    const openrouter = createOpenRouter({ apiKey: key })

    try {
      const { object } = await generateObject({
        // strict:false — the schema allows optional fields (description), which
        // OpenAI's strict json_schema rejects ("required must include every key").
        // Non-strict sends the schema as guidance; Zod does the real validation.
        model: openrouter.chat(DEFAULT_MODEL, { structuredOutputs: { strict: false } }),
        schema: PaletteResponseSchema,
        system: PALETTE_SYSTEM_PROMPT,
        prompt: intent,
      })

      // Pitfall 5: all .catch([]) fields fired silently — detect total-zero result
      const total = Object.values(object).reduce((n, arr) => n + arr.length, 0)
      if (total === 0) {
        return { ok: false, error: { type: 'malformed', message: 'No suggestions returned. Try a different intent.' } }
      }

      return { ok: true, palettes: object }
    } catch (err) {
      return mapError(err)
    }
  },
}
