import type { StateCreator } from 'zustand'
import type { Config, GateType } from '../types'

export interface ConfigSlice {
  config: Config
  setConfig: (config: Config) => void
  setGateQuantity: (type: GateType, quantity: number) => void
  setFieldSize: (width: number, height: number) => void
  setGateSize: (size: 0.75 | 1 | 1.5) => void
  setShowFlightPath: (value: boolean) => void
  setShowOpeningLabels: (value: boolean) => void
  resetToDefault: () => void
}

export const defaultConfig: Config = {
  gateQuantities: {
    'standard': 2,
    'start-finish': 1,
    'h-gate': 1,
    'double-h': 1,
    'dive': 1,
    'double': 1,
    'ladder': 1,
    'flag': 1,
  },
  fieldSize: { width: 30, height: 15 },
  gateSize: 1,
  showFlightPath: true,
  showOpeningLabels: true,
}

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
  setGateSize: (size) => set((state) => ({
    config: { ...state.config, gateSize: size },
  })),
  setShowFlightPath: (value) => set((state) => ({
    config: { ...state.config, showFlightPath: value },
  })),
  setShowOpeningLabels: (value) => set((state) => ({
    config: { ...state.config, showOpeningLabels: value },
  })),
  resetToDefault: () => set({ config: defaultConfig }),
})
