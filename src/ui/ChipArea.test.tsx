import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipArea } from './ControlsPane/ChipArea'
import { useBuildSession } from '../state/buildSession'

describe('ChipArea', () => {
  beforeEach(() => {
    useBuildSession.setState({ intent: '', chips: [] })
  })

  test('clicking the ✕ button removes the chip from the store', async () => {
    const user = userEvent.setup()
    useBuildSession.setState({
      intent: '',
      chips: [
        { id: 'chip-1', label: 'cinematic', source: 'custom', enabled: true },
      ],
    })
    render(<ChipArea />)
    await user.click(screen.getByRole('button', { name: 'Remove cinematic' }))
    expect(useBuildSession.getState().chips).toHaveLength(0)
  })

  test('✕ button has accessible aria-label "Remove [chip label]"', () => {
    useBuildSession.setState({
      intent: '',
      chips: [
        { id: 'chip-1', label: 'cinematic', source: 'custom', enabled: true },
      ],
    })
    render(<ChipArea />)
    expect(
      screen.getByRole('button', { name: 'Remove cinematic' })
    ).toBeInTheDocument()
  })

  test('renders nothing when chips array is empty', () => {
    const { container } = render(<ChipArea />)
    expect(container.firstChild).toBeNull()
  })
})
