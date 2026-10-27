import { CubicBezierCurve3, Quaternion, Vector3 } from 'three'
import type { Gate, GateOpening, GateSequenceItem, IdealLineLegRef, IdealLinePoint, Point3 } from '../types'
import { getHGateBackrestSide, normalizeGates } from './gateOpenings'
import { buildFallbackGateSequence, normalizeGateSequence } from './gateSequence'
import {
  basisPointAtU,
  createIdealLineOffsetField,
  groupIdealLinePointsByLeg,
} from './idealLine'
import type { IdealLineBasisSample } from './idealLine'

export { GATE_BASE_HEIGHT } from '../constants/gateDimensions'

/**
 * Ideal-line geometry in one module: the base routing curves are built exactly as before, and
 * optional custom points apply a smooth displacement to their individual legs.
 */

const MIN_CURVE_SAMPLES_PER_SEGMENT = 80
const MAX_CURVE_SAMPLES_PER_SEGMENT = 400
const CURVE_SAMPLES_PER_METER = 14
export const CONTROL_POINT_FACTOR = 0.25
const MAX_CONTROL_HANDLE_LENGTH = 2.5
const U_TURN_DOT_THRESHOLD = -0.3
const FORBIDDEN_ZONE_TOLERANCE = 0.2
const MIN_CLEARANCE = 0.3
export const DIVE_TOP_APPROACH_CLEARANCE = 0.5
export const GATE_STRUCTURE_CLEARANCE = 0.5
const GATE_AVOIDANCE_SIDE_MARGIN = GATE_STRUCTURE_CLEARANCE
const GATE_AVOIDANCE_FRONT_MARGIN = 0.25
const OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR = 1

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
  sampledLegs: { x: number; y: number; z: number }[][]
}

export interface ResolvedIdealLinePoint {
  id: string
  legIndex: number
  u: number
  position: Point3
}

export interface FlightPathWithControlPoints {
  path: FlightPath
  sampledLegIndexes: number[]
  sampledLegUs: number[][]
  idealLinePoints: ResolvedIdealLinePoint[]
  legRefs: IdealLineLegRef[]
}

interface BaseCurve {
  curve: CubicBezierCurve3
  length: number
  startDistance: number
  legIndex: number
  densePoints: Vector3[]
  arcLengths: number[]
  arcDivisions: number
}

interface GateVisit {
  gate: Gate
  opening: GateOpening
  reverse: boolean
}

const ARROW_SPACING = 1.5
const ARROW_TANGENT_DELTA = 0.01

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

function rotateLocalVector(x: number, z: number, rotation: number): { x: number; z: number } {
  const rad = (rotation * Math.PI) / 180
  const cosR = Math.cos(rad)
  const sinR = Math.sin(rad)

  return {
    x: x * cosR + z * sinR,
    z: -x * sinR + z * cosR,
  }
}

export function getGateEntryDirection(gate: Gate, opening: GateOpening, reverse = false): Vector3 {
  const pitchRad = ((opening.rotationX ?? 0) * Math.PI) / 180
  const yawRad = ((gate.rotation + opening.rotation) * Math.PI) / 180
  const pitchedLocalY = Math.sin(pitchRad)
  const pitchedLocalZ = -Math.cos(pitchRad)
  const direction = new Vector3(
    pitchedLocalZ * Math.sin(yawRad),
    pitchedLocalY,
    pitchedLocalZ * Math.cos(yawRad),
  ).normalize()
  return reverse ? direction.negate() : direction
}

function getGateExitDirection(gate: Gate, opening: GateOpening, reverse = false): Vector3 {
  return getGateEntryDirection(gate, opening, reverse).negate()
}

function getGateVisitCenterPoint(visit: GateVisit): Vector3 {
  const rotatedPosition = rotateLocalVector(visit.opening.position.x, visit.opening.position.z, visit.gate.rotation)
  return new Vector3(
    visit.gate.position.x + rotatedPosition.x,
    visit.gate.position.y + visit.opening.position.y,
    visit.gate.position.z + rotatedPosition.z,
  )
}

function getGateOpeningWidthDirection(gate: Gate, opening: GateOpening): Vector3 {
  const yawRad = ((gate.rotation + opening.rotation) * Math.PI) / 180
  return new Vector3(Math.cos(yawRad), 0, Math.sin(yawRad)).normalize()
}

function getGatePassThroughOffset(opening: GateOpening): number {
  const defaultOffset = Math.min(opening.width, opening.height) * 0.375
  return opening.id === 'entry-top' ? Math.max(defaultOffset, DIVE_TOP_APPROACH_CLEARANCE) : defaultOffset
}

function isOctagonalTunnelVisit(visit: GateVisit): boolean {
  return visit.gate.type === 'octagonal-tunnel' && visit.opening.id === 'main'
}

function getOctagonalTunnelPortalPoint(visit: GateVisit, localZ: number, outsideDirection: Vector3): Vector3 {
  const rotatedPosition = rotateLocalVector(0, localZ, visit.gate.rotation)
  const openingOffset = outsideDirection.multiplyScalar(getGatePassThroughOffset(visit.opening))

  return new Vector3(
    visit.gate.position.x + rotatedPosition.x,
    visit.gate.position.y + visit.opening.position.y,
    visit.gate.position.z + rotatedPosition.z,
  ).add(openingOffset)
}

function getGateEntryPoint(visit: GateVisit): Vector3 {
  if (isOctagonalTunnelVisit(visit)) {
    const entryDirection = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
    const entryLocalZ = visit.reverse ? OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR : -OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR
    return getOctagonalTunnelPortalPoint(visit, entryLocalZ, entryDirection)
  }

  const center = getGateVisitCenterPoint(visit)
  const offset = getGateEntryDirection(visit.gate, visit.opening, visit.reverse).multiplyScalar(getGatePassThroughOffset(visit.opening))
  return center.add(offset)
}

function getGateExitPoint(visit: GateVisit): Vector3 {
  if (isOctagonalTunnelVisit(visit)) {
    const exitDirection = getGateExitDirection(visit.gate, visit.opening, visit.reverse)
    const exitLocalZ = visit.reverse ? -OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR : OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR
    return getOctagonalTunnelPortalPoint(visit, exitLocalZ, exitDirection)
  }

  const center = getGateVisitCenterPoint(visit)
  const offset = getGateExitDirection(visit.gate, visit.opening, visit.reverse).multiplyScalar(getGatePassThroughOffset(visit.opening))
  return center.add(offset)
}

function isInForbiddenZone(point: Vector3, visit: GateVisit): boolean {
  const center = getGateVisitCenterPoint(visit)
  return point.clone().sub(center).dot(getGateEntryDirection(visit.gate, visit.opening, visit.reverse)) < -FORBIDDEN_ZONE_TOLERANCE
}

function curvePassesForbiddenZone(curve: CubicBezierCurve3, visit: GateVisit): boolean {
  const center = getGateVisitCenterPoint(visit)

  for (let t = 0.05; t < 0.95; t += 0.05) {
    const point = curve.getPoint(t)
    if (point.distanceTo(center) < 3 && isInForbiddenZone(point, visit)) {
      return true
    }
  }

  return false
}

function curveReentersGateOpening(curve: CubicBezierCurve3, visit: GateVisit): boolean {
  const center = getGateVisitCenterPoint(visit)
  const halfWidth = visit.opening.width / 2
  const halfHeight = visit.opening.height / 2
  const normal = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
  const widthDirection = getGateOpeningWidthDirection(visit.gate, visit.opening)
  const heightDirection = normalize(normal.clone().cross(widthDirection))

  for (let t = 0.2; t < 1; t += 0.03) {
    const point = curve.getPoint(t)
    const offset = point.clone().sub(center)
    const localX = offset.dot(widthDirection)
    const localY = offset.dot(heightDirection)
    const localZ = offset.dot(normal)

    if (Math.abs(localX) < halfWidth && Math.abs(localY) < halfHeight && Math.abs(localZ) < MIN_CLEARANCE) {
      return true
    }
  }

  return false
}

function calculateWaypointForSide(visit: GateVisit, side: 1 | -1): Vector3 {
  const center = getGateVisitCenterPoint(visit)
  const entryDir = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
  const sideDir = new Vector3(entryDir.z, 0, -entryDir.x).normalize()
  const sideOffset = visit.opening.width / 2 + GATE_AVOIDANCE_SIDE_MARGIN
  const frontOffset = getGatePassThroughOffset(visit.opening) + GATE_AVOIDANCE_FRONT_MARGIN

  return center
    .clone()
    .add(sideDir.multiplyScalar(side * sideOffset))
    .add(entryDir.multiplyScalar(frontOffset))
}

function calculateOutsideLaneWaypoint(visit: GateVisit, side: 1 | -1, frontDirection: Vector3): Vector3 {
  const center = getGateVisitCenterPoint(visit)
  const entryDir = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
  const sideDir = new Vector3(entryDir.z, 0, -entryDir.x).normalize()
  const sideOffset = visit.opening.width / 2 + GATE_STRUCTURE_CLEARANCE
  const frontOffset = getGatePassThroughOffset(visit.opening) + GATE_AVOIDANCE_FRONT_MARGIN

  return center
    .clone()
    .add(sideDir.multiplyScalar(side * sideOffset))
    .add(frontDirection.clone().normalize().multiplyScalar(frontOffset))
}

function getGateLocalXDirection(gate: Gate): Vector3 {
  const rotated = rotateLocalVector(1, 0, gate.rotation)
  return new Vector3(rotated.x, 0, rotated.z).normalize()
}

function calculatePhysicalSideOutsideLaneWaypoint(
  visit: GateVisit,
  physicalSideDirection: Vector3,
  frontDirection: Vector3,
): Vector3 {
  const center = getGateVisitCenterPoint(visit)
  const sideOffset = visit.opening.width / 2 + GATE_STRUCTURE_CLEARANCE
  const frontOffset = getGatePassThroughOffset(visit.opening) + GATE_AVOIDANCE_FRONT_MARGIN

  return center
    .clone()
    .add(physicalSideDirection.clone().normalize().multiplyScalar(sideOffset))
    .add(frontDirection.clone().normalize().multiplyScalar(frontOffset))
}

function createSameGatePhysicalSideClearanceCurve(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  fromVisit: GateVisit,
  toVisit: GateVisit,
  physicalSideDirection: Vector3,
): { curves: { curve: CubicBezierCurve3; length: number }[]; totalLength: number } {
  const fromWaypoint = calculatePhysicalSideOutsideLaneWaypoint(fromVisit, physicalSideDirection, fromDirection)
  const toWaypoint = calculatePhysicalSideOutsideLaneWaypoint(toVisit, physicalSideDirection, getGateEntryDirection(toVisit.gate, toVisit.opening, toVisit.reverse))
  const laneDirection = normalize(toWaypoint.clone().sub(fromWaypoint))
  const sideExitDirection = normalize(physicalSideDirection.clone().multiplyScalar(2).add(fromDirection))

  const curve1 = createDirectionalCurve(from, fromWaypoint, sideExitDirection, laneDirection)
  const curve2 = createStraightCurve(fromWaypoint, toWaypoint)
  const curve3 = createDirectionalCurve(toWaypoint, to, laneDirection, toDirection)
  const length1 = curve1.getLength()
  const length2 = curve2.getLength()
  const length3 = curve3.getLength()

  return {
    curves: [
      { curve: curve1, length: length1 },
      { curve: curve2, length: length2 },
      { curve: curve3, length: length3 },
    ],
    totalLength: length1 + length2 + length3,
  }
}

function isHGateBackrestTransition(fromVisit: GateVisit, toVisit: GateVisit): boolean {
  if (fromVisit.gate.id !== toVisit.gate.id || fromVisit.gate.type !== 'h-gate') {
    return false
  }

  const openingIds = new Set([fromVisit.opening.id, toVisit.opening.id])
  return openingIds.has('lower') && openingIds.has('backrest-pass')
}

function isDoubleHGateStackTransition(fromVisit: GateVisit, toVisit: GateVisit): boolean {
  if (fromVisit.gate.id !== toVisit.gate.id || fromVisit.gate.type !== 'double-h') {
    return false
  }

  const openingOrder = ['lower', 'middle', 'upper']
  const fromIndex = openingOrder.indexOf(fromVisit.opening.id)
  const toIndex = openingOrder.indexOf(toVisit.opening.id)

  return fromIndex >= 0 && toIndex >= 0 && Math.abs(fromIndex - toIndex) === 1
}

function isSideDefinedSameGateTransition(fromVisit: GateVisit, toVisit: GateVisit): boolean {
  return isHGateBackrestTransition(fromVisit, toVisit) || isDoubleHGateStackTransition(fromVisit, toVisit)
}

function createSameGateClearanceCurve(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  fromVisit: GateVisit,
  toVisit: GateVisit,
  side: 1 | -1,
): { curves: { curve: CubicBezierCurve3; length: number }[]; totalLength: number } {
  const fromWaypoint = calculateOutsideLaneWaypoint(fromVisit, side, fromDirection)
  const toWaypoint = calculateOutsideLaneWaypoint(toVisit, side, getGateEntryDirection(toVisit.gate, toVisit.opening, toVisit.reverse))
  const laneDirection = normalize(toWaypoint.clone().sub(fromWaypoint))

  const curve1 = createDirectionalCurve(from, fromWaypoint, fromDirection, laneDirection)
  const curve2 = createStraightCurve(fromWaypoint, toWaypoint)
  const curve3 = createDirectionalCurve(toWaypoint, to, laneDirection, toDirection)
  const length1 = curve1.getLength()
  const length2 = curve2.getLength()
  const length3 = curve3.getLength()

  return {
    curves: [
      { curve: curve1, length: length1 },
      { curve: curve2, length: length2 },
      { curve: curve3, length: length3 },
    ],
    totalLength: length1 + length2 + length3,
  }
}

function resolveVisits(gates: Gate[], gateSequence?: GateSequenceItem[]): GateVisit[] {
  const normalizedGates = normalizeGates(gates)
  const sequence = normalizeGateSequence(gateSequence ?? buildFallbackGateSequence(normalizedGates), normalizedGates)
  const gateMap = new Map(normalizedGates.map((gate) => [gate.id, gate]))

  return sequence.map((entry) => {
    const gate = gateMap.get(entry.gateId)
    if (!gate) return null

    const opening = gate.openings.find((candidate) => candidate.id === entry.openingId) ?? gate.openings[0]
    if (!opening) return null

    return {
      gate,
      opening,
      reverse: Boolean(entry.reverse),
    }
  }).filter((visit): visit is GateVisit => visit !== null)
}

function sampleCurvePoints(curve: CubicBezierCurve3, length: number): Vector3[] {
  const samples = getCurveSamples(length)
  const points: Vector3[] = []

  for (let i = 0; i < samples; i++) {
    points.push(curve.getPoint(i / samples))
  }

  points.push(curve.getPoint(1))
  return points
}

function getArcDistanceAtT(baseCurve: BaseCurve, t: number): number {
  const position = Math.max(0, Math.min(1, t)) * baseCurve.arcDivisions
  const index = Math.min(Math.floor(position), baseCurve.arcDivisions - 1)
  const fraction = position - index
  const start = baseCurve.arcLengths[index]
  const end = baseCurve.arcLengths[index + 1]
  return start + (end - start) * fraction
}

interface LegGeometry {
  length: number
  basis: IdealLineBasisSample[]
  points: { id: string; u: number; position: Point3 }[]
  field: ((u: number) => Point3) | null
  curveStartDistances: Record<number, number>
}

function createLegGeometries(
  baseCurves: readonly BaseCurve[],
  legCurveIndexes: readonly (readonly number[])[],
  legRefs: readonly IdealLineLegRef[],
  idealLinePoints: readonly IdealLinePoint[],
): LegGeometry[] {
  const groups = groupIdealLinePointsByLeg(idealLinePoints, legRefs)

  return legCurveIndexes.map((curveIndexes, legIndex) => {
    const curveStartDistances: Record<number, number> = {}
    let length = 0
    const basis: IdealLineBasisSample[] = []

    for (const curveIndex of curveIndexes) {
      const baseCurve = baseCurves[curveIndex]
      curveStartDistances[curveIndex] = length
      const sampleCount = baseCurve.densePoints.length - 1
      baseCurve.densePoints.forEach((point, sampleIndex) => {
        basis.push({
          u: length + getArcDistanceAtT(baseCurve, sampleIndex / sampleCount),
          point,
        })
      })
      length += baseCurve.length
    }

    for (const sample of basis) sample.u = length > 0 ? sample.u / length : 0

    const points = length > 1e-12
      ? groups.find((group) => group.legIndex === legIndex)?.points ?? []
      : []
    const field = points.length > 0
      ? createIdealLineOffsetField(points.map((point) => {
        const base = basisPointAtU(basis, point.u)
        return {
          u: point.u,
          offset: {
            x: point.position.x - base.x,
            y: point.position.y - base.y,
            z: point.position.z - base.z,
          },
        }
      }))
      : null

    return { length, basis, points, field, curveStartDistances }
  })
}

interface RenderEntry {
  u: number
  base: Point3
  authoredPosition?: Point3
}

function createRenderSamples(
  baseCurve: BaseCurve,
  leg: LegGeometry,
  curveStartDistance: number,
): { samples: Point3[]; us: number[] } {
  const entries: RenderEntry[] = []
  const sampleCount = baseCurve.densePoints.length - 1

  baseCurve.densePoints.forEach((point, sampleIndex) => {
    entries.push({
      u: leg.length > 0
        ? (curveStartDistance + getArcDistanceAtT(baseCurve, sampleIndex / sampleCount)) / leg.length
        : 0,
      base: point,
    })
  })

  if (leg.field && leg.length > 0) {
    const curveEndDistance = curveStartDistance + baseCurve.length
    for (const point of leg.points) {
      const distance = point.u * leg.length
      if (distance <= curveStartDistance || distance >= curveEndDistance) continue
      entries.push({ u: point.u, base: basisPointAtU(leg.basis, point.u), authoredPosition: point.position })
    }
    entries.sort((a, b) => a.u - b.u)
  }

  const samples = entries.map((entry) => {
    if (!leg.field || entry.u <= 1e-12 || entry.u >= 1 - 1e-12) return { ...entry.base }
    if (entry.authoredPosition) return { ...entry.authoredPosition }
    const offset = leg.field(entry.u)
    return { x: entry.base.x + offset.x, y: entry.base.y + offset.y, z: entry.base.z + offset.z }
  })

  return { samples, us: entries.map((entry) => entry.u) }
}

function getDeformedLegPoint(leg: LegGeometry, u: number): Point3 {
  const base = basisPointAtU(leg.basis, u)
  if (!leg.field || u <= 1e-12 || u >= 1 - 1e-12) return base
  const offset = leg.field(u)
  return { x: base.x + offset.x, y: base.y + offset.y, z: base.z + offset.z }
}

function getPolylineLength(points: readonly Point3[]): number {
  let total = 0

  for (let index = 1; index < points.length; index++) {
    total += distance3d(points[index - 1], points[index])
  }

  return total
}

function createArrowPositions(
  baseCurves: readonly BaseCurve[],
  legs: readonly LegGeometry[],
  baseTotalLength: number,
): ArrowPosition[] {
  const arrows: ArrowPosition[] = []
  const arrowCount = Math.max(1, Math.floor(baseTotalLength / ARROW_SPACING))

  for (let i = 0; i < arrowCount; i++) {
    const targetDist = (i / arrowCount) * baseTotalLength
    let accumulatedDist = 0

    for (let curveIndex = 0; curveIndex < baseCurves.length; curveIndex++) {
      const baseCurve = baseCurves[curveIndex]

      if (accumulatedDist + baseCurve.length >= targetDist || curveIndex === baseCurves.length - 1) {
        const localT = baseCurve.length > 0 ? (targetDist - accumulatedDist) / baseCurve.length : 0
        const clampedT = Math.max(0, Math.min(1, localT))
        const point = baseCurve.curve.getPointAt(clampedT)
        const baseTangent = baseCurve.curve.getTangentAt(clampedT)
        const leg = legs[baseCurve.legIndex]
        let position: Point3 = point
        let direction = baseTangent

        if (leg.field) {
          const curveStart = leg.curveStartDistances[curveIndex]
          const u = (curveStart + clampedT * baseCurve.length) / leg.length
          position = getDeformedLegPoint(leg, u)
          const deltaU = ARROW_TANGENT_DELTA / leg.length
          const before = getDeformedLegPoint(leg, u - deltaU)
          const after = getDeformedLegPoint(leg, u + deltaU)
          const deformed = normalize(new Vector3(after.x - before.x, after.y - before.y, after.z - before.z))
          if (deformed.lengthSq() > 0) direction = deformed
        }

        const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), direction)
        arrows.push({
          position: { x: position.x, y: position.y, z: position.z },
          direction: { x: direction.x, y: direction.y, z: direction.z },
          quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
        })
        break
      }

      accumulatedDist += baseCurve.length
    }
  }

  return arrows
}

function buildFlightPath(
  gates: Gate[],
  gateSequence: GateSequenceItem[] | undefined,
  idealLinePoints: readonly IdealLinePoint[],
): FlightPathWithControlPoints {
  const orderedVisits = resolveVisits(gates, gateSequence)
  if (orderedVisits.length < 2) {
    return {
      path: { segments: [], arrows: [], totalLength: 0, points: [], sampledPoints: [], sampledSegments: [], sampledLegs: [] },
      sampledLegIndexes: [],
      sampledLegUs: [],
      idealLinePoints: [],
      legRefs: [],
    }
  }

  const baseCurves: BaseCurve[] = []
  const allPoints: Vector3[] = []
  const segments: PathSegment[] = []
  let baseTotalLength = 0

  const registerCurve = (curve: CubicBezierCurve3, length: number, legIndex: number) => {
    baseCurves.push({
      curve,
      length,
      startDistance: baseTotalLength,
      legIndex,
      densePoints: sampleCurvePoints(curve, length),
      arcLengths: curve.getLengths(),
      arcDivisions: curve.arcLengthDivisions,
    })
    baseTotalLength += length
  }

  for (let i = 0; i < orderedVisits.length; i++) {
    const fromVisit = orderedVisits[i]
    const toVisit = orderedVisits[(i + 1) % orderedVisits.length]

    const throughGateCurve = createStraightCurve(getGateEntryPoint(fromVisit), getGateExitPoint(fromVisit))
    const throughGateLength = throughGateCurve.getLength()
    registerCurve(throughGateCurve, throughGateLength, i)
    allPoints.push(throughGateCurve.v0, throughGateCurve.v1, throughGateCurve.v2)

    const from = getGateExitPoint(fromVisit)
    const to = getGateEntryPoint(toVisit)
    const fromDirection = getGateExitDirection(fromVisit.gate, fromVisit.opening, fromVisit.reverse)
    const toDirection = getGateExitDirection(toVisit.gate, toVisit.opening, toVisit.reverse)
    const standardCurve = createDirectionalCurve(from, to, fromDirection, toDirection)
    const tangent = normalize(getGateVisitCenterPoint(toVisit).clone().sub(getGateVisitCenterPoint(fromVisit)))
    const isSameGateTransition = fromVisit.gate.id === toVisit.gate.id

    let transitionCurves = [{ curve: standardCurve, length: standardCurve.getLength() }]
    let needsAvoidance = isSameGateTransition
      && fromVisit.opening.id === toVisit.opening.id
    let reentersFromOpening = false

    if (!needsAvoidance && curvePassesForbiddenZone(standardCurve, toVisit)) {
      needsAvoidance = true
    }

    if (curveReentersGateOpening(standardCurve, fromVisit)) {
      reentersFromOpening = true
      needsAvoidance = true
    }

    if (!needsAvoidance) {
      const approachDirection = normalize(to.clone().sub(from))
      if (approachDirection.dot(toDirection) < U_TURN_DOT_THRESHOLD) {
        needsAvoidance = true
      }
    }

    if (isSideDefinedSameGateTransition(fromVisit, toVisit)) {
      const backrestSideDirection = getGateLocalXDirection(fromVisit.gate).multiplyScalar(getHGateBackrestSide(fromVisit.gate.id))
      const sideAwareCurve = createSameGatePhysicalSideClearanceCurve(
        from,
        fromDirection,
        to,
        toDirection,
        fromVisit,
        toVisit,
        backrestSideDirection,
      )
      transitionCurves = sideAwareCurve.curves
    } else if (needsAvoidance) {
      const candidates = ([1, -1] as const).map((side) => {
        if (isSameGateTransition) {
          return createSameGateClearanceCurve(from, fromDirection, to, toDirection, fromVisit, toVisit, side)
        }

        const waypoint = reentersFromOpening
          ? calculateOutsideLaneWaypoint(fromVisit, side, fromDirection)
          : calculateWaypointForSide(toVisit, side)
        return createAvoidanceCurve(from, fromDirection, to, toDirection, waypoint)
      })

      const validCandidates = candidates.filter((candidate) => candidate.curves.every(({ curve }) => !curveReentersGateOpening(curve, fromVisit)))
      const pool = validCandidates.length > 0 ? validCandidates : candidates
      const best = pool.reduce((shortest, current) => current.totalLength < shortest.totalLength ? current : shortest)
      transitionCurves = best.curves
    }

    for (const { curve, length } of transitionCurves) {
      registerCurve(curve, length, i)
      allPoints.push(curve.v0, curve.v1, curve.v2)
    }

    segments.push({
      from: fromVisit.gate.position,
      to: toVisit.gate.position,
      direction: { x: tangent.x, y: tangent.y, z: tangent.z },
      length: distance3d(fromVisit.gate.position, toVisit.gate.position),
    })
  }

  const legCurveIndexes: number[][] = orderedVisits.map(() => [])
  baseCurves.forEach((baseCurve, index) => {
    legCurveIndexes[baseCurve.legIndex].push(index)
  })

  const legRefs: IdealLineLegRef[] = orderedVisits.map((fromVisit, index) => {
    const toVisit = orderedVisits[(index + 1) % orderedVisits.length]
    return {
      from: { gateId: fromVisit.gate.id, openingId: fromVisit.opening.id },
      to: { gateId: toVisit.gate.id, openingId: toVisit.opening.id },
    }
  })
  const legs = createLegGeometries(baseCurves, legCurveIndexes, legRefs, idealLinePoints)
  const renderResults = baseCurves.map((baseCurve, index) => {
    const leg = legs[baseCurve.legIndex]
    return createRenderSamples(baseCurve, leg, leg.curveStartDistances[index])
  })
  const sampledSegments = renderResults.map((result) => result.samples)
  const sampledPoints = sampledSegments.flat()
  const sampledLegs = legCurveIndexes.map((curveIndexes) => curveIndexes.flatMap((curveIndex) => sampledSegments[curveIndex]))
  const sampledLegUs = legCurveIndexes.map((curveIndexes) => curveIndexes.flatMap((curveIndex) => renderResults[curveIndex].us))
  const resolvedPoints = legs.flatMap((leg, legIndex) => leg.points.map((point) => ({
    id: point.id,
    legIndex,
    u: point.u,
    position: point.position,
  })))
  const hasResolvedPoints = resolvedPoints.length > 0
  const totalLength = hasResolvedPoints
    ? sampledSegments.reduce((sum, segment) => sum + getPolylineLength(segment), 0)
    : baseTotalLength
  const arrows = createArrowPositions(baseCurves, legs, baseTotalLength)

  return {
    path: {
      segments,
      arrows,
      totalLength,
      points: allPoints.map((point) => ({ x: point.x, y: point.y, z: point.z })),
      sampledPoints,
      sampledSegments,
      sampledLegs,
    },
    sampledLegIndexes: baseCurves.map((baseCurve) => baseCurve.legIndex),
    sampledLegUs,
    idealLinePoints: resolvedPoints,
    legRefs,
  }
}

export function calculateFlightPath(
  gates: Gate[],
  gateSequence?: GateSequenceItem[],
): FlightPath {
  return buildFlightPath(gates, gateSequence, []).path
}

export function calculateFlightPathWithControlPoints(
  gates: Gate[],
  gateSequence?: GateSequenceItem[],
  idealLinePoints: readonly IdealLinePoint[] = [],
): FlightPathWithControlPoints {
  return buildFlightPath(gates, gateSequence, idealLinePoints)
}
