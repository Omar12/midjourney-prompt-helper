import { VERSION_DEFINITIONS } from './versions'
import { FLAG_DEFINITIONS } from './definitions'
import type { FlagDefinition } from './schema'

const AR_PATTERN = /^\d+:\d+$/

/**
 * Return flag definitions supported by a given version ID.
 * - null → return all flags (no version set = show all)
 * - unknown id → return all flags (graceful fallback)
 */
export function getFlagsForVersion(versionId: string | null): FlagDefinition[] {
  if (versionId === null) return FLAG_DEFINITIONS
  const version = VERSION_DEFINITIONS.find((v) => v.id === versionId)
  if (!version) return FLAG_DEFINITIONS
  return FLAG_DEFINITIONS.filter((f) => version.supportedFlagIds.includes(f.id))
}

/**
 * Serialize a single flag value to its MJ syntax fragment (e.g. '--stylize 250').
 * Returns null if the flag id is unknown or the value is null/undefined/empty string.
 * Note: value=0 is valid and serializes (D-06: no silent auto-omit by value).
 */
export function serializeFlag(flagId: string, value: unknown): string | null {
  const def = FLAG_DEFINITIONS.find((f) => f.id === flagId)
  if (!def) return null
  if (value === null || value === undefined || value === '') return null
  return `${def.paramName} ${String(value)}`
}

/**
 * Get the version parameter string for a version ID (e.g. '--v 7').
 * Returns null for unknown version IDs.
 */
export function getVersionParameter(versionId: string): string | null {
  const version = VERSION_DEFINITIONS.find((v) => v.id === versionId)
  return version?.parameter ?? null
}

/**
 * Validate a custom aspect ratio input string.
 * Returns the trimmed valid ratio string, or null if invalid.
 * Valid format: W:H where W and H are positive integers (e.g. '16:9', '1920:1080').
 * Rejects: zero components, decimals, negative numbers, injection attempts.
 */
export function validateAspectRatio(input: string): string | null {
  const trimmed = input.trim()
  if (!AR_PATTERN.test(trimmed)) return null
  const parts = trimmed.split(':')
  const w = Number(parts[0])
  const h = Number(parts[1])
  if (w === 0 || h === 0 || isNaN(w) || isNaN(h)) return null
  return trimmed
}
