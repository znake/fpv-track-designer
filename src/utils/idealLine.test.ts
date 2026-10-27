import { describe, expect, it } from 'vitest'
import type { IdealLineLegRef, IdealLinePoint } from '../types'
import {
  MAX_IDEAL_LINE_U,
  MIN_IDEAL_LINE_U,
  basisPointAtU,
  createIdealLineOffsetField,
  getClosestPathPoint,
  groupIdealLinePointsByLeg,
  resolveIdealLineHover,
} from './idealLine'

const legA: IdealLineLegRef = {
  from: { gateId: 'a', openingId: 'main' },
  to: { gateId: 'b', openingId: 'main' },
}
const legB: IdealLineLegRef = {
  from: { gateId: 'b', openingId: 'main' },
  to: { gateId: 'c', openingId: 'main' },
}
const point = (id: string, u: number, leg = legA): IdealLinePoint => ({
  id,
  leg,
  u,
  position: { x: u * 10, y: 1, z: 2 },
})

describe('ideal-line control-point helpers', () => {
  it('groups and sorts points on the first matching leg only', () => {
    // Given duplicate and unknown leg references
    const points = [point('late', 0.7), point('early', 0.2), point('unknown', 0.4, legB)]
    // When points are grouped
    const groups = groupIdealLinePointsByLeg(points, [legA, legA])
    // Then only the first matching leg owns the sorted points
    expect(groups).toHaveLength(1)
    expect(groups[0].legIndex).toBe(0)
    expect(groups[0].points.map((entry) => entry.id)).toEqual(['early', 'late'])
  })

  it('deduplicates nearly identical u anchors and drops dormant points', () => {
    // Given two anchors within the dedup epsilon and a dormant anchor
    const points = [point('first', 0.4), point('second', 0.4000005), point('dormant', 0.5, legB)]
    // When points are grouped
    const groups = groupIdealLinePointsByLeg(points, [legA])
    // Then the first anchor wins and the dormant point has no effect
    expect(groups[0].points.map((entry) => entry.id)).toEqual(['first'])
  })

  it('interpolates the visible basis and skips duplicate joins', () => {
    // Given samples with a duplicated curve join
    const samples = [
      { u: 0, point: { x: 0, y: 0, z: 0 } },
      { u: 0.5, point: { x: 0, y: 0.6, z: 0 } },
      { u: 0.5, point: { x: 0, y: 0.6, z: 0 } },
      { u: 1, point: { x: 0, y: 0.6, z: 8 } },
    ]
    // When evaluating inside and outside the basis
    // Then values follow the visible polyline without NaN
    expect(basisPointAtU(samples, 0.25)).toEqual({ x: 0, y: 0.3, z: 0 })
    expect(basisPointAtU(samples, 0.5)).toEqual({ x: 0, y: 0.6, z: 0 })
    expect(basisPointAtU(samples, -1)).toEqual(samples[0].point)
    expect(basisPointAtU(samples, 2)).toEqual({ x: 0, y: 0.6, z: 8 })
  })

  it('returns a zero field without authored knots', () => {
    // Given no authored knots
    const field = createIdealLineOffsetField([])
    // When evaluating several positions
    // Then every offset is zero
    for (const u of [-1, 0, 0.4, 1, 2]) expect(field(u)).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('passes through authored offsets with zero offsets at leg anchors', () => {
    // Given one elevated control point
    const field = createIdealLineOffsetField([{ u: 0.5, offset: { x: 0, y: 2, z: 0 } }])
    // When evaluating the point and both anchors
    // Then the authored point is exact and anchors remain pinned
    expect(field(0.5)).toEqual({ x: 0, y: 2, z: 0 })
    expect(field(0)).toEqual({ x: 0, y: 0, z: 0 })
    expect(field(1)).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('keeps left and right tangents aligned at authored points', () => {
    // Given two differently displaced points
    const field = createIdealLineOffsetField([
      { u: 0.3, offset: { x: 0, y: 2, z: 0 } },
      { u: 0.6, offset: { x: 0, y: -1, z: 0 } },
    ])
    // When measuring finite differences on both sides of each point
    // Then the field has no directional kink
    for (const u of [0.3, 0.6]) {
      const before = field(u - 1e-6)
      const centre = field(u)
      const after = field(u + 1e-6)
      const left = { x: centre.x - before.x, y: centre.y - before.y, z: centre.z - before.z }
      const right = { x: after.x - centre.x, y: after.y - centre.y, z: after.z - centre.z }
      const dot = left.x * right.x + left.y * right.y + left.z * right.z
      const leftLength = Math.sqrt(left.x ** 2 + left.y ** 2 + left.z ** 2)
      const rightLength = Math.sqrt(right.x ** 2 + right.y ** 2 + right.z ** 2)
      expect(dot / (leftLength * rightLength)).toBeGreaterThan(1 - 1e-6)
    }
  })

  it('clamps long Catmull-Rom handles without changing their direction', () => {
    // Given short neighboring intervals with large opposing offsets
    const field = createIdealLineOffsetField([
      { u: 0.1, offset: { x: 0, y: -10, z: 0 } },
      { u: 0.11, offset: { x: 0, y: -10, z: 0 } },
      { u: 0.9, offset: { x: 0, y: 10, z: 0 } },
      { u: 0.91, offset: { x: 0, y: 10, z: 0 } },
    ])
    // When evaluating at one and three quarters of the long middle segment
    // Then the independently calculated clamped Bezier values are exact
    expect(field(0.3075).y).toBeCloseTo(-6.171875, 9)
    expect(field(0.7025).y).toBeCloseTo(6.171875, 9)
  })

  it('maps a real segment hit to its base u and preserves the hit position', () => {
    // Given a segment from u 0.2 to 0.4 and its midpoint hit
    const leg = legA
    const hit = { x: 2, y: 0, z: 5 }
    // When resolving the hover
    const target = resolveIdealLineHover({
      leg,
      samples: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }],
      sampleUs: [0.2, 0.4],
      segmentIndex: 0,
      curveSampleOffset: 0,
      hit,
    })
    // Then u is interpolated and the exact hit is retained
    expect(target?.u).toBeCloseTo(0.3, 12)
    expect(target?.position).toEqual(hit)
    expect(target?.leg).toBe(leg)
  })

  it('handles hover bounds, degenerate segments and endpoint clamping', () => {
    // Given degenerate and out-of-range hover queries
    const base = {
      leg: legA,
      samples: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }],
      sampleUs: [0, 1],
      curveSampleOffset: 0,
      hit: { x: 0, y: 0, z: 0 },
    }
    // When resolving them
    // Then invalid indexes are empty and valid values stay finite and clamped
    const nonDegenerate = {
      ...base,
      samples: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }],
    }
    expect(resolveIdealLineHover({ ...base, segmentIndex: 3 })).toBeNull()
    expect(resolveIdealLineHover({ ...base, segmentIndex: 0 })?.u).toBe(MIN_IDEAL_LINE_U)
    expect(resolveIdealLineHover({ ...nonDegenerate, segmentIndex: 0 })?.u).toBe(MIN_IDEAL_LINE_U)
    expect(resolveIdealLineHover({ ...nonDegenerate, segmentIndex: 0, hit: { x: 0, y: 0, z: 10 } })?.u).toBe(MAX_IDEAL_LINE_U)
  })

  it('selects the closest visible point with first-candidate ties', () => {
    // Given two equally close visible points
    const points = [{ x: -1, y: 2, z: 0 }, { x: 1, y: -3, z: 0 }]
    // When selecting from a target and from an empty list
    // Then the first visible candidate wins and empty input is null
    expect(getClosestPathPoint({ x: 0, y: 0, z: 0 }, points)).toBe(points[0])
    expect(getClosestPathPoint({ x: 0, y: 0, z: 0 }, [])).toBeNull()
  })
})
