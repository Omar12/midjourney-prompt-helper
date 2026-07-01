import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TextFlagControl } from './TextFlagControl'
import { FLAG_DEFINITIONS } from '@/domain/flags'

// Use the real 'no' (--no exclusion) flag definition so control.type is genuinely 'text'.
// This is the field the T-02-01 threat targets: raw MJ flag syntax (e.g. "--stylize 999")
// typed here must be neutralized by sanitize() on commit before it reaches the store.
const rawNoDef = FLAG_DEFINITIONS.find((d) => d.id === 'no')!
// Narrow control to the 'text' shape the component's props require.
const noDef = rawNoDef as typeof rawNoDef & { control: { type: 'text'; placeholder?: string; maxLength?: number } }

function renderControl(overrides: Partial<{ value: string; isSet: boolean }> = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <TextFlagControl
      def={noDef}
      value={overrides.value ?? ''}
      isSet={overrides.isSet ?? false}
      onChange={onChange}
      onClear={onClear}
    />,
  )
  const input = screen.getByPlaceholderText('trees, text, watermark') as HTMLInputElement
  return { input, onChange, onClear }
}

describe('TextFlagControl — T-02-01 injection guard routing', () => {
  test('commit on blur routes value through sanitize() — collapses `--` to `-` before onChange', () => {
    const { input, onChange, onClear } = renderControl()

    // Attempt MJ flag injection via the exclusion field.
    fireEvent.change(input, { target: { value: 'cat --stylize 999' } })
    fireEvent.blur(input)

    // onChange must receive the SANITIZED value: `--` collapsed to `-`, never the raw input.
    // This assertion fails if the sanitize() call in commit() is removed (regression guard).
    expect(onChange).toHaveBeenCalledTimes(1)
    const committed = onChange.mock.calls[0][0]
    expect(committed).not.toContain('--')
    expect(committed).toBe('cat -stylize 999')
    expect(onClear).not.toHaveBeenCalled()
  })

  test('commit on blur with whitespace-only input clears instead of setting', () => {
    const { input, onChange, onClear } = renderControl()

    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.blur(input)

    // Sanitizes/trims to empty → onClear fires, onChange must NOT.
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  test('commit on Enter keydown routes through the same sanitize() path', () => {
    const { input, onChange, onClear } = renderControl()

    fireEvent.change(input, { target: { value: 'text--watermark' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledTimes(1)
    const committed = onChange.mock.calls[0][0]
    expect(committed).not.toContain('--')
    expect(committed).toBe('text-watermark')
    expect(onClear).not.toHaveBeenCalled()
  })
})
