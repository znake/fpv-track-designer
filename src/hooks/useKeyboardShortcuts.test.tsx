import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store'
import { defaultConfig } from '@/store/configSlice'

import { useKeyboardShortcuts } from './useKeyboardShortcuts'

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

const ShortcutHarness = ({
  onNewTrack,
  onShuffle,
}: {
  onNewTrack?: () => void
  onShuffle?: () => void
}) => {
  useKeyboardShortcuts({
    onNewTrack,
    onShuffle,
  })

  return null
}

describe('useKeyboardShortcuts', () => {
  it('dispatches neu via Ctrl+N and shuffle via R', () => {
    const onNewTrack = vi.fn()
    const onShuffle = vi.fn()

    resetStore()

    render(<ShortcutHarness onNewTrack={onNewTrack} onShuffle={onShuffle} />)

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(onNewTrack).toHaveBeenCalledTimes(1)
    expect(onShuffle).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'r' })
    expect(onShuffle).toHaveBeenCalledTimes(1)
    expect(onNewTrack).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'R' })
    expect(onShuffle).toHaveBeenCalledTimes(2)
    expect(onNewTrack).toHaveBeenCalledTimes(1)
  })
})
