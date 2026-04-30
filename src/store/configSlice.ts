import type { StateCreator } from 'zustand'
import type { Config, GateType, ThemeId } from '../types'

export interface ConfigSlice {
  config: Config
  setConfig: (config: Config) => void
  setGateQuantity: (type: GateType, quantity: number) => void
  setFieldSize: (width: number, height: number) => void
  setSnapGatesToGrid: (value: boolean) => void
  setShowGrid: (value: boolean) => void
  setShowFlightPath: (value: boolean) => void
  setShowOpeningLabels: (value: boolean) => void
  setTheme: (theme: ThemeId) => void
  resetToDefault: () => void
}

export const defaultConfig: Config = {
  gateQuantities: {
    'standard': 4,
    'start-finish': 1,
    'h-gate': 3,
    'double-h': 1,
    'dive': 1,
    'double': 1,
    'ladder': 0,
    'flag': 2,
    'octagonal-tunnel': 1,
  },
  fieldSize: { width: 30, height: 15 },
  snapGatesToGrid: false,
  showGrid: false,
  showFlightPath: true,
  showOpeningLabels: true,
  theme: 'minimal' as const,
};

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
  config: defaultConfig,
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
  setSnapGatesToGrid: (value) => set((state) => ({
    config: { ...state.config, snapGatesToGrid: value },
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
  resetToDefault: () => set({ config: defaultConfig }),
})
