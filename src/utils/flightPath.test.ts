import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { calculateFlightPath, calculateFlightPathWithControlPoints, DIVE_TOP_APPROACH_CLEARANCE, GATE_BASE_HEIGHT, GATE_STRUCTURE_CLEARANCE } from './flightPath'
import type { Gate, GateSequenceItem, IdealLinePoint } from '../types'
import { createDefaultGateOpenings, getHGateBackrestSide } from './gateOpenings'

const createGate = (id: string, x: number, y: number, z: number): Gate => ({
  id,
  type: 'standard',
  position: { x, y, z },
  rotation: 0,
  openings: createDefaultGateOpenings('standard'),
})

const createOctagonalTunnelGate = (id: string, x: number, z: number, reverse = false): Gate => ({
  id,
  type: 'octagonal-tunnel',
  position: { x, y: 0, z },
  rotation: 0,
  openings: createDefaultGateOpenings('octagonal-tunnel').map((opening) => ({
    ...opening,
    reverse,
  })),
})

const createHurdleGate = (id: string, x: number, z: number): Gate => ({
  id,
  type: 'hurdle',
  position: { x, y: 0, z },
  rotation: 0,
  openings: createDefaultGateOpenings('hurdle'),
})

describe('calculateFlightPath', () => {
  it('returns empty path for less than 2 gates', () => {
    expect(calculateFlightPath([])).toEqual({
      segments: [],
      arrows: [],
      totalLength: 0,
      points: [],
      sampledPoints: [],
      sampledSegments: [],
      sampledLegs: [],
    })
    expect(calculateFlightPath([createGate('g1', 0, 0, 0)])).toEqual({
      segments: [],
      arrows: [],
      totalLength: 0,
      points: [],
      sampledPoints: [],
      sampledSegments: [],
      sampledLegs: [],
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
    expect(path.sampledSegments.length).toBeGreaterThan(0)
    expect(path.sampledLegs).toHaveLength(gates.length)
    expect(path.sampledLegs.every(leg => leg.length >= 2)).toBe(true)
    expect(path.sampledSegments.every(segment => segment.length >= 2)).toBe(true)

    // points includes 3 control points per segment (from, cp1, cp2).
    // When avoidance is triggered, a segment gets 6 control points (2 curves × 3).
    // So length >= gates.length * 3.
    expect(path.points.length).toBeGreaterThanOrEqual(gates.length * 3)
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

    // Ideal line now follows the direct line between gate centers
    expect(path.segments[0].direction.x).toBeGreaterThan(0.9)
    expect(Math.abs(path.segments[0].direction.z)).toBeLessThan(0.1)
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
    // Avoidance paths may extend slightly beyond the straight corridor
    for (const arrow of path.arrows) {
      expect(arrow.position.x).toBeGreaterThanOrEqual(-3)
      expect(arrow.position.x).toBeLessThanOrEqual(13)
      expect(arrow.position.y).toBeCloseTo(GATE_BASE_HEIGHT / 2, 1)
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
    // points includes 3 control points per segment (from, cp1, cp2).
    // Avoidance paths add extra control points, so length >= gates.length * 3.
    expect(path.points.length).toBeGreaterThanOrEqual(gates.length * 3)
  })

  it('passes straight through a gate opening', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 0, 0),
    ]

    const path = calculateFlightPath(gates)
    const firstSegment = path.sampledSegments[0]

    expect(firstSegment[0].x).toBeCloseTo(0, 5)
    expect(firstSegment[0].z).toBeCloseTo(-0.45, 5)
    expect(firstSegment[firstSegment.length - 1].x).toBeCloseTo(0, 5)
    expect(firstSegment[firstSegment.length - 1].z).toBeCloseTo(0.45, 5)

    expect(firstSegment.every(point => Math.abs(point.x) < 0.00001)).toBe(true)
  })

  it('passes through both octagonal tunnel ends when direction is normal', () => {
    const gates = [
      createOctagonalTunnelGate('tunnel-1', 0, 0),
      createGate('g2', 0, 0, 10),
    ]

    const path = calculateFlightPath(gates)
    const tunnelPass = path.sampledSegments[0]

    expect(tunnelPass[0].x).toBeCloseTo(0, 5)
    expect(tunnelPass[0].z).toBeCloseTo(-1.45, 5)
    expect(tunnelPass[tunnelPass.length - 1].x).toBeCloseTo(0, 5)
    expect(tunnelPass[tunnelPass.length - 1].z).toBeCloseTo(1.45, 5)
    expect(tunnelPass.every(point => Math.abs(point.x) < 0.00001)).toBe(true)
  })

  it('passes through a hurdle upper opening above the closed lower body', () => {
    const gates = [
      createHurdleGate('hurdle-1', 0, 0),
      createGate('g2', 0, 0, 10),
    ]

    const path = calculateFlightPath(gates)
    const hurdlePass = path.sampledSegments[0]

    expect(hurdlePass[0].y).toBeCloseTo(1.74, 5)
    expect(hurdlePass[hurdlePass.length - 1].y).toBeCloseTo(1.74, 5)
    expect(hurdlePass.every(point => point.y > GATE_BASE_HEIGHT)).toBe(true)
  })

  it('passes through both octagonal tunnel ends when direction is reversed', () => {
    const gates = [
      createOctagonalTunnelGate('tunnel-1', 0, 0, true),
      createGate('g2', 0, 0, 10),
    ]

    const path = calculateFlightPath(gates)
    const tunnelPass = path.sampledSegments[0]

    expect(tunnelPass[0].x).toBeCloseTo(0, 5)
    expect(tunnelPass[0].z).toBeCloseTo(1.45, 5)
    expect(tunnelPass[tunnelPass.length - 1].x).toBeCloseTo(0, 5)
    expect(tunnelPass[tunnelPass.length - 1].z).toBeCloseTo(-1.45, 5)
    expect(tunnelPass.every(point => Math.abs(point.x) < 0.00001)).toBe(true)
  })

  it('reaches the next gate at its green entry anchor', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      { ...createGate('g2', 10, 0, 10), rotation: 180 },
    ]

    const path = calculateFlightPath(gates)
    const entryAnchor = { x: 10, z: 10.45 }
    const entrySegmentIndex = path.sampledSegments.findIndex((segment) => {
      const end = segment[segment.length - 1]
      return Math.abs(end.x - entryAnchor.x) < 0.01 && Math.abs(end.z - entryAnchor.z) < 0.01
    })
    const transitionSegments = path.sampledSegments.slice(1, entrySegmentIndex + 1)
    const firstTransitionSegment = transitionSegments[0]
    const lastTransitionSegment = transitionSegments[transitionSegments.length - 1]

    expect(entrySegmentIndex).toBeGreaterThan(0)
    expect(firstTransitionSegment[0].x).toBeCloseTo(0, 5)
    expect(firstTransitionSegment[0].z).toBeCloseTo(0.45, 5)
    expect(lastTransitionSegment[lastTransitionSegment.length - 1].x).toBeCloseTo(entryAnchor.x, 5)
    expect(lastTransitionSegment[lastTransitionSegment.length - 1].z).toBeCloseTo(entryAnchor.z, 5)
  })

  it('reaches reversed gate at its red entry anchor', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      { ...createGate('g2', 0, 0, 10), rotation: 0 },
    ]
    const sequence: GateSequenceItem[] = [
      { gateId: 'g1', openingId: 'main', reverse: false },
      { gateId: 'g2', openingId: 'main', reverse: true },
    ]

    const path = calculateFlightPath(gates, sequence)
    const entryAnchor = { x: 0, z: 10.45 }

    const entrySegmentIndex = path.sampledSegments.findIndex((segment) => {
      const end = segment[segment.length - 1]
      return Math.abs(end.x - entryAnchor.x) < 0.01 && Math.abs(end.z - entryAnchor.z) < 0.01
    })

    expect(entrySegmentIndex).toBeGreaterThan(0)

    const throughGateForReversed = path.sampledSegments.some((segment) => {
      const start = segment[0]
      const end = segment[segment.length - 1]
      return (
        Math.abs(start.x - 0) < 0.01
        && Math.abs(start.z - 10.45) < 0.01
        && Math.abs(end.x - 0) < 0.01
        && Math.abs(end.z - 9.55) < 0.01
      )
    })

    expect(throughGateForReversed).toBe(true)
  })

  it('uses reversed entry anchor for the first gate when reverse=true', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 10, 0, 0),
    ]
    const sequence: GateSequenceItem[] = [
      { gateId: 'g1', openingId: 'main', reverse: true },
      { gateId: 'g2', openingId: 'main', reverse: false },
    ]

    const path = calculateFlightPath(gates, sequence)

    expect(path.points[0].x).toBeCloseTo(0, 5)
    expect(path.points[0].z).toBeCloseTo(0.45, 5)
    expect(path.points[1].z).toBeGreaterThan(0.1)
  })

  it('routes outside after a reversed gate instead of re-entering the same opening', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 0, 0, 10),
    ]
    const sequence: GateSequenceItem[] = [
      { gateId: 'g1', openingId: 'main', reverse: true },
      { gateId: 'g2', openingId: 'main', reverse: false },
    ]

    const path = calculateFlightPath(gates, sequence)
    const transitionAfterReversedGate = path.sampledSegments[1]
    const maxLateralOffset = Math.max(...transitionAfterReversedGate.map((point) => Math.abs(point.x)))
    const pointsReturningThroughFirstOpening = transitionAfterReversedGate.filter((point) => (
      Math.abs(point.x) < 0.6
      && Math.abs(point.z) < 0.3
      && point.y >= 0
      && point.y <= GATE_BASE_HEIGHT
    ))

    expect(maxLateralOffset).toBeGreaterThanOrEqual(0.6 + GATE_STRUCTURE_CLEARANCE - 0.01)
    expect(pointsReturningThroughFirstOpening).toHaveLength(0)
  })

  it('routes outside between opposite directions of the same gate opening', () => {
    const gate = createGate('g1', 0, 0, 0)
    const nextGate = createGate('g2', 8, 0, 0)
    const sequence: GateSequenceItem[] = [
      { gateId: gate.id, openingId: 'main', reverse: false },
      { gateId: gate.id, openingId: 'main', reverse: true },
      { gateId: nextGate.id, openingId: 'main', reverse: false },
    ]

    const path = calculateFlightPath([gate, nextGate], sequence)
    const transitionBetweenOppositePasses = path.sampledSegments[1]
    const maxLateralOffset = Math.max(...transitionBetweenOppositePasses.map((point) => Math.abs(point.x)))
    const pointsInsideOpening = transitionBetweenOppositePasses.filter((point) => (
      Math.abs(point.x) < 0.6
      && Math.abs(point.z) < 0.3
      && point.y >= 0
      && point.y <= GATE_BASE_HEIGHT
    ))

    expect(maxLateralOffset).toBeGreaterThanOrEqual(0.6 + GATE_STRUCTURE_CLEARANCE - 0.01)
    expect(pointsInsideOpening).toHaveLength(0)
  })

  it('routes around a gate instead of approaching from the red side', () => {
    const gates = [
      createGate('g1', 0, 0, 20),
      createGate('g2', 0, 0, 10),
    ]

    const path = calculateFlightPath(gates)
    const entryAnchor = { x: 0, z: 9.55 }
    const entrySegmentIndex = path.sampledSegments.findIndex((segment) => {
      const end = segment[segment.length - 1]
      return Math.abs(end.x - entryAnchor.x) < 0.01 && Math.abs(end.z - entryAnchor.z) < 0.01
    })
    const transitionSegmentsToSecondGate = path.sampledSegments.slice(1, entrySegmentIndex + 1)
    const lastTransitionSegment = transitionSegmentsToSecondGate[transitionSegmentsToSecondGate.length - 1]

    expect(entrySegmentIndex).toBeGreaterThan(1)
    expect(lastTransitionSegment[lastTransitionSegment.length - 1].x).toBeCloseTo(0, 5)
    expect(lastTransitionSegment[lastTransitionSegment.length - 1].z).toBeCloseTo(entryAnchor.z, 5)

    const maxLateralOffset = Math.max(...transitionSegmentsToSecondGate.flat().map(point => Math.abs(point.x)))
    expect(maxLateralOffset).toBeGreaterThan(0.5)
  })

  it('does not route around a gate when the green side is already ahead', () => {
    const gates = [
      createGate('g1', 0, 0, 0),
      createGate('g2', 0, 0, 10),
    ]

    const path = calculateFlightPath(gates)
    const entryAnchor = { x: 0, z: 9.55 }
    const entrySegmentIndex = path.sampledSegments.findIndex((segment) => {
      const end = segment[segment.length - 1]
      return Math.abs(end.x - entryAnchor.x) < 0.01 && Math.abs(end.z - entryAnchor.z) < 0.01
    })
    const transitionSegmentsToSecondGate = path.sampledSegments.slice(1, entrySegmentIndex + 1)
    const maxLateralOffset = Math.max(...transitionSegmentsToSecondGate.flat().map(point => Math.abs(point.x)))

    expect(entrySegmentIndex).toBe(1)
    expect(maxLateralOffset).toBeLessThan(0.01)
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

    // points includes 3 control points per segment (from, cp1, cp2).
    // When avoidance is triggered, a segment gets 6 control points (2 curves × 3).
    // So length >= gates.length * 3.
    expect(path.points.length).toBeGreaterThanOrEqual(gates.length * 3)

    // Verify first point starts at the first gate's green-side entry anchor
    const firstGateEntry = {
      x: gates[0].position.x,
      y: gates[0].position.y + GATE_BASE_HEIGHT / 2,
      z: gates[0].position.z - 0.45,
    }
    const p0 = path.points[0]
    expect(Math.abs(p0.x - firstGateEntry.x)).toBeLessThan(0.01)
    expect(Math.abs(p0.y - firstGateEntry.y)).toBeLessThan(0.01)
    expect(Math.abs(p0.z - firstGateEntry.z)).toBeLessThan(0.01)
  })

  it('keeps lower-to-upper double gate transitions outside the gate structure clearance', () => {
    const gate: Gate = {
      id: 'double-1',
      type: 'double',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('double'),
    }
    const nextGate = createGate('g2', 8, 0, 0)
    const sequence: GateSequenceItem[] = [
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
      { gateId: nextGate.id, openingId: 'main', reverse: false },
    ]

    const path = calculateFlightPath([gate, nextGate], sequence)
    const transitionFromLowerToUpper = path.sampledSegments[1]
    const maxOutsideOffset = Math.max(...transitionFromLowerToUpper.map((point) => Math.abs(point.x)))

    expect(maxOutsideOffset).toBeGreaterThanOrEqual(0.6 + GATE_STRUCTURE_CLEARANCE - 0.01)
  })

  it('routes h-gate lower-to-backrest transitions on the backrest side', () => {
    const gate: Gate = {
      id: 'h-gate-left',
      type: 'h-gate',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('h-gate'),
    }
    const nextGate = createGate('g2', 8, 0, 0)
    const sequence: GateSequenceItem[] = [
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'backrest-pass', reverse: false },
      { gateId: nextGate.id, openingId: 'main', reverse: false },
    ]

    const path = calculateFlightPath([gate, nextGate], sequence)
    const transitionFromLowerToBackrest = path.sampledSegments[1]
    const fullTransition = path.sampledSegments.slice(1, 4).flat()
    const expectedSide = getHGateBackrestSide(gate.id)
    const lowerOpening = gate.openings.find((opening) => opening.id === 'lower')
    const furthestSidePoint = transitionFromLowerToBackrest.reduce((furthest, point) => (
      Math.abs(point.x) > Math.abs(furthest.x) ? point : furthest
    ))
    const pointsReturningThroughLowerEntry = fullTransition.filter((point) => (
      lowerOpening
      && Math.abs(point.x) < lowerOpening.width / 2
      && point.z < -0.01
      && point.y >= lowerOpening.position.y - lowerOpening.height / 2
      && point.y <= lowerOpening.position.y + lowerOpening.height / 2
    ))

    expect(Math.sign(furthestSidePoint.x)).toBe(expectedSide)
    expect(Math.abs(furthestSidePoint.x)).toBeGreaterThanOrEqual(0.6 + GATE_STRUCTURE_CLEARANCE - 0.01)
    expect(pointsReturningThroughLowerEntry).toHaveLength(0)
  })

  it('routes rotated h-gate transitions on the rotated backrest side', () => {
    const gate: Gate = {
      id: 'h-gate-right',
      type: 'h-gate',
      position: { x: 0, y: 0, z: 0 },
      rotation: 90,
      openings: createDefaultGateOpenings('h-gate'),
    }
    const nextGate = createGate('g2', 8, 0, 0)
    const sequence: GateSequenceItem[] = [
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'backrest-pass', reverse: false },
      { gateId: nextGate.id, openingId: 'main', reverse: false },
    ]

    const path = calculateFlightPath([gate, nextGate], sequence)
    const transitionFromLowerToBackrest = path.sampledSegments[1]
    const expectedSide = getHGateBackrestSide(gate.id)
    const furthestSidePoint = transitionFromLowerToBackrest.reduce((furthest, point) => (
      Math.abs(point.z) > Math.abs(furthest.z) ? point : furthest
    ))

    expect(Math.sign(furthestSidePoint.z)).toBe(-expectedSide)
    expect(Math.abs(furthestSidePoint.z)).toBeGreaterThanOrEqual(0.6 + GATE_STRUCTURE_CLEARANCE - 0.01)
  })

  it('routes double-h lower-to-middle and middle-to-upper transitions on the extension side', () => {
    const gate: Gate = {
      id: 'double-h-extension-side',
      type: 'double-h',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('double-h'),
    }
    const nextGate = createGate('g2', 8, 0, 0)
    const sequence: GateSequenceItem[] = [
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'middle', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
      { gateId: nextGate.id, openingId: 'main', reverse: false },
    ]

    const path = calculateFlightPath([gate, nextGate], sequence)
    const lowerToMiddleTransition = path.sampledSegments[1]
    const middleToUpperTransition = path.sampledSegments[5]
    const expectedSide = getHGateBackrestSide(gate.id)
    const lowerToMiddleSidePoint = lowerToMiddleTransition.reduce((furthest, point) => (
      Math.abs(point.x) > Math.abs(furthest.x) ? point : furthest
    ))
    const middleToUpperSidePoint = middleToUpperTransition.reduce((furthest, point) => (
      Math.abs(point.x) > Math.abs(furthest.x) ? point : furthest
    ))

    expect(Math.sign(lowerToMiddleSidePoint.x)).toBe(expectedSide)
    expect(Math.abs(lowerToMiddleSidePoint.x)).toBeGreaterThanOrEqual(0.6 + GATE_STRUCTURE_CLEARANCE - 0.01)
    expect(Math.sign(middleToUpperSidePoint.x)).toBe(expectedSide)
    expect(Math.abs(middleToUpperSidePoint.x)).toBeGreaterThanOrEqual(0.6 + GATE_STRUCTURE_CLEARANCE - 0.01)
  })

  it('approaches dive gates from at least 0.5m above the top before diving through the center', () => {
    const startGate = createGate('start', 0, 0, 0)
    const diveGate: Gate = {
      id: 'dive-gate',
      type: 'dive',
      position: { x: 0, y: 0, z: 10 },
      rotation: 0,
      openings: createDefaultGateOpenings('dive', 'dive-gate'),
    }
    const sequence: GateSequenceItem[] = [
      { gateId: startGate.id, openingId: 'main', reverse: false },
      { gateId: diveGate.id, openingId: 'entry-top', reverse: false },
      { gateId: diveGate.id, openingId: diveGate.openings[1].id, reverse: false },
    ]

    const path = calculateFlightPath([startGate, diveGate], sequence)
    const transitionToDive = path.sampledSegments[1]
    const diveThroughTop = path.sampledSegments[2]
    const topY = diveGate.position.y + GATE_BASE_HEIGHT
    const approachY = topY + DIVE_TOP_APPROACH_CLEARANCE
    const insideY = topY - DIVE_TOP_APPROACH_CLEARANCE
    const transitionEnd = transitionToDive[transitionToDive.length - 1]
    const diveStart = diveThroughTop[0]
    const diveEnd = diveThroughTop[diveThroughTop.length - 1]

    expect(transitionEnd.x).toBeCloseTo(diveGate.position.x, 5)
    expect(transitionEnd.z).toBeCloseTo(diveGate.position.z, 5)
    expect(transitionEnd.y).toBeGreaterThanOrEqual(approachY - 0.01)
    expect(diveStart).toEqual(transitionEnd)
    expect(diveEnd.x).toBeCloseTo(diveGate.position.x, 5)
    expect(diveEnd.z).toBeCloseTo(diveGate.position.z, 5)
    expect(diveEnd.y).toBeCloseTo(insideY, 5)
  })

  it('routes directly from a dive gate top entry to the nearest side exit opening', () => {
    const startGate = createGate('start', 0, 0, 0)
    const diveGate: Gate = {
      id: 'dive-gate',
      type: 'dive',
      position: { x: 0, y: 0, z: 10 },
      rotation: 0,
      openings: createDefaultGateOpenings('dive', 'dive-gate'),
    }
    const sequence: GateSequenceItem[] = [
      { gateId: startGate.id, openingId: 'main', reverse: false },
      { gateId: diveGate.id, openingId: 'entry-top', reverse: false },
      { gateId: diveGate.id, openingId: diveGate.openings[1].id, reverse: false },
    ]

    const path = calculateFlightPath([startGate, diveGate], sequence)
    const transitionFromTopToExit = path.sampledSegments[3]
    const transitionEnd = transitionFromTopToExit[transitionFromTopToExit.length - 1]
    const lowestPoint = Math.min(...transitionFromTopToExit.map((point) => point.y))

    expect(transitionEnd.x).toBeCloseTo(-0.15, 5)
    expect(transitionEnd.y).toBeCloseTo(GATE_BASE_HEIGHT / 2, 5)
    expect(transitionEnd.z).toBeCloseTo(diveGate.position.z, 5)
    expect(lowestPoint).toBeGreaterThanOrEqual(GATE_BASE_HEIGHT / 2 - 0.01)
  })
})




type TestPoint = { x: number; y: number; z: number }

const createZeroSizeGate = (id: string, y: number): Gate => ({
  id,
  type: 'standard',
  position: { x: 0, y, z: 0 },
  rotation: 0,
  openings: [{ id: 'main', position: { x: 0, y: 0, z: 0 }, width: 0, height: 0, rotation: 0 }],
})

function polylineLength(points: readonly TestPoint[]): number {
  let total = 0
  for (let index = 1; index < points.length; index++) {
    total += Math.sqrt(
      (points[index].x - points[index - 1].x) ** 2
      + (points[index].y - points[index - 1].y) ** 2
      + (points[index].z - points[index - 1].z) ** 2,
    )
  }
  return total
}

function distanceToSegment(point: TestPoint, start: TestPoint, end: TestPoint): number {
  const delta = new Vector3(end.x - start.x, end.y - start.y, end.z - start.z)
  const lengthSquared = delta.lengthSq()
  const rawT = lengthSquared === 0
    ? 0
    : new Vector3(point.x - start.x, point.y - start.y, point.z - start.z).dot(delta) / lengthSquared
  const t = Math.max(0, Math.min(1, rawT))
  return new Vector3(point.x, point.y, point.z).distanceTo(new Vector3(
    start.x + delta.x * t,
    start.y + delta.y * t,
    start.z + delta.z * t,
  ))
}

function distanceToPolyline(point: TestPoint, polyline: readonly TestPoint[]): number {
  let closest = Number.POSITIVE_INFINITY
  for (let index = 1; index < polyline.length; index++) {
    closest = Math.min(closest, distanceToSegment(point, polyline[index - 1], polyline[index]))
  }
  return closest
}

function authoredPoint(
  data: ReturnType<typeof calculateFlightPathWithControlPoints>,
  legIndex: number,
  sampleIndex: number,
  id: string,
  delta: TestPoint,
): IdealLinePoint {
  const base = data.path.sampledLegs[legIndex][sampleIndex]
  return {
    id,
    leg: data.legRefs[legIndex],
    u: data.sampledLegUs[legIndex][sampleIndex],
    position: { x: base.x + delta.x, y: base.y + delta.y, z: base.z + delta.z },
  }
}

describe('calculateFlightPathWithControlPoints', () => {
  const straightGates = [createGate('g1', 0, 0, 0), createGate('g2', 0, 0, 8)]

  it('leaves the base route exact without points', () => {
    // Given straight, dive, tunnel and same-gate fixtures
    const diveGate: Gate = {
      id: 'dive', type: 'dive', position: { x: 0, y: 0, z: 10 }, rotation: 0,
      openings: createDefaultGateOpenings('dive', 'dive'),
    }
    const fixtures = [
      { gates: straightGates, sequence: undefined },
      { gates: [createGate('a', 0, 0, 0), createGate('b', 4, 0, 5), createGate('c', -2, 0, 9)], sequence: undefined },
      { gates: [createGate('start', 0, 0, 0), diveGate], sequence: [
        { gateId: 'start', openingId: 'main', reverse: false },
        { gateId: 'dive', openingId: 'entry-top', reverse: false },
        { gateId: 'dive', openingId: diveGate.openings[1].id, reverse: false },
      ] },
      { gates: [createOctagonalTunnelGate('tunnel', 0, 0), createGate('g2', 0, 0, 10)], sequence: undefined },
      { gates: straightGates, sequence: [
        { gateId: 'g1', openingId: 'main', reverse: false },
        { gateId: 'g1', openingId: 'main', reverse: true },
        { gateId: 'g2', openingId: 'main', reverse: false },
      ] },
    ]
    // When calculating with absent and empty custom-point arrays
    for (const fixture of fixtures) {
      const base = calculateFlightPath(fixture.gates, fixture.sequence)
      const wrapped = calculateFlightPathWithControlPoints(fixture.gates, fixture.sequence)
      const explicitEmpty = calculateFlightPathWithControlPoints(fixture.gates, fixture.sequence, [])
      // Then the path is exact and all metadata stays parallel
      expect(wrapped.path).toEqual(base)
      expect(explicitEmpty.path).toEqual(base)
      expect(wrapped.idealLinePoints).toEqual([])
      expect(wrapped.sampledLegIndexes).toHaveLength(base.sampledSegments.length)
      expect(wrapped.sampledLegUs).toHaveLength(base.sampledLegs.length)
      expect(wrapped.legRefs).toHaveLength(base.sampledLegs.length)
    }
  })

  it('shapes only the leg that owns the point', () => {
    // Given a three-gate route and one elevated point on leg zero
    const gates = [createGate('a', 0, 0, 0), createGate('b', 0, 0, 8), createGate('c', 6, 0, 8)]
    const base = calculateFlightPathWithControlPoints(gates)
    const point = authoredPoint(base, 0, 20, 'p1', { x: 0, y: 2, z: 0 })
    // When shaping that leg
    const edited = calculateFlightPathWithControlPoints(gates, undefined, [point])
    // Then only leg zero changes and its diagnostics stay intact
    expect(edited.path.sampledLegs[0]).not.toEqual(base.path.sampledLegs[0])
    expect(edited.path.sampledLegs.slice(1)).toEqual(base.path.sampledLegs.slice(1))
    expect(edited.path.segments).toEqual(base.path.segments)
    expect(edited.path.points).toEqual(base.path.points)
    expect(edited.path.totalLength).toBeCloseTo(edited.path.sampledSegments.reduce((sum, segment) => sum + polylineLength(segment), 0), 9)
    expect(edited.path.totalLength).not.toBe(base.path.totalLength)
  })

  it('passes exactly through every authored point and keeps anchors pinned', () => {
    // Given two differently displaced points on one leg
    const base = calculateFlightPathWithControlPoints(straightGates)
    const points = [
      { id: 'p1', leg: base.legRefs[0], u: 0.3, position: { x: 0, y: 2.6, z: 2 } },
      { id: 'p2', leg: base.legRefs[0], u: 0.6, position: { x: 1, y: -0.4, z: 4 } },
    ]
    // When shaping the leg
    const edited = calculateFlightPathWithControlPoints(straightGates, undefined, points)
    // Then every point is an exact render sample and leg anchors are unchanged
    for (const point of points) {
      const index = edited.sampledLegUs[0].findIndex((u) => Math.abs(u - point.u) < 1e-12)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(edited.path.sampledLegs[0][index]).toEqual(point.position)
      expect(distanceToPolyline(point.position, edited.path.sampledLegs[0])).toBeLessThan(1e-9)
    }
    expect(edited.path.sampledLegs[0][0]).toEqual(base.path.sampledLegs[0][0])
    expect(edited.path.sampledLegs[0].at(-1)).toEqual(base.path.sampledLegs[0].at(-1))
  })

  it('has no sharp kink at authored points', () => {
    // Given two points that would create sharp corners with linear interpolation
    const base = calculateFlightPathWithControlPoints(straightGates)
    const points = [
      { id: 'p1', leg: base.legRefs[0], u: 0.3, position: { x: 0, y: 2.6, z: 2 } },
      { id: 'p2', leg: base.legRefs[0], u: 0.6, position: { x: 1, y: -0.4, z: 4 } },
    ]
    // When measuring the chords immediately before and after each point
    const edited = calculateFlightPathWithControlPoints(straightGates, undefined, points)
    for (const point of points) {
      const index = edited.sampledLegUs[0].findIndex((u) => Math.abs(u - point.u) < 1e-12)
      const samples = edited.path.sampledLegs[0]
      const before = new Vector3(samples[index].x - samples[index - 1].x, samples[index].y - samples[index - 1].y, samples[index].z - samples[index - 1].z).normalize()
      const after = new Vector3(samples[index + 1].x - samples[index].x, samples[index + 1].y - samples[index].y, samples[index + 1].z - samples[index].z).normalize()
      // Then the visible direction change remains below thirty degrees
      expect(before.angleTo(after)).toBeLessThan(Math.PI / 6)
    }
    expect(Math.max(...edited.path.sampledLegs[0].map((point) => point.y))).toBeGreaterThan(1)
  })

  it('ignores dormant points without changing the route', () => {
    // Given a point whose leg is not present
    const base = calculateFlightPathWithControlPoints(straightGates)
    const dormant = {
      id: 'dormant',
      leg: { from: { gateId: 'missing-a', openingId: 'main' }, to: { gateId: 'missing-b', openingId: 'main' } },
      u: 0.5,
      position: { x: 0, y: 10, z: 0 },
    }
    // When calculating with that point
    const edited = calculateFlightPathWithControlPoints(straightGates, undefined, [dormant])
    // Then the route is exact and no point resolves
    expect(edited.path).toEqual(base.path)
    expect(edited.idealLinePoints).toEqual([])
  })

  it('keeps every sample list and leg-u mapping in sync', () => {
    // Given two shaped legs
    const gates = [createGate('a', 0, 0, 0), createGate('b', 0, 0, 8), createGate('c', 6, 0, 8)]
    const base = calculateFlightPathWithControlPoints(gates)
    const points = [authoredPoint(base, 0, 20, 'p1', { x: 0, y: 2, z: 0 }), authoredPoint(base, 1, 20, 'p2', { x: 1, y: 1, z: 0 })]
    // When shaping both legs
    const edited = calculateFlightPathWithControlPoints(gates, undefined, points)
    // Then all sample projections and metadata have identical cardinality and order
    expect(edited.path.sampledPoints).toEqual(edited.path.sampledSegments.flat())
    expect(edited.path.sampledPoints).toEqual(edited.path.sampledLegs.flat())
    expect(edited.sampledLegIndexes).toHaveLength(edited.path.sampledSegments.length)
    expect(edited.legRefs).toHaveLength(edited.path.sampledLegs.length)
    edited.sampledLegUs.forEach((us, legIndex) => {
      expect(us).toHaveLength(edited.path.sampledLegs[legIndex].length)
      us.forEach((u, index) => {
        expect(Number.isFinite(u)).toBe(true)
        if (index > 0) expect(u).toBeGreaterThanOrEqual(us[index - 1])
      })
    })
  })

  it('keeps the authored u and world point when a gate moves', () => {
    // Given an authored point on the first leg
    const base = calculateFlightPathWithControlPoints(straightGates)
    const point = authoredPoint(base, 0, 20, 'stable', { x: 0, y: 2, z: 0 })
    // When the second gate moves
    const movedGates = [straightGates[0], { ...straightGates[1], position: { x: 2, y: 1, z: 9 } }]
    const moved = calculateFlightPathWithControlPoints(movedGates, undefined, [point])
    // Then identity, anchor and world position are unchanged while the route reshapes
    expect(moved.idealLinePoints[0]).toEqual({ id: 'stable', legIndex: 0, u: point.u, position: point.position })
    expect(moved.path.sampledLegs[0]).not.toEqual(base.path.sampledLegs[0])
  })

  it('keeps zero-length and sub-metre routes finite', () => {
    // Given zero-length and sub-metre routes with a candidate point
    const zeroGates = [createZeroSizeGate('a', 0), createZeroSizeGate('b', 0)]
    const zeroBase = calculateFlightPathWithControlPoints(zeroGates)
    const zeroPoint = { id: 'inert', leg: zeroBase.legRefs[0], u: 0.5, position: { x: 0, y: 2, z: 0 } }
    // When resolving the zero-length route
    const zero = calculateFlightPathWithControlPoints(zeroGates, undefined, [zeroPoint])
    // Then the point is inert and every u is a finite zero
    expect(zero.idealLinePoints).toEqual([])
    expect(zero.sampledLegUs.flat().every((u) => u === 0)).toBe(true)
    expect(zero.path.sampledPoints.every((point) => Number.isFinite(point.x + point.y + point.z))).toBe(true)

    const subGates = [createZeroSizeGate('a', 0), createZeroSizeGate('b', 0.4)]
    const subBase = calculateFlightPathWithControlPoints(subGates)
    const subSampleIndex = subBase.sampledLegUs[0].findIndex((u) => u > 0 && u < 1)
    const subPoint = authoredPoint(subBase, 0, subSampleIndex, 'sub', { x: 0, y: 1, z: 0 })
    const sub = calculateFlightPathWithControlPoints(subGates, undefined, [subPoint])
    expect(sub.idealLinePoints).toHaveLength(1)
    expect(sub.path.sampledPoints.every((point) => Number.isFinite(point.x + point.y + point.z))).toBe(true)
  })
})
