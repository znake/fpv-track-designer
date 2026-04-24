import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/store/configSlice'
import * as generator from '@/utils/generator'
import type { Track } from '@/types'
import { createDefaultGateOpenings } from '@/utils/gateOpenings'

import { LeftToolPanel } from './LeftToolPanel'

const resetStore = () => {
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

const createMockTrack = (id: string): Track => ({
  id,
  name: `Track ${id}`,
  gates: [
    {
      id: `${id}-gate`,
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      size: 1,
      openings: createDefaultGateOpenings('standard', 1),
    },
  ],
  gateSequence: [{ gateId: `${id}-gate`, openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  gateSize: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

const renderPanel = () =>
  render(
    <TooltipProvider>
      <LeftToolPanel />
    </TooltipProvider>,
  )

describe('LeftToolPanel', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('calls generateTrack and setTrack from Mischen', () => {
    const trackByShuffle = createMockTrack('shuffle')

    const generateTrackMock = vi
      .spyOn(generator, 'generateTrack')
      .mockReturnValueOnce(trackByShuffle)

    renderPanel()

    const shuffleButton = screen.getByRole('button', { name: 'Mischen' })

    fireEvent.click(shuffleButton)
    expect(generateTrackMock).toHaveBeenCalledTimes(1)
    expect(generateTrackMock).toHaveBeenCalledWith(useAppStore.getState().config)
    expect(useAppStore.getState().currentTrack?.id).toBe('shuffle')
  })

  it('renders Galerie below Speichern and Einstellungen as the fourth icon', () => {
    renderPanel()

    const buttonNames = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))

    expect(buttonNames).toEqual(['Mischen', 'Speichern', 'Galerie', 'Einstellungen'])
    expect(screen.queryByRole('button', { name: 'Neue Strecke' })).toBeNull()
  })
})
