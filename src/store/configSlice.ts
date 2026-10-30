import type { StateCreator } from 'zustand'
import type { Config, GateType, SnapGridSize, ThemeId, VenueId } from '../types'
import { getVenuePreset } from '../utils/venuePresets'
import { readStoredVenueId, writeStoredVenueId } from '../utils/venuePreference'

export interface ConfigSlice {
  config: Config
  /** Editor-only view toggle for the tinywhoop race; never serialized with the track. */
  showDrones: boolean
  setShowDrones: (value: boolean) => void
  setConfig: (config: Config) => void
  setGateQuantity: (type: GateType, quantity: number) => void
  setFieldSize: (width: number, height: number) => void
  setVenue: (venueId: VenueId | null) => void
  setSnapGatesToGrid: (value: boolean) => void
  setSnapGridSize: (value: SnapGridSize) => void
  setShowGrid: (value: boolean) => void
  setShowFlightPath: (value: boolean) => void
  setShowOpeningLabels: (value: boolean) => void
  setTheme: (theme: ThemeId) => void
  resetToDefault: () => void
}

export const defaultConfig: Config = {
  gateQuantities: {
    'standard': 3,
    'start-finish': 1,
    'h-gate': 2,
    'double-h': 0,
    'hurdle': 0,
    'dive': 1,
    'double': 1,
    'ladder': 0,
    'flag': 1,
    'flag-small': 1,
    'octagonal-tunnel': 1,
  },
  fieldSize: { width: 30, height: 15 },
  venueId: null,
  snapGatesToGrid: false,
  snapGridSize: 0.3,
  showGrid: false,
  showFlightPath: true,
  showOpeningLabels: true,
  theme: 'minimal' as const,
};

/**
 * Starting config: the factory defaults, with the venue the user picked last in
 * this browser applied (see `utils/venuePreference.ts`).
 */
export function createInitialConfig(): Config {
  const preset = getVenuePreset(readStoredVenueId())

  return preset
    ? { ...defaultConfig, venueId: preset.id, fieldSize: { ...preset.fieldSize } }
    : defaultConfig
}

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
  config: createInitialConfig(),
  showDrones: true,
  setShowDrones: (value) => set({ showDrones: value }),
  setConfig: (config) => set({ config }),
  setGateQuantity: (type, quantity) => set((state) => ({
    config: {
      ...state.config,
      gateQuantities: { ...state.config.gateQuantities, [type]: quantity },
    },
  })),
  setFieldSize: (width, height) => set((state) => ({
    config: { ...state.config, fieldSize: { width, height } },
  })),
  setVenue: (venueId) => {
    // Only an explicit pick in the panel is remembered for the next visit;
    // loading or importing a track leaves the preference alone.
    writeStoredVenueId(venueId)
    set((state) => {
      const preset = getVenuePreset(venueId)
      return {
        config: {
          ...state.config,
          venueId,
          ...(preset ? { fieldSize: { ...preset.fieldSize } } : {}),
        },
      }
    })
  },
  setSnapGatesToGrid: (value) => set((state) => ({
    config: { ...state.config, snapGatesToGrid: value },
  })),
  setSnapGridSize: (value) => set((state) => ({
    config: { ...state.config, snapGridSize: value },
  })),
  setShowGrid: (value) => set((state) => ({
    config: { ...state.config, showGrid: value },
  })),
  setShowFlightPath: (value) => set((state) => ({
    config: { ...state.config, showFlightPath: value },
  })),
  setShowOpeningLabels: (value) => set((state) => ({
    config: { ...state.config, showOpeningLabels: value },
  })),
  setTheme: (theme) => set((state) => ({
    config: { ...state.config, theme },
  })),
  resetToDefault: () => {
    writeStoredVenueId(null)
    set({ config: defaultConfig })
  },
})
