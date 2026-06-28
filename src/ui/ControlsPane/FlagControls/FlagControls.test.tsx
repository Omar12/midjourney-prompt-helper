import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlagControls } from './FlagControls'
import { useBuildSession } from '@/state/buildSession'
import { FLAG_DEFINITIONS } from '@/domain/flags'

// Mock the domain/flags module so we can control getFlagsForVersion output in FLG-04 tests.
vi.mock('@/domain/flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/domain/flags')>()),
  getFlagsForVersion: vi.fn(),
}))

import { getFlagsForVersion } from '@/domain/flags'

describe('FlagControls', () => {
  beforeEach(() => {
    // Full store reset before each test — mirrors ChipArea.test.tsx pattern.
    useBuildSession.setState({
      intent: '',
      chips: [],
      selectedVersionId: null,
      flagValues: {},
      setFlags: {},
    })
    // Default: return all flags (real behavior) so tests that don't override the mock still work.
    vi.mocked(getFlagsForVersion).mockImplementation((versionId) => {
      if (versionId === null) return FLAG_DEFINITIONS
      const found = FLAG_DEFINITIONS
      return found
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('renders Flags section heading', () => {
    render(<FlagControls />)
    expect(screen.getByText('Flags')).toBeInTheDocument()
  })

  test('renders all 5 flag controls when no version is selected', () => {
    // No version set — getFlagsForVersion(null) returns all FLAG_DEFINITIONS.
    vi.mocked(getFlagsForVersion).mockReturnValue(FLAG_DEFINITIONS)
    render(<FlagControls />)
    // Each label comes from FLAG_DEFINITIONS entries.
    expect(screen.getByText('Version')).toBeInTheDocument()
    expect(screen.getByText('Aspect Ratio')).toBeInTheDocument()
    expect(screen.getByText('Stylize')).toBeInTheDocument()
    expect(screen.getByText('Chaos')).toBeInTheDocument()
    expect(screen.getByText('Seed')).toBeInTheDocument()
    expect(screen.getByText('Exclude (--no)')).toBeInTheDocument()
  })

  test('version switch hides unsupported flag control from the DOM (FLG-04)', () => {
    // Simulate a version that does NOT support 'seed'.
    const defsWithoutSeed = FLAG_DEFINITIONS.filter((d) => d.id !== 'seed')

    useBuildSession.setState({ selectedVersionId: 'test-no-seed' })
    vi.mocked(getFlagsForVersion).mockReturnValue(defsWithoutSeed)

    const { unmount } = render(<FlagControls />)

    // Seed control must be absent from the DOM.
    expect(screen.queryByText('Seed')).toBeNull()

    // Retained controls must still be present.
    expect(screen.getByText('Aspect Ratio')).toBeInTheDocument()
    expect(screen.getByText('Stylize')).toBeInTheDocument()
    expect(screen.getByText('Chaos')).toBeInTheDocument()
    expect(screen.getByText('Exclude (--no)')).toBeInTheDocument()

    unmount()

    // Prove the loop is driven by getFlagsForVersion output: reset mock to all defs,
    // re-render, and assert Seed IS now present.
    vi.mocked(getFlagsForVersion).mockReturnValue(FLAG_DEFINITIONS)
    render(<FlagControls />)
    expect(screen.getByText('Seed')).toBeInTheDocument()
  })

  test('clearAll resets flags and version to initial state', () => {
    const { setFlag, setVersion, clearAll } = useBuildSession.getState()

    // Set some flag state and a version.
    setFlag('stylize', 250)
    setVersion('v7')

    // Verify state was set.
    expect(useBuildSession.getState().setFlags['stylize']).toBe(true)
    expect(useBuildSession.getState().selectedVersionId).toBe('v7')

    // clearAll should reset everything.
    clearAll()

    expect(useBuildSession.getState().selectedVersionId).toBeNull()
    expect(useBuildSession.getState().setFlags['stylize']).toBeFalsy()
    expect(useBuildSession.getState().flagValues).toEqual({})
  })
})
