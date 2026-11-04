import { createContext, useContext } from 'react'
import { useAppStore } from '../store'
import type { ThemeConfig } from '../types'
import { getThemeConfig } from '../utils/themeColors'

/**
 * Resolved theme override for the current scene subtree.
 *
 * `null` means "no override": `useTheme()` falls back to the editor store's
 * `config.theme`. `Scene` provides its already resolved theme inside the R3F
 * canvas, which is how the read-only viewer's `configOverride` reaches the
 * gate components and every other `useTheme()` consumer.
 */
export const ThemeContext = createContext<ThemeConfig | null>(null)

/**
 * React hook that returns the active ThemeConfig: an explicitly provided
 * context theme first, otherwise the `config.theme` value in Zustand state.
 */
export function useTheme(): ThemeConfig {
  const providedTheme = useContext(ThemeContext)
  const themeId = useAppStore((s) => s.config.theme)
  return providedTheme ?? getThemeConfig(themeId)
}
