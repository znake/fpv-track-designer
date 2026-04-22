import { Vector3, CubicBezierCurve3, Quaternion } from 'three'
import type { Gate } from '../types'

const MIN_CURVE_SAMPLES_PER_SEGMENT = 80
const MAX_CURVE_SAMPLES_PER_SEGMENT = 400
const CURVE_SAMPLES_PER_METER = 14
export const CONTROL_POINT_FACTOR = 0.4
const ENTRY_OFFSET = 0.4

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
}

const ARROW_SPACING = 8
export const FLIGHT_PATH_HEIGHT = 0.6

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

/**
 * Returns the exit direction for a gate — opposite of the entry direction.
 * After passing through a gate, the drone exits in this direction.
 */
function getGateExitDirection(gate: Gate): Vector3 {
  return getGateEntryDirection(gate).negate()
}

/**
 * Gets the point where the drone enters a gate, offset from the gate center
 * in the entry direction (approaching from the front/entry side).
 */
function getGateEntryPoint(gate: Gate): Vector3 {
  const dir = getGateEntryDirection(gate)
  return new Vector3(
    gate.position.x + dir.x * ENTRY_OFFSET,
    gate.position.y + FLIGHT_PATH_HEIGHT,
    gate.position.z + dir.z * ENTRY_OFFSET,
  )
}

/**
 * Gets the point where the drone exits a gate, offset from the gate center
 * in the exit direction (leaving through the back side).
 */
function getGateExitPoint(gate: Gate): Vector3 {
  const dir = getGateExitDirection(gate)
  return new Vector3(
    gate.position.x + dir.x * ENTRY_OFFSET,
    gate.position.y + FLIGHT_PATH_HEIGHT,
    gate.position.z + dir.z * ENTRY_OFFSET,
  )
}

/**
 * Calculates the flight path through gates in the given sequence order.
 * The path approaches each gate from its entry (front) side and exits
 * through the back, respecting the one-directional nature of gates.
 *
 * @param gates - Array of unique gate definitions
 * @param gateSequence - Ordered array of gate IDs defining the fly-through order.
 *                       Same gate can appear multiple times but not consecutively.
 *                       Defaults to sequential order of gates array.
 */
export function calculateFlightPath(gates: Gate[], gateSequence?: string[]): FlightPath {
  if (gates.length < 2) {
    return { segments: [], arrows: [], totalLength: 0, points: [], sampledPoints: [] }
  }

  // Build ordered gate list from sequence
  const seq = gateSequence ?? gates.map(g => g.id)
  const gateMap = new Map(gates.map(g => [g.id, g]))
  const orderedGates = seq.map(id => gateMap.get(id)).filter((g): g is Gate => g !== undefined)

  if (orderedGates.length < 2) {
    return { segments: [], arrows: [], totalLength: 0, points: [], sampledPoints: [] }
  }

  const n = orderedGates.length
  const curves: { curve: CubicBezierCurve3; length: number }[] = []
  const allPoints: Vector3[] = []
  const segments: PathSegment[] = []
  let totalLength = 0

  for (let i = 0; i < n; i++) {
    const fromGate = orderedGates[i]
    const toGate = orderedGates[(i + 1) % n]

    const from = getGateExitPoint(fromGate)
    const to = getGateEntryPoint(toGate)

    const dist = from.distanceTo(to) || 1

    // Control points: exit from from-gate in its exit direction,
    // approach to-gate from its entry direction
    const fromExitDir = getGateExitDirection(fromGate)
    const toEntryDir = getGateEntryDirection(toGate)

    const cp1 = from.clone().add(fromExitDir.clone().multiplyScalar(dist * CONTROL_POINT_FACTOR))
    const cp2 = to.clone().sub(toEntryDir.clone().multiplyScalar(dist * CONTROL_POINT_FACTOR))

    const curve = new CubicBezierCurve3(from, cp1, cp2, to)
    const length = curve.getLength()
    curves.push({ curve, length })

    totalLength += length

    allPoints.push(from, cp1, cp2)

    const tangent = normalize(curve.getTangent(0))
    segments.push({
      from: fromGate.position,
      to: toGate.position,
      direction: { x: tangent.x, y: tangent.y, z: tangent.z },
      length: distance3d(fromGate.position, toGate.position),
    })
  }

  // Sample points along all curves
  const sampledPoints: { x: number; y: number; z: number }[] = []
  for (const { curve, length } of curves) {
    const samples = getCurveSamples(length)
    for (let i = 0; i < samples; i++) {
      const t = i / samples
      const p = curve.getPoint(t)
      sampledPoints.push({ x: p.x, y: p.y, z: p.z })
    }
  }
  // Add final point of last curve to close the loop visually
  const lastPoint = curves[curves.length - 1].curve.getPoint(1)
  sampledPoints.push({ x: lastPoint.x, y: lastPoint.y, z: lastPoint.z })

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
  }
}
