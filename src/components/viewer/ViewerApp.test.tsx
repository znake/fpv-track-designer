import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '@/store/configSlice'
import type { Track } from '@/types'
import { createDefaultGateOpenings } from '@/utils/gateOpenings'
import { useViewerStore } from '@/viewer-store'
import { ViewerApp } from './ViewerApp'

const createObjectURL = vi.fn<(_: Blob | MediaSource) => string>(() => 'blob:viewer-track')
const revokeObjectURL = vi.fn<(_: string) => void>()
const anchorClick = vi.fn<() => void>()

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
    document.cookie = 'fpv-track-viewer-help-seen=; max-age=0; path=/'
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    anchorClick.mockClear()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    HTMLAnchorElement.prototype.click = anchorClick
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
    expect(screen.getByRole('button', { name: 'Track als JSON herunterladen' })).not.toBeNull()
  })

  it('downloads the viewed track as importable JSON', async () => {
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    fireEvent.click(screen.getByRole('button', { name: 'Track als JSON herunterladen' }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    if (!(blob instanceof Blob)) throw new Error('Expected JSON export to create a Blob')
    expect(await blob.text()).toContain('Viewer Track')
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:viewer-track')
  })

  it('shows viewer help on first valid track load', async () => {
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    await waitFor(() => expect(screen.getByText('Viewer-Hilfe')).not.toBeNull())
    expect(screen.getByText('Linke Maustaste gedrückt halten und ziehen')).not.toBeNull()
    expect(screen.getByText('Rechte Maustaste ziehen oder Space + linke Maustaste ziehen')).not.toBeNull()
  })

  it('does not show viewer help automatically after the first visit', async () => {
    document.cookie = 'fpv-track-viewer-help-seen=true; path=/'
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    await waitFor(() => expect(screen.queryByText('Viewer-Hilfe')).toBeNull())
    expect(screen.getByRole('button', { name: 'Viewer-Hilfe öffnen' })).not.toBeNull()
  })

  it('opens viewer help from the help button', async () => {
    document.cookie = 'fpv-track-viewer-help-seen=true; path=/'
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    fireEvent.click(screen.getByRole('button', { name: 'Viewer-Hilfe öffnen' }))

    expect(await screen.findByText('Viewer-Hilfe')).not.toBeNull()
  })
})
