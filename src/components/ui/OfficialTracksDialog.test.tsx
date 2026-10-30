import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store'
import { defaultConfig } from '@/store/configSlice'
import { listOfficialTracks } from '@/utils/officialTracks'

import { OfficialTracksDialog } from './OfficialTracksDialog'

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
    isTrackModified: false,
    pendingDestructiveAction: null,
  })
}

describe('OfficialTracksDialog', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('lists and loads the bundled official track', () => {
    const entry = listOfficialTracks().tracks[0]
    expect(entry).toBeDefined()

    render(<OfficialTracksDialog open onOpenChange={vi.fn()} />)

    // Scope to the track's own row: every export keeps its own embedded name,
    // so the row is found through the file-derived name it is listed under.
    const row = screen.getByText(entry.name).closest('li')
    expect(row?.textContent).toContain(`${entry.gateCount} Gates`)

    const loadButton = row?.querySelector('button')
    expect(loadButton).not.toBeNull()
    fireEvent.click(loadButton!)

    expect(useAppStore.getState().currentTrack?.name).toBe(entry.name)
    expect(useAppStore.getState().currentTrack?.id).toBe(`official:${entry.sourceFile}`)
  })
})
