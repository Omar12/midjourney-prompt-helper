/**
 * Sanitize a user-supplied or AI-supplied string so it cannot inject
 * Midjourney syntax tokens into the assembled prompt.
 *
 * This is the SINGLE chokepoint — every string entering the serializer
 * must pass through here (D-08). Phase 4 AI-supplied content routes through
 * the same function.
 *
 * Operation order (order matters — see Pitfall 3 in RESEARCH.md):
 * 1. Newlines → space (before special-char ops, to avoid \n-- patterns)
 * 2. :: → : (MJ multi-prompt weight separator)
 * 3. -- → - (MJ parameter prefix; runs AFTER newline collapse)
 * 4. Strip leading commas
 * 5. Strip trailing commas
 */
export function sanitize(text: string): string {
  return text
    .replace(/\r\n|\r|\n/g, ' ') // 1. all newline variants → single space
    .replace(/::/g, ':') // 2. double-colon → colon
    .replace(/--/g, '-') // 3. double-dash → dash
    .replace(/^,+/, '') // 4. strip leading commas
    .replace(/,+$/, '') // 5. strip trailing commas
}
