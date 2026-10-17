import { describe, expect, it } from 'vitest'

import { VENUE_PRESETS, getVenuePreset, isVenueId } from './venuePresets'
import type { VenueId, VenueObstacle, VenuePreset } from '../types'

const footprintsOverlap = (a: VenueObstacle, b: VenueObstacle): boolean =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
  Math.abs(a.z - b.z) < (a.depth + b.depth) / 2

describe('VENUE_PRESETS', () => {
  it("contains 'last-og3' with fieldSize 10.5 x 22.7 and four center-line pillars", () => {
    const preset = getVenuePreset('last-og3')

    expect(preset).not.toBeNull()
    if (!preset) return

    expect(preset.id).toBe('last-og3')
    expect(preset.name).toBe('Last OG3')
    expect(preset.fieldSize).toEqual({ width: 10.5, height: 22.7 })
    expect(preset.obstacles).toEqual([
      { x: 0, z: -7.05, width: 0.3, depth: 0.5, height: 3 },
      { x: 0, z: -1.95, width: 0.3, depth: 0.5, height: 3 },
      { x: 0, z: 3.15, width: 0.3, depth: 0.5, height: 3 },
      { x: 0, z: 8.25, width: 0.3, depth: 0.5, height: 3 },
    ])
  })

  it('keeps every obstacle footprint inside the field and free of overlaps', () => {
    for (const preset of VENUE_PRESETS as VenuePreset[]) {
      for (const obstacle of preset.obstacles) {
        expect(
          Math.abs(obstacle.x) + obstacle.width / 2,
          `${preset.id} obstacle at z=${obstacle.z} exceeds the field width`,
        ).toBeLessThanOrEqual(preset.fieldSize.width / 2)
        expect(
          Math.abs(obstacle.z) + obstacle.depth / 2,
          `${preset.id} obstacle at z=${obstacle.z} exceeds the field length`,
        ).toBeLessThanOrEqual(preset.fieldSize.height / 2)
      }

      for (let i = 0; i < preset.obstacles.length; i++) {
        for (let j = i + 1; j < preset.obstacles.length; j++) {
          expect(
            footprintsOverlap(preset.obstacles[i], preset.obstacles[j]),
            `${preset.id} obstacles at z=${preset.obstacles[i].z} and z=${preset.obstacles[j].z} overlap`,
          ).toBe(false)
        }
      }
    }
  })
})

describe('getVenuePreset', () => {
  it('returns null for null, undefined and an unknown id', () => {
    expect(getVenuePreset(null)).toBeNull()
    expect(getVenuePreset(undefined)).toBeNull()
    expect(getVenuePreset('nope' as VenueId)).toBeNull()
  })
})

describe('isVenueId', () => {
  it("accepts 'last-og3' and rejects 'nope', null and 42", () => {
    expect(isVenueId('last-og3')).toBe(true)
    expect(isVenueId('nope')).toBe(false)
    expect(isVenueId(null)).toBe(false)
    expect(isVenueId(42)).toBe(false)
  })
})
