import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LivePreview } from './PreviewPane/LivePreview'

describe('LivePreview', () => {
  test('when intent is "a cat", the pre element contains "a cat"', () => {
    render(<LivePreview preview="a cat" />)
    expect(screen.getByText('a cat')).toBeInTheDocument()
  })

  test('when a chip "cinematic" is added, the pre element contains "a cat, cinematic"', () => {
    render(<LivePreview preview="a cat, cinematic" />)
    expect(screen.getByText('a cat, cinematic')).toBeInTheDocument()
  })

  test('shows placeholder "Your prompt will appear here…" when preview is empty', () => {
    render(<LivePreview preview="" />)
    expect(screen.getByText('Your prompt will appear here…')).toBeInTheDocument()
  })
})
