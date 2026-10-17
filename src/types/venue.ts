export const VENUE_IDS = ['last-og3'] as const

export type VenueId = (typeof VENUE_IDS)[number]

export interface VenueObstacle {
  /** Center position on the x axis (Breite), in metres relative to the FIELD CENTER. */
  x: number
  /** Center position on the z axis (Laenge), in metres relative to the FIELD CENTER. */
  z: number
  /** Footprint across the x axis (Breite), in metres. */
  width: number
  /** Footprint across the z axis (Laenge), in metres. */
  depth: number
  /** Rendered height, in metres. */
  height: number
}

export interface VenuePreset {
  id: VenueId
  name: string
  /** Uses the same frame as Track.fieldSize and gate positions (x = Breite, z = Laenge). */
  fieldSize: { width: number; height: number }
  obstacles: VenueObstacle[]
}
