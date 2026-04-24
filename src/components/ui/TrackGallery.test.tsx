import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store'
import { defaultConfig } from '@/store/configSlice'
import type { Config, Track } from '@/types'
import { createDefaultGateOpenings } from '@/utils/gateOpenings'
import { saveTrack } from '@/utils/storage'

import { TrackGallery } from './TrackGallery'

const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
})

const createTestTrack = (overrides?: Partial<Track>): Track => ({
  id: 'test-track-id',
  name: 'Test Track',
  gates: [
    {
      id: 'gate-1',
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      size: 1,
      openings: createDefaultGateOpenings('standard', 1),
    },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 20, height: 15 },
  gateSize: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

const createTestConfig = (overrides?: Partial<Config>): Config => ({
  ...defaultConfig,
  gateQuantities: { ...defaultConfig.gateQuantities },
  fieldSize: { ...defaultConfig.fieldSize },
  ...overrides,
})

function resetStore() {
  useAppStore.setState({
    config: defaultConfig,
    currentTrack: null,
    selectedGateId: null,
    selectedGateIds: [],
    isDeleteDialogOpen: false,
    isDraggingGate: false,
    past: [],
    future: [],
  })
}

describe('TrackGallery', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    resetStore()
  })

  it('refreshes saved tracks when the gallery opens', async () => {
    const { rerender } = render(
      <TrackGallery open={false} onOpenChange={vi.fn()} />,
    )

    saveTrack(createTestTrack({ id: 'track-1', name: 'Track 1' }), createTestConfig())
    saveTrack(createTestTrack({ id: 'track-2', name: 'Track 2' }), createTestConfig())

    rerender(<TrackGallery open onOpenChange={vi.fn()} />)

    expect(await screen.findByText('Track 1')).not.toBeNull()
    expect(await screen.findByText('Track 2')).not.toBeNull()
  })

  it('loads the selected track and its saved config', () => {
    const onOpenChange = vi.fn()
    const savedConfig = createTestConfig({
      fieldSize: { width: 42, height: 24 },
      gateSize: 1.5,
      showFlightPath: false,
    })

    saveTrack(
      createTestTrack({
        id: 'loaded-track',
        name: 'Loaded Track',
        fieldSize: savedConfig.fieldSize,
        gateSize: savedConfig.gateSize,
      }),
      savedConfig,
    )

    render(<TrackGallery open onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: /load/i }))

    expect(useAppStore.getState().currentTrack?.id).toBe('loaded-track')
    expect(useAppStore.getState().config.fieldSize).toEqual({ width: 42, height: 24 })
    expect(useAppStore.getState().config.gateSize).toBe(1.5)
    expect(useAppStore.getState().config.showFlightPath).toBe(false)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
