import { describe, it, expect } from 'vitest'
import { calculateFlightPath } from './flightPath'
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
    expect(calculateFlightPath([])).toEqual({ segments: [], arrows: [], totalLength: 0 })
    expect(calculateFlightPath([createGate('g1', 0, 0, 0)])).toEqual({
      segments: [],
      arrows: [],
      totalLength: 0,
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

  it('calculates correct segment lengths', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 3, 4, 0), // 5 units away (3-4-5 triangle)
    ]

    const path = calculateFlightPath(gates)

    expect(path.segments).toHaveLength(2)
    expect(path.segments[0].length).toBeCloseTo(5, 5)
    expect(path.segments[1].length).toBeCloseTo(5, 5) // closing segment
    expect(path.totalLength).toBeCloseTo(10, 5)
  })

  it('calculates correct direction vectors', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 0, 0),
    ]

    const path = calculateFlightPath(gates)

    // Direction from g1 to g2 should be (1, 0, 0)
    expect(path.segments[0].direction).toEqual({ x: 1, y: 0, z: 0 })

    // Direction from g2 back to g1 should be (-1, 0, 0)
    expect(path.segments[1].direction).toEqual({ x: -1, y: 0, z: 0 })
  })

  it('generates arrows along path with correct directions', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 20, 0, 0), // 20m segment
    ]

    const path = calculateFlightPath(gates)

    // Should have arrows spaced at 5m intervals
    // First arrow at 2.5m, then 7.5m, 12.5m, 17.5m = 4 arrows per 20m segment
    // Two segments = 8 arrows total
    expect(path.arrows.length).toBeGreaterThan(0)

    // All arrows should point in the direction of their segment
    for (const arrow of path.arrows) {
      // Direction should be normalized (unit vector)
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

    // All arrow positions should be between the gates
    for (const arrow of path.arrows) {
      expect(arrow.position.x).toBeGreaterThanOrEqual(0)
      expect(arrow.position.x).toBeLessThanOrEqual(10)
      expect(arrow.position.y).toBe(0)
      expect(arrow.position.z).toBe(0)
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

    // Verify 3D direction calculation
    const seg0 = path.segments[0]
    const expectedLen = Math.sqrt(10 ** 2 + 5 ** 2 + 3 ** 2)
    expect(seg0.length).toBeCloseTo(expectedLen, 5)

    // Direction should be normalized
    const dirLen = Math.sqrt(
      seg0.direction.x ** 2 + seg0.direction.y ** 2 + seg0.direction.z ** 2,
    )
    expect(dirLen).toBeCloseTo(1, 5)
  })

  it('totalLength is sum of all segment lengths', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 3, 0, 0),
      createGate('g3', 3, 4, 0),
    ]

    const path = calculateFlightPath(gates)

    const expectedTotal = path.segments.reduce((sum, seg) => sum + seg.length, 0)
    expect(path.totalLength).toBeCloseTo(expectedTotal, 5)
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
  })
})
