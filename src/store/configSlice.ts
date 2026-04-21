import type { StateCreator } from 'zustand'
import type { Config, GateType } from '../types'

export interface ConfigSlice {
  config: Config
  setGateQuantity: (type: GateType, quantity: number) => void
  setFieldSize: (width: number, height: number) => void
  setGateSize: (size: 0.75 | 1 | 1.5) => void
  resetToDefault: () => void
}

export const defaultConfig: Config = {
  gateQuantities: {
    'standard': 5,
    'h-gate': 2,
    'huerdel': 1,
    'doppelgate': 1,
    'ladder': 0,
    'start-finish': 1,
    'flag': 2,
  },
  fieldSize: { width: 100, height: 100 },
  gateSize: 1,
}

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set, _get, _store) => ({
  config: defaultConfig,
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
  resetToDefault: () => set({ config: defaultConfig }),
})