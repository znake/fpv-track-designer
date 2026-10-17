import { useSyncExternalStore } from 'react'

// Bewusst nicht Teil von `Config`: die Obergrenze ist eine reine
// Browser-Einstellung und darf nicht über Strecken, Exporte oder Share-Links
// wandern, damit sie Reloads und Streckenwechsel überlebt.
export const DEFAULT_MAX_POLES = 60

const MAX_POLES_STORAGE_KEY = 'fpv-track-designer-max-poles'
const MAX_POLES_CHANGE_EVENT = 'fpv-track-designer-max-poles-change'

export function sanitizeMaxPoles(value: unknown): number | null {
  const parsed =
    typeof value === 'string' ? Number(value.trim()) : value

  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export function readStoredMaxPoles(): number {
  if (typeof window === 'undefined') return DEFAULT_MAX_POLES
  if (typeof window.localStorage?.getItem !== 'function') return DEFAULT_MAX_POLES

  return sanitizeMaxPoles(window.localStorage.getItem(MAX_POLES_STORAGE_KEY)) ?? DEFAULT_MAX_POLES
}

export function setStoredMaxPoles(maxPoles: number): number {
  const normalized = sanitizeMaxPoles(maxPoles) ?? DEFAULT_MAX_POLES
  window.localStorage.setItem(MAX_POLES_STORAGE_KEY, String(normalized))
  window.dispatchEvent(new Event(MAX_POLES_CHANGE_EVENT))
  return normalized
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(MAX_POLES_CHANGE_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(MAX_POLES_CHANGE_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function useMaxPoles(): number {
  return useSyncExternalStore(subscribe, readStoredMaxPoles, () => DEFAULT_MAX_POLES)
}
