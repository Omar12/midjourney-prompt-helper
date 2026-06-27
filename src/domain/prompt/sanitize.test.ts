import { describe, test } from 'vitest'

describe('sanitize', () => {
  test.todo('collapses `::` to `:`')
  test.todo('collapses `--` to `-`')
  test.todo('collapses newlines to spaces')
  test.todo('strips leading/trailing commas')
  test.todo('correct order — `\\n--` becomes ` -` (newline collapse runs before dash collapse)')
})
