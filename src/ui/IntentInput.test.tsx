import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntentInput } from './ControlsPane/IntentInput'
import { useBuildSession } from '../state/buildSession'

describe('IntentInput', () => {
  beforeEach(() => {
    useBuildSession.setState({ intent: '', chips: [] })
  })

  test('renders a textarea with label "Describe your image"', () => {
    render(<IntentInput />)
    expect(screen.getByLabelText('Describe your image')).toBeInTheDocument()
  })

  test('typing into the textarea calls setIntent with the new value', async () => {
    const user = userEvent.setup()
    render(<IntentInput />)
    const textarea = screen.getByLabelText('Describe your image')
    await user.type(textarea, 'a cat')
    expect(useBuildSession.getState().intent).toBe('a cat')
  })
})
