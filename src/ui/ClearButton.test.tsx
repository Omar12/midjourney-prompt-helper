import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClearButton } from './ClearDialog'
import { useBuildSession } from '../state/buildSession'

describe('ClearButton / ClearDialog', () => {
  beforeEach(() => {
    useBuildSession.setState({ intent: '', chips: [] })
  })

  test('triggers confirm dialog when intent or chips are present', async () => {
    const user = userEvent.setup()
    useBuildSession.setState({ intent: 'a cat', chips: [] })
    render(<ClearButton />)
    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.getByText('Start over?')).toBeInTheDocument()
  })

  test('clearing the dialog clears state', async () => {
    const user = userEvent.setup()
    useBuildSession.setState({ intent: 'a cat', chips: [] })
    render(<ClearButton />)
    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    await user.click(screen.getByRole('button', { name: 'Clear everything' }))
    expect(useBuildSession.getState().intent).toBe('')
  })

  test('no dialog appears when builder is already empty', () => {
    render(<ClearButton />)
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled()
  })
})
