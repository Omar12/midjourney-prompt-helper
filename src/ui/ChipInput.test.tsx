import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipInput } from './ControlsPane/ChipInput'
import { useBuildSession } from '../state/buildSession'

describe('ChipInput', () => {
  beforeEach(() => {
    useBuildSession.setState({ intent: '', chips: [] })
  })

  test('typing a label and clicking "Add keyword" creates a chip in the store', async () => {
    const user = userEvent.setup()
    render(<ChipInput />)
    await user.type(screen.getByLabelText('Add a style keyword'), 'cinematic')
    await user.click(screen.getByRole('button', { name: 'Add keyword' }))
    const chips = useBuildSession.getState().chips
    expect(chips).toHaveLength(1)
    expect(chips[0].label).toBe('cinematic')
  })

  test('input is cleared after a successful add', async () => {
    const user = userEvent.setup()
    render(<ChipInput />)
    const input = screen.getByLabelText('Add a style keyword')
    await user.type(input, 'cinematic')
    await user.click(screen.getByRole('button', { name: 'Add keyword' }))
    expect(input).toHaveValue('')
  })

  test('duplicate label is silently ignored — no second chip appears', async () => {
    const user = userEvent.setup()
    useBuildSession.setState({
      intent: '',
      chips: [
        { id: 'existing-id', label: 'cinematic', source: 'custom', enabled: true },
      ],
    })
    render(<ChipInput />)
    await user.type(screen.getByLabelText('Add a style keyword'), 'cinematic')
    await user.click(screen.getByRole('button', { name: 'Add keyword' }))
    expect(useBuildSession.getState().chips).toHaveLength(1)
  })

  test('"Add keyword" button is disabled when the input is empty', () => {
    render(<ChipInput />)
    expect(screen.getByRole('button', { name: 'Add keyword' })).toBeDisabled()
  })
})
