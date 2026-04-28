import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '@/store/configSlice'
import type { Track } from '@/types'
import { createDefaultGateOpenings } from '@/utils/gateOpenings'
import { useViewerStore } from '@/viewer-store'
import { ViewerApp } from './ViewerApp'

vi.mock('@/components/scene/Scene', () => ({
  Scene: ({ readOnly }: { readOnly?: boolean }) => (
    <div data-testid="viewer-scene" data-readonly={String(readOnly)} />
  ),
}))

const createTestTrack = (): Track => ({
  id: 'viewer-track',
  name: 'Viewer Track',
  gates: [
    {
      id: 'gate-1',
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('standard'),
    },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('ViewerApp', () => {
  beforeEach(() => {
    useViewerStore.getState().reset()
  })

  it('renders a German error state', () => {
    useViewerStore.getState().setError('Der geteilte Track-Link ist ungültig.')

    render(<ViewerApp />)

    expect(screen.getByText('Track kann nicht geladen werden')).not.toBeNull()
    expect(screen.getByText('Der geteilte Track-Link ist ungültig.')).not.toBeNull()
  })

  it('renders the scene in read-only mode without editor UI labels', () => {
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    expect(screen.getByTestId('viewer-scene').getAttribute('data-readonly')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Speichern' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Galerie' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Einstellungen' })).toBeNull()
  })
})
