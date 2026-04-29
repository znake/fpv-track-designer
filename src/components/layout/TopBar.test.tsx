import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/store/configSlice'
import { useAppStore } from '@/store'

import { TopBar } from './TopBar'

const resetStore = () => {
  useAppStore.setState({
    config: defaultConfig,
    currentTrack: null,
    past: [],
    future: [],
  })
}

const renderTopBar = ({
  fpvModeActive = false,
  fpvDisabled = false,
  onFpvToggle = vi.fn<() => void>(),
} = {}) => {
  const onShortcutsClick = vi.fn<() => void>()

  render(
    <TooltipProvider>
      <TopBar
        onShortcutsClick={onShortcutsClick}
        fpvModeActive={fpvModeActive}
        fpvDisabled={fpvDisabled}
        onFpvToggle={onFpvToggle}
      />
    </TooltipProvider>,
  )

  return { onFpvToggle, onShortcutsClick }
}

describe('TopBar', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('renders a mobile FPV play button that toggles fly-through mode', () => {
    const onFpvToggle = vi.fn<() => void>()

    renderTopBar({ onFpvToggle })

    const mobileFpvButton = screen.getByRole('button', { name: 'FPV-Flug starten' })
    expect(mobileFpvButton.className).toContain('md:hidden')

    fireEvent.click(mobileFpvButton)

    expect(onFpvToggle).toHaveBeenCalledTimes(1)
  })

  it('shows the mobile FPV stop state when fly-through mode is active', () => {
    renderTopBar({ fpvModeActive: true })

    const mobileFpvButton = screen.getByRole('button', { name: 'FPV-Flug stoppen' })
    expect(mobileFpvButton.className).toContain('md:hidden')
  })
})
