import { Vector3, CubicBezierCurve3, Quaternion } from 'three'
import type { Gate } from '../types'

const MIN_CURVE_SAMPLES_PER_SEGMENT = 80
const MAX_CURVE_SAMPLES_PER_SEGMENT = 400
const CURVE_SAMPLES_PER_METER = 14
export const CONTROL_POINT_FACTOR = 0.25
const GATE_PASS_THROUGH_OFFSET = 0.45
const MAX_CONTROL_HANDLE_LENGTH = 2.5
const U_TURN_DOT_THRESHOLD = -0.3
const FORBIDDEN_ZONE_TOLERANCE = 0.2
const GATE_OPENING_HALF_WIDTH = 0.7
const MIN_CLEARANCE = 0.3
const GATE_AVOIDANCE_SIDE_MARGIN = 0.35
const GATE_AVOIDANCE_FRONT_MARGIN = 0.25

export interface PathSegment {
  from: { x: number; y: number; z: number }
  to: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  length: number
}

export interface ArrowPosition {
  position: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  quaternion: { x: number; y: number; z: number; w: number }
}

export interface FlightPath {
  segments: PathSegment[]
  arrows: ArrowPosition[]
  totalLength: number
  points: { x: number; y: number; z: number }[]
  sampledPoints: { x: number; y: number; z: number }[]
  sampledSegments: { x: number; y: number; z: number }[][]
}

const ARROW_SPACING = 1.5
export const GATE_BASE_HEIGHT = 1.2

function getGateFlightPathHeight(gate: Gate): number {
  return gate.position.y + (GATE_BASE_HEIGHT * gate.size) / 2
}

function createStraightCurve(from: Vector3, to: Vector3): CubicBezierCurve3 {
  const delta = to.clone().sub(from)
  const cp1 = from.clone().add(delta.clone().multiplyScalar(1 / 3))
  const cp2 = from.clone().add(delta.clone().multiplyScalar(2 / 3))
  return new CubicBezierCurve3(from, cp1, cp2, to)
}

function createDirectionalCurve(from: Vector3, to: Vector3, fromDirection: Vector3, toDirection: Vector3): CubicBezierCurve3 {
  const distance = from.distanceTo(to)
  const handleLength = Math.min(distance * CONTROL_POINT_FACTOR, MAX_CONTROL_HANDLE_LENGTH)
  const cp1 = from.clone().add(fromDirection.clone().multiplyScalar(handleLength))
  const cp2 = to.clone().sub(toDirection.clone().multiplyScalar(handleLength))
  return new CubicBezierCurve3(from, cp1, cp2, to)
}

function createAvoidanceCurve(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  waypoint: Vector3,
): { curves: { curve: CubicBezierCurve3; length: number }[]; totalLength: number } {
  const dist1 = from.distanceTo(waypoint)
  const handle1 = Math.min(dist1 * CONTROL_POINT_FACTOR, MAX_CONTROL_HANDLE_LENGTH)
  const cp1a = from.clone().add(fromDirection.clone().multiplyScalar(handle1))
  const cp1b = waypoint.clone().add(normalize(from.clone().sub(waypoint)).multiplyScalar(handle1))
  const curve1 = new CubicBezierCurve3(from, cp1a, cp1b, waypoint)
  const length1 = curve1.getLength()

  const dist2 = waypoint.distanceTo(to)
  const handle2 = Math.min(dist2 * CONTROL_POINT_FACTOR, MAX_CONTROL_HANDLE_LENGTH)
  const cp2a = waypoint.clone().multiplyScalar(2).sub(cp1b)
  const cp2b = to.clone().sub(toDirection.clone().multiplyScalar(handle2))
  const curve2 = new CubicBezierCurve3(waypoint, cp2a, cp2b, to)
  const length2 = curve2.getLength()

  return {
    curves: [
      { curve: curve1, length: length1 },
      { curve: curve2, length: length2 },
    ],
    totalLength: length1 + length2,
  }
}

function distance3d(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)
  if (len === 0) return new Vector3(0, 0, 0)
  return new Vector3(v.x / len, v.y / len, v.z / len)
}

function getCurveSamples(length: number): number {
  const byLength = Math.ceil(length * CURVE_SAMPLES_PER_METER)
  return Math.max(MIN_CURVE_SAMPLES_PER_SEGMENT, Math.min(MAX_CURVE_SAMPLES_PER_SEGMENT, byLength))
}

/**
 * Returns the entry direction for a gate based on its rotation.
 * The gate faces the direction of rotation (toward the next gate).
 * The entry side is opposite — the drone approaches from the back.
 * In local coords, the gate faces -Z before rotation; after rotation-y,
 * the entry (approach) direction is (-sin(rad), 0, -cos(rad)).
 */
export function getGateEntryDirection(gate: Gate): Vector3 {
  const rad = (gate.rotation * Math.PI) / 180
  return new Vector3(-Math.sin(rad), 0, -Math.cos(rad)).normalize()
}

function getGateExitDirection(gate: Gate): Vector3 {
  return getGateEntryDirection(gate).negate()
}

/**
 * Gets the opening center the ideal line should pass through.
 */
function getGateCenterPoint(gate: Gate): Vector3 {
  return new Vector3(
    gate.position.x,
    getGateFlightPathHeight(gate),
    gate.position.z,
  )
}

function getGateEntryPoint(gate: Gate): Vector3 {
  const center = getGateCenterPoint(gate)
  const offset = getGateEntryDirection(gate).multiplyScalar(GATE_PASS_THROUGH_OFFSET * gate.size)
  return center.add(offset)
}

function getGateExitPoint(gate: Gate): Vector3 {
  const center = getGateCenterPoint(gate)
  const offset = getGateExitDirection(gate).multiplyScalar(GATE_PASS_THROUGH_OFFSET * gate.size)
  return center.add(offset)
}

function isInForbiddenZone(point: Vector3, gate: Gate): boolean {
  const center = getGateCenterPoint(gate)
  return point.clone().sub(center).dot(getGateEntryDirection(gate)) < -FORBIDDEN_ZONE_TOLERANCE
}

function curvePassesForbiddenZone(curve: CubicBezierCurve3, gate: Gate): boolean {
  const center = getGateCenterPoint(gate)

  for (let t = 0.05; t < 0.95; t += 0.05) {
    const point = curve.getPoint(t)
    if (point.distanceTo(center) < 3 && isInForbiddenZone(point, gate)) {
      return true
    }
  }

  return false
}

function curveReentersGateOpening(curve: CubicBezierCurve3, gate: Gate): boolean {
  const center = getGateCenterPoint(gate)
  const rad = (gate.rotation * Math.PI) / 180
  const cosR = Math.cos(rad)
  const sinR = Math.sin(rad)
  const halfWidth = GATE_OPENING_HALF_WIDTH * gate.size

  for (let t = 0.2; t < 1; t += 0.03) {
    const point = curve.getPoint(t)
    const dx = point.x - center.x
    const dz = point.z - center.z
    const localX = dx * cosR + dz * sinR
    const localZ = -dx * sinR + dz * cosR

    if (Math.abs(localX) < halfWidth && Math.abs(localZ) < MIN_CLEARANCE) {
      return true
    }
  }

  return false
}

function calculateWaypointForSide(gate: Gate, side: 1 | -1): Vector3 {
  const center = getGateCenterPoint(gate)
  const entryDir = getGateEntryDirection(gate)
  const sideDir = new Vector3(entryDir.z, 0, -entryDir.x).normalize()
  const sideOffset = (GATE_OPENING_HALF_WIDTH + GATE_AVOIDANCE_SIDE_MARGIN) * gate.size
  const frontOffset = (GATE_PASS_THROUGH_OFFSET + GATE_AVOIDANCE_FRONT_MARGIN) * gate.size

  return center
    .clone()
    .add(sideDir.multiplyScalar(side * sideOffset))
    .add(entryDir.multiplyScalar(frontOffset))
}

/**
 * Calculates the flight path through gates in the given sequence order.
 * The ideal line should approach each gate from the green side, pass straight
 * through the opening, then curve outside the gate toward the next entry.
 *
 * @param gates - Array of unique gate definitions
 * @param gateSequence - Ordered array of gate IDs defining the fly-through order.
 *                       Same gate can appear multiple times but not consecutively.
 *                       Defaults to sequential order of gates array.
 */
export function calculateFlightPath(gates: Gate[], gateSequence?: string[]): FlightPath {
  if (gates.length < 2) {
    return { segments: [], arrows: [], totalLength: 0, points: [], sampledPoints: [], sampledSegments: [] }
  }

  // Build ordered gate list from sequence
  const seq = gateSequence ?? gates.map(g => g.id)
  const gateMap = new Map(gates.map(g => [g.id, g]))
  const orderedGates = seq.map(id => gateMap.get(id)).filter((g): g is Gate => g !== undefined)

  if (orderedGates.length < 2) {
    return { segments: [], arrows: [], totalLength: 0, points: [], sampledPoints: [], sampledSegments: [] }
  }

  const n = orderedGates.length
  const curves: { curve: CubicBezierCurve3; length: number }[] = []
  const allPoints: Vector3[] = []
  const segments: PathSegment[] = []
  let totalLength = 0

  for (let i = 0; i < n; i++) {
    const fromGate = orderedGates[i]
    const toGate = orderedGates[(i + 1) % n]

    const throughGateCurve = createStraightCurve(getGateEntryPoint(fromGate), getGateExitPoint(fromGate))
    const throughGateLength = throughGateCurve.getLength()
    curves.push({ curve: throughGateCurve, length: throughGateLength })
    totalLength += throughGateLength
    allPoints.push(throughGateCurve.v0, throughGateCurve.v1, throughGateCurve.v2)

    const from = getGateExitPoint(fromGate)
    const to = getGateEntryPoint(toGate)
    const fromDirection = getGateExitDirection(fromGate)
    const toDirection = getGateExitDirection(toGate)
    const standardCurve = createDirectionalCurve(from, to, fromDirection, toDirection)
    const tangent = normalize(getGateCenterPoint(toGate).clone().sub(getGateCenterPoint(fromGate)))

    let transitionCurves = [{ curve: standardCurve, length: standardCurve.getLength() }]
    let needsAvoidance = fromGate.id === toGate.id

    if (!needsAvoidance && curvePassesForbiddenZone(standardCurve, toGate)) {
      needsAvoidance = true
    }

    if (!needsAvoidance) {
      const approachDirection = normalize(to.clone().sub(from))
      if (approachDirection.dot(toDirection) < U_TURN_DOT_THRESHOLD) {
        needsAvoidance = true
      }
    }

    if (needsAvoidance) {
      const candidates = ([1, -1] as const).map((side) => {
        const waypoint = calculateWaypointForSide(toGate, side)
        return createAvoidanceCurve(from, fromDirection, to, toDirection, waypoint)
      })

      const validCandidates = candidates.filter((candidate) => candidate.curves.every(({ curve }) => !curveReentersGateOpening(curve, fromGate)))
      const pool = validCandidates.length > 0 ? validCandidates : candidates
      const best = pool.reduce((shortest, current) => current.totalLength < shortest.totalLength ? current : shortest)
      transitionCurves = best.curves
    }

    for (const { curve, length } of transitionCurves) {
      curves.push({ curve, length })
      totalLength += length
      allPoints.push(curve.v0, curve.v1, curve.v2)
    }

    segments.push({
      from: fromGate.position,
      to: toGate.position,
      direction: { x: tangent.x, y: tangent.y, z: tangent.z },
      length: distance3d(fromGate.position, toGate.position),
    })
  }

  // Sample points along all curves
  const sampledPoints: { x: number; y: number; z: number }[] = []
  const sampledSegments: { x: number; y: number; z: number }[][] = []

  for (const { curve, length } of curves) {
    const samples = getCurveSamples(length)
    const segmentPoints: { x: number; y: number; z: number }[] = []

    for (let i = 0; i < samples; i++) {
      const t = i / samples
      const p = curve.getPoint(t)
      const sampledPoint = { x: p.x, y: p.y, z: p.z }
      sampledPoints.push(sampledPoint)
      segmentPoints.push(sampledPoint)
    }

    const endPoint = curve.getPoint(1)
    const sampledEndPoint = { x: endPoint.x, y: endPoint.y, z: endPoint.z }
    sampledPoints.push(sampledEndPoint)
    segmentPoints.push(sampledEndPoint)
    sampledSegments.push(segmentPoints)
  }

  // Sample arrows along the path
  const arrows: ArrowPosition[] = []
  const arrowCount = Math.max(1, Math.floor(totalLength / ARROW_SPACING))

  for (let i = 0; i < arrowCount; i++) {
    const targetDist = (i / arrowCount) * totalLength
    let accumulatedDist = 0

    for (let ci = 0; ci < curves.length; ci++) {
      const { curve, length: segLen } = curves[ci]

      if (accumulatedDist + segLen >= targetDist || ci === curves.length - 1) {
        const localT = segLen > 0 ? (targetDist - accumulatedDist) / segLen : 0
        const clampedT = Math.max(0, Math.min(1, localT))
        const point = curve.getPointAt(clampedT)
        const tangent = curve.getTangentAt(clampedT)
        const dir = normalize(tangent)
        const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), dir)
        arrows.push({
          position: { x: point.x, y: point.y, z: point.z },
          direction: { x: tangent.x, y: tangent.y, z: tangent.z },
          quaternion: { x: q.x, y: q.y, z: q.z, w: q.w },
        })
        break
      }
      accumulatedDist += segLen
    }
  }

  return {
    segments,
    arrows,
    totalLength,
    points: allPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
    sampledPoints,
    sampledSegments,
  }
}
