import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyButton } from './PreviewPane/CopyButton'

describe('CopyButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('calls `clipboard.writeText` with the preview text', async () => {
    // userEvent.setup() initializes navigator.clipboard with a configurable stub;
    // spy on writeText after setup so our mock overrides it cleanly.
    const user = userEvent.setup()
    const spy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<CopyButton text="a cat" />)
    await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
    expect(spy).toHaveBeenCalledWith('a cat')
  })

  test('shows "Copied!" label after successful copy', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<CopyButton text="a cat" />)
    await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
  })

  test('reverts to "Copy prompt" after 2000ms', async () => {
    // Use fireEvent.click (synchronous) instead of userEvent to avoid the
    // userEvent+fake-timer+clipboard-spy deadlock. fireEvent triggers the
    // click handler directly; act() flushes the async clipboard promise.
    vi.useFakeTimers()
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<CopyButton text="a cat" />)
    fireEvent.click(screen.getByRole('button'))
    // flush the async handleCopy microtask so setCopied(true) runs
    await act(async () => {})
    expect(screen.getByRole('button')).toHaveTextContent('Copied!')
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('button')).toHaveTextContent('Copy prompt')
    vi.useRealTimers()
  })

  test('is disabled when text prop is empty string', () => {
    render(<CopyButton text="" />)
    expect(screen.getByRole('button', { name: 'Copy prompt' })).toBeDisabled()
  })
})
