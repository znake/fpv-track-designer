import { VENUE_IDS } from '../types/venue'
import type { VenueId, VenuePreset } from '../types/venue'

// 'Last OG3' hall geometry, field-centered: field 10.5 m across x (Breite) x 22.7 m
// along z (Laenge), so z ranges from -11.35 to +11.35. Four pillars (0.3 m wide across
// x, 0.5 m deep across z, 3 m tall) stand on the center line (x = 0): the first sits
// 4.3 m from the end wall (z = -22.7 / 2 + 4.3 = -7.05), the rest follow at 5.1 m
// spacing: -1.95, 3.15, 8.25.
export const VENUE_PRESETS: VenuePreset[] = [
  {
    id: 'last-og3',
    name: 'Last OG3',
    fieldSize: { width: 10.5, height: 22.7 },
    obstacles: [
      { x: 0, z: -7.05, width: 0.3, depth: 0.5, height: 3 },
      { x: 0, z: -1.95, width: 0.3, depth: 0.5, height: 3 },
      { x: 0, z: 3.15, width: 0.3, depth: 0.5, height: 3 },
      { x: 0, z: 8.25, width: 0.3, depth: 0.5, height: 3 },
    ],
  },
]

export function getVenuePreset(id: VenueId | null | undefined): VenuePreset | null {
  return VENUE_PRESETS.find((preset) => preset.id === id) ?? null
}

export function isVenueId(value: unknown): value is VenueId {
  return VENUE_IDS.some((venueId) => venueId === value)
}
