import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/store'
import { defaultConfig } from '@/store/configSlice'

import { ThemeConfigPanel } from './ThemeConfigPanel'

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

describe('ThemeConfigPanel', () => {
  beforeEach(() => {
    resetStore()
  })

  it('updates the active theme when a theme option is selected', () => {
    render(<ThemeConfigPanel />)

    fireEvent.click(screen.getByRole('button', { name: /Nacht/i }))

    expect(useAppStore.getState().config.theme).toBe('night')
  })

it('offers the Solarized minimal theme variants', () => {
  render(<ThemeConfigPanel />)

  expect(screen.getByRole('button', { name: /Minimal Standard/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Minimal Solarized Light/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Minimal Solarized Dark/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Minimal Catppuccin Mocha/i })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: /Minimal Solarized Dark/i }))

  expect(useAppStore.getState().config.theme).toBe('minimal-solarized-dark')
})

it('offers the Catppuccin minimal theme variant', () => {
  render(<ThemeConfigPanel />)

  fireEvent.click(screen.getByRole('button', { name: /Minimal Catppuccin Mocha/i }))

  expect(useAppStore.getState().config.theme).toBe('minimal-catppuccin-mocha')
})
})
