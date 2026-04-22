import { describe, it, expect } from 'vitest'
import { calculateFlightPath, FLIGHT_PATH_HEIGHT } from './flightPath'
import type { Gate } from '../types'

const createGate = (id: string, x: number, y: number, z: number): Gate => ({
  id,
  type: 'standard',
  position: { x, y, z },
  rotation: 0,
  size: 1,
})

describe('calculateFlightPath', () => {
  it('returns empty path for less than 2 gates', () => {
    expect(calculateFlightPath([])).toEqual({
      segments: [],
      arrows: [],
      totalLength: 0,
      points: [],
      sampledPoints: [],
    })
    expect(calculateFlightPath([createGate('g1', 0, 0, 0)])).toEqual({
      segments: [],
      arrows: [],
      totalLength: 0,
      points: [],
      sampledPoints: [],
    })
  })

  it('generates path segments connecting all gates in order', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 0, 0),
      createGate('g3', 10, 10, 0),
      createGate('g4', 0, 10, 0),
      createGate('g5', 0, 0, 0),
    ]

    const path = calculateFlightPath(gates)

    // 5 gates = 5 segments (including closing segment)
    expect(path.segments).toHaveLength(5)

    // Verify first segment connects g1 to g2
    expect(path.segments[0].from).toEqual({ x: 0, y: 0, z: 0 })
    expect(path.segments[0].to).toEqual({ x: 10, y: 0, z: 0 })

    // Verify last segment connects g5 back to g1 (closing)
    expect(path.segments[4].from).toEqual({ x: 0, y: 0, z: 0 })
    expect(path.segments[4].to).toEqual({ x: 0, y: 0, z: 0 })

    // Verify sampledPoints exist and are non-empty
    expect(path.sampledPoints.length).toBeGreaterThan(0)

    // points includes 4 control points per segment, but 'to' of segment i equals 'from' of segment i+1
    expect(path.points.length).toBe(gates.length * 3)
  })

  it('path closes (last gate connects to first)', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 5, 0, 0),
      createGate('g3', 5, 5, 0),
    ]

    const path = calculateFlightPath(gates)

    // Should have 3 segments: g1->g2, g2->g3, g3->g1
    expect(path.segments).toHaveLength(3)

    // Last segment should connect g3 back to g1
    expect(path.segments[2].from).toEqual(gates[2].position)
    expect(path.segments[2].to).toEqual(gates[0].position)
  })

  it('calculates correct segment lengths (straight-line distance)', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 3, 4, 0), // 5 units away (3-4-5 triangle)
    ]

    const path = calculateFlightPath(gates)

    expect(path.segments).toHaveLength(2)
    expect(path.segments[0].length).toBeCloseTo(5, 5)
    expect(path.segments[1].length).toBeCloseTo(5, 5) // closing segment
  })

  it('calculates normalized direction vectors for collinear gates', () => {
    // Use 3 collinear gates so the closed curve is predictable
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 0, 0),
      createGate('g3', 20, 0, 0),
    ]

    const path = calculateFlightPath(gates)

    // With rotation=0 gates, the first tangent starts near +z (exit direction)
    expect(path.segments[0].direction.z).toBeGreaterThan(0.9)
    expect(Math.abs(path.segments[0].direction.x)).toBeLessThan(0.1)
    expect(Math.abs(path.segments[0].direction.y)).toBeLessThan(0.1)

    // All direction vectors should be normalized
    for (const seg of path.segments) {
      const dirLen = Math.sqrt(
        seg.direction.x ** 2 + seg.direction.y ** 2 + seg.direction.z ** 2,
      )
      expect(dirLen).toBeCloseTo(1, 5)
    }
  })

  it('generates arrows along path with correct directions', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 20, 0, 0), // 20m segment
    ]

    const path = calculateFlightPath(gates)

    expect(path.arrows.length).toBeGreaterThan(0)

    // All arrows should have normalized direction vectors
    for (const arrow of path.arrows) {
      const dirLen = Math.sqrt(
        arrow.direction.x ** 2 + arrow.direction.y ** 2 + arrow.direction.z ** 2,
      )
      expect(dirLen).toBeCloseTo(1, 5)
    }
  })

  it('arrows are positioned along the path', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 0, 0),
    ]

    const path = calculateFlightPath(gates)

    // All arrow positions should stay near the gate corridor
    for (const arrow of path.arrows) {
      expect(arrow.position.x).toBeGreaterThanOrEqual(-1)
      expect(arrow.position.x).toBeLessThanOrEqual(11)
      expect(arrow.position.y).toBeCloseTo(FLIGHT_PATH_HEIGHT, 1)
      expect(Number.isFinite(arrow.position.z)).toBe(true)
    }
  })

  it('handles 3D paths correctly', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 5, 3),
      createGate('g3', 5, 10, 6),
    ]

    const path = calculateFlightPath(gates)

    expect(path.segments).toHaveLength(3)

    // Verify 3D direction calculation - direction should be normalized
    const seg0 = path.segments[0]
    const dirLen = Math.sqrt(
      seg0.direction.x ** 2 + seg0.direction.y ** 2 + seg0.direction.z ** 2,
    )
    expect(dirLen).toBeCloseTo(1, 5)

    // Segment length uses original gate positions (not elevated)
    const expectedLen = Math.sqrt(10 ** 2 + 5 ** 2 + 3 ** 2)
    expect(seg0.length).toBeCloseTo(expectedLen, 5)
  })

  it('totalLength is curve arc length (>= straight-line distance)', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 3, 0, 0),
      createGate('g3', 3, 4, 0),
    ]

    const path = calculateFlightPath(gates)

    // totalLength is now the curve arc length, which is >= sum of straight-line distances
    const straightLineTotal = path.segments.reduce((sum, seg) => sum + seg.length, 0)
    expect(path.totalLength).toBeGreaterThanOrEqual(straightLineTotal - 0.01)
  })

  it('works with 5 gates as specified', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 0, 0),
      createGate('g3', 10, 10, 0),
      createGate('g4', 0, 10, 0),
      createGate('g5', 5, 5, 0),
    ]

    const path = calculateFlightPath(gates)

    // 5 gates = 5 segments (including closing)
    expect(path.segments).toHaveLength(5)
    expect(path.totalLength).toBeGreaterThan(0)
    expect(path.arrows.length).toBeGreaterThan(0)
    expect(path.sampledPoints.length).toBeGreaterThan(0)
    // points includes 3 unique control points per segment (from, cp1, cp2), 'to' is shared with next segment
    expect(path.points.length).toBe(gates.length * 3)
  })

  it('arrows follow curved path (not collinear for L-shape)', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 0, 0),
      createGate('g3', 10, 0, 10),
    ]

    const path = calculateFlightPath(gates)

    // Arrows should NOT all be collinear — the curve bends around the L
    // Check that not all arrows have the same direction
    const directions = path.arrows.map(a => ({
      x: Math.round(a.direction.x * 100) / 100,
      y: Math.round(a.direction.y * 100) / 100,
      z: Math.round(a.direction.z * 100) / 100,
    }))

    const uniqueDirections = new Set(directions.map(d => `${d.x},${d.y},${d.z}`))
    expect(uniqueDirections.size).toBeGreaterThan(1)

    // Verify arrows are not all on a straight line
    const positions = path.arrows.map(a => a.position)
    const allOnXAxis = positions.every(p => Math.abs(p.z) < 0.5)
    const allOnZAxis = positions.every(p => Math.abs(p.x - 10) < 0.5)
    // Not all arrows should be on just one leg of the L
    expect(allOnXAxis && allOnZAxis).toBe(false)
  })

  it('points array includes gate exit points and control points', () => {
    const gates = [
      createGate('g1', 1, 2, 3),
      createGate('g2', 4, 5, 6),
      createGate('g3', 7, 8, 9),
    ]

    const path = calculateFlightPath(gates)

    // points includes 3 unique control points per segment (from, cp1, cp2), 'to' is shared with next segment
    expect(path.points.length).toBe(gates.length * 3)
    // Verify gate exit points are included (rotation=0 => +z offset for exits)
    const gatePoints = gates.map(g => ({ x: g.position.x, y: g.position.y + FLIGHT_PATH_HEIGHT, z: g.position.z + 0.4 }))
    for (let i = 0; i < gatePoints.length; i++) {
      const gp = gatePoints[i]
      const p = path.points[i * 3]
      expect(Math.abs(p.x - gp.x)).toBeLessThan(0.01)
      expect(Math.abs(p.y - gp.y)).toBeLessThan(0.01)
      expect(Math.abs(p.z - gp.z)).toBeLessThan(0.01)
    }
  })
})
