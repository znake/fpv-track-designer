import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store'
import { THEME_PRESETS } from '../types/theme'
import { ThemeContext, useTheme } from './useTheme'

const wrapWithTheme = (themeId: keyof typeof THEME_PRESETS) => (
  ({ children }: { children: ReactNode }) => (
    <ThemeContext.Provider value={THEME_PRESETS[themeId]}>{children}</ThemeContext.Provider>
  )
)

const setStoreTheme = (themeId: keyof typeof THEME_PRESETS) => {
  useAppStore.setState((state) => ({ config: { ...state.config, theme: themeId } }))
}

describe('useTheme', () => {
  beforeEach(() => {
    setStoreTheme('minimal')
  })

  afterEach(() => {
    setStoreTheme('minimal')
  })

  it('falls back to the store theme without a provided context', () => {
    setStoreTheme('realistic')

    const { result } = renderHook(() => useTheme())

    expect(result.current).toBe(THEME_PRESETS.realistic)
  })

  it('prefers the provided context theme over the store theme', () => {
    setStoreTheme('minimal')

    const { result } = renderHook(() => useTheme(), { wrapper: wrapWithTheme('night') })

    expect(result.current).toBe(THEME_PRESETS.night)
    expect(result.current.colors.gates.standard).not.toEqual(THEME_PRESETS.minimal.colors.gates.standard)
    expect(result.current.colors.gateEmissiveIntensity).toBeGreaterThan(0)
  })

  it('follows a changed context value', () => {
    setStoreTheme('minimal')
    let activeTheme: keyof typeof THEME_PRESETS = 'night'
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeContext.Provider value={THEME_PRESETS[activeTheme]}>{children}</ThemeContext.Provider>
    )

    const { result, rerender } = renderHook(() => useTheme(), { wrapper })
    expect(result.current).toBe(THEME_PRESETS.night)

    activeTheme = 'realistic'
    rerender()

    expect(result.current).toBe(THEME_PRESETS.realistic)
  })
})
