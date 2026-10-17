import { isVenueId } from './venuePresets'
import type { VenueId } from '../types/venue'

// Bewusst nicht Teil von `Config`: die zuletzt gewaehlte Halle ist eine reine
// Browser-Einstellung. Sie soll den naechsten Besuch ueberleben, aber nicht in
// Track-Exporten oder Share-Links landen (dort reist `config.venueId` mit).
export const VENUE_STORAGE_KEY = 'fpv-track-designer-venue'

export function readStoredVenueId(): VenueId | null {
  if (typeof window === 'undefined') return null
  if (typeof window.localStorage?.getItem !== 'function') return null

  const stored = window.localStorage.getItem(VENUE_STORAGE_KEY)
  return isVenueId(stored) ? stored : null
}

export function writeStoredVenueId(venueId: VenueId | null): void {
  if (typeof window === 'undefined') return
  if (typeof window.localStorage?.removeItem !== 'function') return
  if (typeof window.localStorage?.setItem !== 'function') return

  try {
    if (venueId === null) {
      window.localStorage.removeItem(VENUE_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(VENUE_STORAGE_KEY, venueId)
  } catch (e) {
    // A rejected write (private mode, full quota) must never break the selection.
    console.error('Storing the venue preference failed:', e)
  }
}
