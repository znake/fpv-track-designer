import { describe, it, expect } from 'vitest'
import { create } from 'zustand'
import { createConfigSlice, defaultConfig, type ConfigSlice } from './configSlice'

const createTestStore = () =>
  create<ConfigSlice>()((set, get, store) => ({
    ...createConfigSlice(set, get, store),
  }))

describe('ConfigSlice - default settings', () => {
  it('defines double-h, dive, ladder and flag as 1 by default', () => {
    const config = defaultConfig

    expect(config.gateQuantities['double-h']).toBe(1)
    expect(config.gateQuantities.dive).toBe(1)
    expect(config.gateQuantities.ladder).toBe(1)
    expect(config.gateQuantities.flag).toBe(1)
  })

  it('resets to defaults including required gate counts', () => {
    const store = createTestStore()

    store.getState().setGateQuantity('flag', 3)
    store.getState().setGateQuantity('ladder', 0)
    store.getState().setGateQuantity('dive', 4)
    store.getState().setGateQuantity('double-h', 2)

    store.getState().resetToDefault()

    expect(store.getState().config.gateQuantities['double-h']).toBe(1)
    expect(store.getState().config.gateQuantities.dive).toBe(1)
    expect(store.getState().config.gateQuantities.ladder).toBe(1)
    expect(store.getState().config.gateQuantities.flag).toBe(1)
  })
})
