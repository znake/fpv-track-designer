import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_MAX_POLES,
  readStoredMaxPoles,
  sanitizeMaxPoles,
  setStoredMaxPoles,
} from './poleLimit'

const STORAGE_KEY = 'fpv-track-designer-max-poles'

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
})

describe('poleLimit', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to 60 poles without a stored value', () => {
    expect(DEFAULT_MAX_POLES).toBe(60)
    expect(readStoredMaxPoles()).toBe(60)
  })

  it('reads back a custom limit from localStorage', () => {
    setStoredMaxPoles(120)

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('120')
    expect(readStoredMaxPoles()).toBe(120)
  })

  it('falls back to the default for unparsable or non-positive stored values', () => {
    window.localStorage.setItem(STORAGE_KEY, 'viele')
    expect(readStoredMaxPoles()).toBe(60)

    window.localStorage.setItem(STORAGE_KEY, '-5')
    expect(readStoredMaxPoles()).toBe(60)

    window.localStorage.setItem(STORAGE_KEY, '0')
    expect(readStoredMaxPoles()).toBe(60)
  })

  it('normalizes invalid values to the default on write', () => {
    expect(setStoredMaxPoles(0)).toBe(60)
    expect(readStoredMaxPoles()).toBe(60)

    expect(setStoredMaxPoles(12.5)).toBe(60)
    expect(readStoredMaxPoles()).toBe(60)
  })

  it('sanitizes raw input strings', () => {
    expect(sanitizeMaxPoles(' 42 ')).toBe(42)
    expect(sanitizeMaxPoles('42')).toBe(42)
    expect(sanitizeMaxPoles('')).toBeNull()
    expect(sanitizeMaxPoles('0')).toBeNull()
    expect(sanitizeMaxPoles('3.5')).toBeNull()
    expect(sanitizeMaxPoles('abc')).toBeNull()
  })
})
