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

  it('calls generateTrack and setTrack for both Mischen and Neue Strecke', () => {
    const trackByShuffle = createMockTrack('shuffle')
    const trackByNew = createMockTrack('new')

    const generateTrackMock = vi
      .spyOn(generator, 'generateTrack')
      .mockReturnValueOnce(trackByShuffle)
      .mockReturnValueOnce(trackByNew)

    renderPanel()

    const buttons = screen.getAllByRole('button')
    const shuffleButton = buttons[0]
    const newTrackButton = buttons[2]

    fireEvent.click(shuffleButton)
    expect(generateTrackMock).toHaveBeenCalledTimes(1)
    expect(generateTrackMock).toHaveBeenCalledWith(useAppStore.getState().config)
    expect(useAppStore.getState().currentTrack?.id).toBe('shuffle')

    fireEvent.click(newTrackButton)
    expect(generateTrackMock).toHaveBeenCalledTimes(2)
    expect(generateTrackMock).toHaveBeenNthCalledWith(2, useAppStore.getState().config)
    expect(useAppStore.getState().currentTrack?.id).toBe('new')
  })

  it('uses onNewTrackClick override for Neue Strecke and skips internal generator usage', () => {
    const onNewTrackClick = vi.fn()
    const generateTrackMock = vi.spyOn(generator, 'generateTrack')

    render(
      <TooltipProvider>
        <LeftToolPanel onNewTrackClick={onNewTrackClick} />
      </TooltipProvider>,
    )

    const buttons = screen.getAllByRole('button')
    const newTrackButton = buttons[2]

    fireEvent.click(newTrackButton)
    expect(onNewTrackClick).toHaveBeenCalledTimes(1)
    expect(generateTrackMock).not.toHaveBeenCalled()
  })
})
