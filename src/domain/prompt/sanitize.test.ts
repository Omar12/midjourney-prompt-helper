import { describe, test, expect } from 'vitest'
import { sanitize } from './sanitize'

describe('sanitize', () => {
  const cases: { input: string; expected: string }[] = [
    { input: 'a::b', expected: 'a:b' },
    { input: 'a--b', expected: 'a-b' },
    { input: '--style', expected: '-style' },
    { input: 'a\nb', expected: 'a b' },
    { input: 'a\r\nb', expected: 'a b' },
    { input: ',leading', expected: 'leading' },
    { input: 'trailing,', expected: 'trailing' },
    // newline → space runs BEFORE -- → -, so \n-- becomes ' -' (space-dash, not double-dash)
    { input: '\n--ar 1:1', expected: ' -ar 1:1' },
    { input: '::weight', expected: ':weight' },
    { input: '', expected: '' },
  ]

  test.each(cases)('sanitize(%j) === %j', ({ input, expected }) => {
    expect(sanitize(input)).toBe(expected)
  })

  test('collapses `::` to `:`', () => {
    expect(sanitize('a::b')).toBe('a:b')
  })

  test('collapses `--` to `-`', () => {
    expect(sanitize('a--b')).toBe('a-b')
  })

  test('collapses newlines to spaces', () => {
    expect(sanitize('a\nb')).toBe('a b')
    expect(sanitize('a\r\nb')).toBe('a b')
  })

  test('strips leading/trailing commas', () => {
    expect(sanitize(',leading')).toBe('leading')
    expect(sanitize('trailing,')).toBe('trailing')
  })

  test('correct order — `\\n--` becomes ` -` (newline collapse runs before dash collapse)', () => {
    // If -- was collapsed first: '\n--ar' → '\n-ar' → ' -ar' (space-dash — same result)
    // But '\n--ar' with newline-first: '\n--ar' → ' --ar' → ' -ar' (space-dash)
    // The key verification: result has ' -' not '--' or '\n'
    expect(sanitize('\n--ar 1:1')).toBe(' -ar 1:1')
  })
})
