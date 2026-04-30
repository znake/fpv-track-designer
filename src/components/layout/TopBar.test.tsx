import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/store/configSlice'
import { useAppStore } from '@/store'

import { TopBar } from './TopBar'

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
    localStorage.clear()
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

  it('switches header labels to English via the language toggle', () => {
    renderTopBar()

    fireEvent.click(screen.getByRole('button', { name: 'Sprache auf Englisch umstellen' }))

    expect(screen.getByRole('button', { name: 'Switch language to German' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Start FPV flight' })).not.toBeNull()
    expect(window.localStorage.getItem('fpv-track-designer-language')).toBe('en')
  })
})
