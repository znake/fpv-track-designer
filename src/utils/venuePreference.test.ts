import { beforeEach, describe, expect, it, vi } from 'vitest'

import { VENUE_STORAGE_KEY, readStoredVenueId, writeStoredVenueId } from './venuePreference'
import type { VenueId } from '../types/venue'

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

describe('venuePreference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('has no stored venue without a value', () => {
    expect(VENUE_STORAGE_KEY).toBe('fpv-track-designer-venue')
    expect(readStoredVenueId()).toBeNull()
  })

  it('reads back a stored venue id', () => {
    writeStoredVenueId('last-og3')

    expect(window.localStorage.getItem(VENUE_STORAGE_KEY)).toBe('last-og3')
    expect(readStoredVenueId()).toBe('last-og3')
  })

  it('removes the stored venue when clearing the selection', () => {
    writeStoredVenueId('last-og3')
    writeStoredVenueId(null)

    expect(window.localStorage.getItem(VENUE_STORAGE_KEY)).toBeNull()
    expect(readStoredVenueId()).toBeNull()
  })

  it('ignores unknown or foreign stored values', () => {
    window.localStorage.setItem(VENUE_STORAGE_KEY, 'nope')
    expect(readStoredVenueId()).toBeNull()

    window.localStorage.setItem(VENUE_STORAGE_KEY, '')
    expect(readStoredVenueId()).toBeNull()

    window.localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify({ id: 'last-og3' }))
    expect(readStoredVenueId()).toBeNull()
  })

  it('keeps the selection working when the storage rejects the write', () => {
    const original = window.localStorage.setItem
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    window.localStorage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => writeStoredVenueId('last-og3' as VenueId)).not.toThrow()
    expect(consoleError).toHaveBeenCalled()

    window.localStorage.setItem = original
    consoleError.mockRestore()
  })
})
