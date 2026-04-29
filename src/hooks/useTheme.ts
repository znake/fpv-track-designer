import { useAppStore } from '../store'
import { getThemeConfig } from '../utils/themeColors'

/**
 * React hook that returns the active ThemeConfig based
 * on the current `config.theme` value in Zustand state.
 */
export function useTheme() {
  const themeId = useAppStore((s) => s.config.theme)
  return getThemeConfig(themeId)
}
