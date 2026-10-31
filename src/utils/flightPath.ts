import { CubicBezierCurve3, Curve, Quaternion, Vector3 } from 'three'
import type { Gate, GateOpening, GateSequenceItem, IdealLineLegRef, IdealLinePoint, Point3 } from '../types'
import { getHGateBackrestSide, normalizeGates } from './gateOpenings'
import { buildFallbackGateSequence, normalizeGateSequence } from './gateSequence'
import {
  basisPointAtU,
  createIdealLineOffsetField,
  groupIdealLinePointsByLeg,
} from './idealLine'
import type { IdealLineBasisSample } from './idealLine'
import { MIN_TRANSITION_RADIUS, planSmoothTransition, TRANSITION_LENGTH_BUDGET } from './routeCurves'
import type { RoutePlan } from './routeCurves'

import { GATE_BASE_HEIGHT } from '../constants/gateDimensions'

export { GATE_BASE_HEIGHT }

/**
 * Ideal-line geometry in one module: the base routing curves are built exactly as before, and
 * optional custom points apply a smooth displacement to their individual legs.
 */

const MIN_CURVE_SAMPLES_PER_SEGMENT = 120
const MAX_CURVE_SAMPLES_PER_SEGMENT = 700
const CURVE_SAMPLES_PER_METER = 24
const FORBIDDEN_ZONE_TOLERANCE = 0.2
const MIN_CLEARANCE = 0.3
export const DIVE_TOP_APPROACH_CLEARANCE = 0.5
export const GATE_STRUCTURE_CLEARANCE = 0.5
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

interface RouteCurve {
  getPoint: (t: number) => Vector3
  getPointAt: (t: number) => Vector3
  getTangentAt: (t: number) => Vector3
  getLength: () => number
  getLengths: (divisions?: number) => number[]
  arcLengthDivisions: number
  controlPoints: Vector3[]
  denseVertices?: Vector3[]
}

interface BaseCurve {
  curve: RouteCurve
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

type Detour = { curves: { curve: RouteCurve; length: number }[]; totalLength: number }

const ARROW_SPACING = 1.5
const ARROW_TANGENT_DELTA = 0.01

function createStraightCurve(from: Vector3, to: Vector3): CubicBezierCurve3 {
  const delta = to.clone().sub(from)
  const cp1 = from.clone().add(delta.clone().multiplyScalar(1 / 3))
  const cp2 = from.clone().add(delta.clone().multiplyScalar(2 / 3))
  return new CubicBezierCurve3(from, cp1, cp2, to)
}

class BezierRouteCurve implements RouteCurve {
  controlPoints: Vector3[]
  readonly curve: CubicBezierCurve3

  constructor(curve: CubicBezierCurve3) {
    this.curve = curve
    this.controlPoints = [curve.v0, curve.v1, curve.v2, curve.v3]
  }

  get arcLengthDivisions(): number {
    return this.curve.arcLengthDivisions
  }

  getPoint(t: number): Vector3 {
    return this.curve.getPoint(t)
  }

  getPointAt(t: number): Vector3 {
    return this.curve.getPointAt(t)
  }

  getTangentAt(t: number): Vector3 {
    return this.curve.getTangentAt(t)
  }

  getLength(): number {
    return this.curve.getLength()
  }

  getLengths(divisions?: number): number[] {
    return this.curve.getLengths(divisions)
  }
}

/** Piecewise-linear arc-length curve: the rounded polyline the detours are built from. */
class RoundedRouteCurve extends Curve<Vector3> implements RouteCurve {
  controlPoints: Vector3[]
  denseVertices: Vector3[]
  private readonly vertices: Vector3[]
  private readonly cumulative: number[]
  private readonly totalLength: number

  constructor(vertices: Vector3[], controlPoints: Vector3[]) {
    super()
    this.vertices = vertices
    this.denseVertices = vertices
    this.controlPoints = controlPoints
    this.cumulative = [0]
    let total = 0
    for (let index = 1; index < vertices.length; index++) {
      total += vertices[index].distanceTo(vertices[index - 1])
      this.cumulative.push(total)
    }
    this.totalLength = total
    this.arcLengthDivisions = Math.max(200, vertices.length * 4)
  }

  override getLength(): number {
    return this.totalLength
  }

  override getLengths(divisions = this.arcLengthDivisions): number[] {
    const lengths: number[] = []
    for (let index = 0; index <= divisions; index++) lengths.push((index / divisions) * this.totalLength)
    return lengths
  }

  override getPoint(t: number, target = new Vector3()): Vector3 {
    if (this.vertices.length === 0) return target.set(0, 0, 0)
    if (this.vertices.length === 1 || this.totalLength <= 1e-9) return target.copy(this.vertices[0])

    const distance = Math.max(0, Math.min(1, t)) * this.totalLength
    let index = 1
    while (index < this.cumulative.length - 1 && this.cumulative[index] < distance) index++
    const start = this.cumulative[index - 1]
    const end = this.cumulative[index]
    const fraction = end > start ? (distance - start) / (end - start) : 0
    return target.copy(this.vertices[index - 1]).lerp(this.vertices[index], fraction)
  }
}

/**
 * Exact circle-straight-circle transition: points are evaluated on the analytic arcs, so the
 * sampled line has no chord kinks and the measured radius is the planned radius.
 */
class ArcRouteCurve extends Curve<Vector3> implements RouteCurve {
  controlPoints: Vector3[]
  private readonly plan: RoutePlan
  private readonly radius: number
  private readonly start: Vector3
  private readonly end: Vector3
  private readonly startHeading: number
  private readonly segmentLengths: number[]
  private readonly planLength: number
  private readonly lengthTable: number[]
  private readonly totalLength: number

  constructor(plan: RoutePlan, radius: number, start: Vector3, end: Vector3, startHeading: number) {
    super()
    this.plan = plan
    this.radius = radius
    this.start = start.clone()
    this.end = end.clone()
    this.startHeading = startHeading
    this.controlPoints = [start.clone(), end.clone()]
    this.segmentLengths = plan.turns.map((turn) => turn.angle * radius)
    this.planLength = Math.max(this.segmentLengths.reduce((sum, length) => sum + length, 0), 1e-9)

    this.arcLengthDivisions = 160
    const lengthTable = [0]
    let accumulated = 0
    let previous = this.evaluate(0)
    for (let index = 1; index <= this.arcLengthDivisions; index++) {
      const current = this.evaluate(index / this.arcLengthDivisions)
      accumulated += current.distanceTo(previous)
      lengthTable.push(accumulated)
      previous = current
    }
    this.lengthTable = lengthTable
    this.totalLength = accumulated
  }

  override getLength(): number {
    return this.totalLength
  }

  override getLengths(divisions = this.arcLengthDivisions): number[] {
    if (divisions === this.arcLengthDivisions) return [...this.lengthTable]

    const lengths: number[] = []
    for (let index = 0; index <= divisions; index++) {
      lengths.push(this.distanceAt(index / divisions))
    }
    return lengths
  }

  override getPoint(t: number, target = new Vector3()): Vector3 {
    return target.copy(this.evaluate(t))
  }

  override getPointAt(t: number, target = new Vector3()): Vector3 {
    return target.copy(this.evaluate(t))
  }

  override getTangentAt(t: number, target = new Vector3()): Vector3 {
    const step = 0.5 / this.arcLengthDivisions
    const before = this.evaluate(Math.max(0, t - step))
    const after = this.evaluate(Math.min(1, t + step))
    const direction = after.sub(before)
    return direction.lengthSq() > 1e-18 ? target.copy(direction.normalize()) : target.set(0, 0, 1)
  }

  private distanceAt(t: number): number {
    const position = Math.max(0, Math.min(1, t)) * this.arcLengthDivisions
    const index = Math.min(Math.floor(position), this.arcLengthDivisions - 1)
    const fraction = position - index
    return this.lengthTable[index] + (this.lengthTable[index + 1] - this.lengthTable[index]) * fraction
  }

  private planarPointAt(distance: number): { x: number; z: number; heading: number } {
    let remaining = Math.max(0, distance)
    let x = this.start.x
    let z = this.start.z
    let heading = this.startHeading

    for (let index = 0; index < this.plan.turns.length; index++) {
      const turn = this.plan.turns[index]
      const length = this.segmentLengths[index]
      const used = Math.min(remaining, length)

      if (turn.kind === 'straight') {
        x += Math.cos(heading) * used
        z += Math.sin(heading) * used
      } else {
        const direction = turn.kind === 'left' ? 1 : -1
        const swept = (direction * used) / this.radius
        const centerX = x - Math.sin(heading) * this.radius * direction
        const centerZ = z + Math.cos(heading) * this.radius * direction
        const offsetX = x - centerX
        const offsetZ = z - centerZ
        x = centerX + offsetX * Math.cos(swept) - offsetZ * Math.sin(swept)
        z = centerZ + offsetX * Math.sin(swept) + offsetZ * Math.cos(swept)
        heading += swept
      }

      remaining -= used
      if (remaining <= 1e-12) break
    }

    return { x, z, heading }
  }

  private evaluate(t: number): Vector3 {
    const clamped = Math.max(0, Math.min(1, t))
    if (clamped <= 0) return this.start.clone()
    if (clamped >= 1) return this.end.clone()

    const distance = clamped * this.planLength
    const planar = this.planarPointAt(distance)
    const rise = this.end.y - this.start.y
    return new Vector3(planar.x, this.start.y + rise * smoothRamp(distance / this.planLength), planar.z)
  }
}

const MAX_FILLET_RADIUS = 0.55
const SAME_GATE_PYLON_LEAD = 0.3
export const SAME_GATE_FRAME_CLEARANCE = 0.25
const FILLET_SAMPLES_PER_METER = 24

function toRouteCurve(curve: CubicBezierCurve3): RouteCurve {
  return new BezierRouteCurve(curve)
}

function roundPolyline(vertices: readonly Vector3[], maxRadius: number): Vector3[] {
  if (vertices.length < 3) return vertices.map((vertex) => vertex.clone())

  const rounded: Vector3[] = [vertices[0].clone()]

  for (let index = 1; index < vertices.length - 1; index++) {
    const previous = vertices[index - 1]
    const corner = vertices[index]
    const next = vertices[index + 1]
    const incoming = normalize(corner.clone().sub(previous))
    const outgoing = normalize(next.clone().sub(corner))
    const turn = Math.acos(Math.max(-1, Math.min(1, incoming.dot(outgoing))))

    if (turn < 1e-3 || Math.PI - turn < 1e-3) {
      rounded.push(corner.clone())
      continue
    }

    const reach = Math.min(previous.distanceTo(corner), corner.distanceTo(next)) * 0.45
    const radius = Math.min(maxRadius, reach / Math.tan(turn / 2))
    const tangent = radius * Math.tan(turn / 2)

    if (tangent <= 1e-6) {
      rounded.push(corner.clone())
      continue
    }

    const arcStart = corner.clone().sub(incoming.clone().multiplyScalar(tangent))
    const arcEnd = corner.clone().add(outgoing.clone().multiplyScalar(tangent))
    const inward = outgoing.clone().sub(incoming.clone().multiplyScalar(outgoing.dot(incoming)))
    if (inward.lengthSq() < 1e-12) {
      rounded.push(corner.clone())
      continue
    }
    const center = arcStart.clone().add(inward.normalize().multiplyScalar(radius))
    const startOffset = arcStart.clone().sub(center)
    const endOffset = arcEnd.clone().sub(center)
    const sweep = startOffset.angleTo(endOffset)
    const rotation = new Quaternion().setFromUnitVectors(startOffset.clone().normalize(), endOffset.clone().normalize())
    const steps = Math.max(2, Math.ceil(sweep * radius * FILLET_SAMPLES_PER_METER))

    for (let step = 0; step <= steps; step++) {
      const partial = new Quaternion().slerpQuaternions(new Quaternion(), rotation, step / steps)
      rounded.push(center.clone().add(startOffset.clone().applyQuaternion(partial)))
    }
  }

  rounded.push(vertices[vertices.length - 1].clone())

  const deduped: Vector3[] = []
  for (const point of rounded) {
    const previous = deduped[deduped.length - 1]
    if (previous && point.distanceTo(previous) <= 1e-6) continue
    deduped.push(point)
  }

  return deduped
}

function getGateSideDirections(travelDirection: Vector3, gate: Gate): Vector3[] {
  const lateral = new Vector3(travelDirection.z, 0, -travelDirection.x)
  const base = lateral.lengthSq() > 1e-9 ? lateral.normalize() : getGateLocalXDirection(gate)
  return [base.clone(), base.clone().negate()]
}

function getStackedTransitionLateral(from: GateVisit, to: GateVisit): number {
  return Math.max(from.opening.width, to.opening.width) / 2 + SAME_GATE_FRAME_CLEARANCE
}

const UP_AXIS = new Vector3(0, 1, 0)

/** Vertical profile with zero slope at both ends so a turnaround leaves and arrives level. */
function smoothRamp(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10)
}

function createUTurn(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  sideDirection: Vector3,
  lateral: number,
): Detour | null {
  const radius = lateral / 2
  const side = sideDirection.clone().setY(0)
  const forward = fromDirection.clone().setY(0)
  const arrival = toDirection.clone().setY(0)
  if (side.lengthSq() < 1e-9 || forward.lengthSq() < 1e-9 || arrival.lengthSq() < 1e-9) return null
  side.normalize()
  forward.normalize()
  arrival.normalize()

  const displacement = to.clone().sub(from).setY(0)
  const along = displacement.dot(forward)
  const across = displacement.clone().sub(forward.clone().multiplyScalar(along)).length()
  if (across > radius * 0.6 || arrival.dot(forward) < 0.7) return null

  const steps = Math.max(24, Math.ceil(Math.PI * radius * FILLET_SAMPLES_PER_METER))
  const horizontal: { x: number; z: number }[] = []
  const sweepSign = side.dot(new Vector3(forward.z, 0, -forward.x)) >= 0 ? 1 : -1
  const sweep = Math.PI * sweepSign

  const firstCenter = from.clone().add(side.clone().multiplyScalar(radius))
  for (let step = 0; step <= steps; step++) {
    const rotated = from.clone().sub(firstCenter).applyAxisAngle(UP_AXIS, sweep * (step / steps))
    horizontal.push({ x: firstCenter.x + rotated.x, z: firstCenter.z + rotated.z })
  }

  const turnEnd = horizontal[horizontal.length - 1]
  const straightSteps = Math.ceil(Math.abs(along) * FILLET_SAMPLES_PER_METER)
  const straightEnd = { x: turnEnd.x + forward.x * along, z: turnEnd.z + forward.z * along }
  for (let step = 1; step <= straightSteps; step++) {
    const ratio = step / straightSteps
    horizontal.push({ x: turnEnd.x + (straightEnd.x - turnEnd.x) * ratio, z: turnEnd.z + (straightEnd.z - turnEnd.z) * ratio })
  }

  const secondCenter = new Vector3(straightEnd.x - side.x * radius, from.y, straightEnd.z - side.z * radius)
  const secondStart = new Vector3(straightEnd.x, from.y, straightEnd.z)
  for (let step = 1; step <= steps; step++) {
    const rotated = secondStart.clone().sub(secondCenter).applyAxisAngle(UP_AXIS, sweep * (step / steps))
    horizontal.push({ x: secondCenter.x + rotated.x, z: secondCenter.z + rotated.z })
  }

  const distances = [0]
  for (let index = 1; index < horizontal.length; index++) {
    distances.push(distances[index - 1] + Math.hypot(horizontal[index].x - horizontal[index - 1].x, horizontal[index].z - horizontal[index - 1].z))
  }
  const totalHorizontal = distances[distances.length - 1]
  const vertices = horizontal.map((point, index) => new Vector3(
    point.x,
    from.y + (to.y - from.y) * (totalHorizontal > 0 ? smoothRamp(distances[index] / totalHorizontal) : 0),
    point.z,
  ))
  const landing = vertices[vertices.length - 1]
  if (Math.hypot(landing.x - to.x, landing.z - to.z) > 0.05) return null
  vertices[vertices.length - 1] = to.clone()

  const curve = new RoundedRouteCurve(vertices, [from.clone(), to.clone()])
  return { curves: [{ curve, length: curve.getLength() }], totalLength: curve.getLength() }
}

const SPLIT_S_REVERSAL_DOT = -0.85
const SPLIT_S_MAX_LATERAL = 0.35
const SPLIT_S_MAX_TILT_RADIANS = (8 * Math.PI) / 180

/**
 * Split-S: a straight stub out of the gate followed by a half loop in the plane of the exit
 * direction and the opening stack. It lands exactly on the reversed entry with the opposite
 * heading, so the second opening is flown backwards without any detour around the frame.
 */
function createSplitS(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
): Detour | null {
  const forward = fromDirection.clone().setY(0)
  const arrival = toDirection.clone().setY(0)
  if (forward.lengthSq() < 1e-9 || arrival.lengthSq() < 1e-9) return null
  forward.normalize()
  arrival.normalize()
  if (forward.dot(arrival) > SPLIT_S_REVERSAL_DOT) return null

  const displacement = to.clone().sub(from)
  const stub = displacement.dot(forward)
  const start = stub > 1e-3 ? from.clone().add(forward.clone().multiplyScalar(stub)) : from.clone()
  const chord = to.clone().sub(start)
  const radius = chord.length() / 2
  if (radius < MIN_CLEARANCE) return null

  const tilt = Math.asin(Math.min(1, Math.abs(chord.dot(forward)) / chord.length()))
  if (tilt > SPLIT_S_MAX_TILT_RADIANS) return null
  if (Math.hypot(chord.x, chord.z) > SPLIT_S_MAX_LATERAL) return null

  const center = start.clone().add(chord.clone().multiplyScalar(0.5))
  const inward = start.clone().sub(center).normalize()
  const bulge = forward.clone().sub(inward.clone().multiplyScalar(forward.dot(inward))).normalize()
  if (bulge.lengthSq() < 1e-9) return null

  const vertices: Vector3[] = [from.clone()]
  if (start.distanceTo(from) > 1e-6) vertices.push(start.clone())

  const steps = Math.max(24, Math.ceil(Math.PI * radius * FILLET_SAMPLES_PER_METER))
  for (let step = 1; step <= steps; step++) {
    const angle = Math.PI * (step / steps)
    vertices.push(center.clone()
      .add(inward.clone().multiplyScalar(radius * Math.cos(angle)))
      .add(bulge.clone().multiplyScalar(radius * Math.sin(angle))))
  }

  const curve = new RoundedRouteCurve(vertices, [from.clone(), center.clone(), to.clone()])
  return { curves: [{ curve, length: curve.getLength() }], totalLength: curve.getLength() }
}

function measureCurveSwing(curve: RouteCurve): number {
  let swing = 0
  let previousHeading: number | null = null

  for (let step = 1; step <= 80; step++) {
    const point = curve.getPoint(step / 80)
    const previous = curve.getPoint((step - 1) / 80)
    const dx = point.x - previous.x
    const dz = point.z - previous.z
    if (Math.sqrt(dx * dx + dz * dz) < 1e-6) continue

    const heading = Math.atan2(dx, dz)
    if (previousHeading !== null) {
      let delta = heading - previousHeading
      while (delta > Math.PI) delta -= 2 * Math.PI
      while (delta < -Math.PI) delta += 2 * Math.PI
      swing += (Math.abs(delta) * 180) / Math.PI
    }
    previousHeading = heading
  }

  return swing
}

function selectSmoothestDetour(
  candidates: { curves: { curve: RouteCurve; length: number }[]; totalLength: number }[],
): { curves: { curve: RouteCurve; length: number }[]; totalLength: number } {
  return candidates.reduce((best, current) => {
    const currentSwing = measureCurveSwing(current.curves[0].curve)
    const bestSwing = measureCurveSwing(best.curves[0].curve)
    if (Math.abs(currentSwing - bestSwing) > 5) return currentSwing < bestSwing ? current : best
    return current.totalLength < best.totalLength ? current : best
  })
}

function createPylonTurn(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  sideDirection: Vector3,
  lateral: number,
  lead: number,
): { curves: { curve: RouteCurve; length: number }[]; totalLength: number } {
  const side = sideDirection.clone().setY(0)
  if (side.lengthSq() < 1e-9) side.set(fromDirection.z, 0, -fromDirection.x)
  side.normalize()

  const launch = from.clone().add(fromDirection.clone().multiplyScalar(lead))
  const arrival = to.clone().sub(toDirection.clone().multiplyScalar(lead))
  const vertices = [
    from.clone(),
    launch,
    launch.clone().add(side.clone().multiplyScalar(lateral)),
    arrival.clone().add(side.clone().multiplyScalar(lateral)),
    arrival,
    to.clone(),
  ]

  const curve = new RoundedRouteCurve(roundPolyline(vertices, MAX_FILLET_RADIUS), vertices)
  return { curves: [{ curve, length: curve.getLength() }], totalLength: curve.getLength() }
}

function liftTransition(points: readonly { x: number; z: number }[], from: Vector3, to: Vector3): Vector3[] {
  if (points.length < 2) return [from.clone(), to.clone()]

  const distances = [0]
  for (let index = 1; index < points.length; index++) {
    distances.push(distances[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z))
  }

  const total = distances[distances.length - 1]
  const vertices = points.map((point, index) => new Vector3(
    point.x,
    from.y + (to.y - from.y) * (total > 0 ? smoothRamp(distances[index] / total) : index / (points.length - 1)),
    point.z,
  ))

  const last = vertices[vertices.length - 1]
  if (last.distanceTo(to) > 1e-9) vertices.push(to.clone())
  else last.copy(to)
  return vertices
}

function pointsEnterOpening(points: readonly Vector3[], visit: GateVisit): boolean {
  const center = getGateVisitCenterPoint(visit)
  const halfWidth = visit.opening.width / 2
  const halfHeight = visit.opening.height / 2
  const normal = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
  const widthDirection = getGateOpeningWidthDirection(visit.gate, visit.opening)
  const heightDirection = normalize(normal.clone().cross(widthDirection))

  for (let index = Math.ceil(points.length * 0.2); index < points.length; index++) {
    const offset = points[index].clone().sub(center)
    const localX = offset.dot(widthDirection)
    const localY = offset.dot(heightDirection)
    const localZ = offset.dot(normal)

    if (Math.abs(localX) < halfWidth && Math.abs(localY) < halfHeight && Math.abs(localZ) < MIN_CLEARANCE) {
      return true
    }
  }

  return false
}

function pointsCrossForbiddenZone(points: readonly Vector3[], visit: GateVisit): boolean {
  const center = getGateVisitCenterPoint(visit)

  for (let index = 1; index < points.length - 1; index++) {
    if (points[index].distanceTo(center) < 3 && isInForbiddenZone(points[index], visit)) return true
  }

  return false
}

/**
 * Circle-straight-circle transition between two gate passes: straight out of the exit heading, an
 * arc at a radius that never drops below the minimum, straight into the next entry heading. The
 * widest compliant radius wins so the line sweeps instead of hooking; when no radius clears the
 * gate hardware the shortest plan is used, because a smooth line is worth more than a tight one.
 */
function minimumPolylineRadius(points: readonly Vector3[], stencil = 2): number {
  let tightest = Number.POSITIVE_INFINITY

  for (let index = stencil; index < points.length - stencil; index++) {
    const first = points[index].clone().sub(points[index - stencil])
    const second = points[index + stencil].clone().sub(points[index])
    const firstLength = first.length()
    const secondLength = second.length()
    if (firstLength < 1e-6 || secondLength < 1e-6) continue

    const turn = Math.acos(Math.max(-1, Math.min(1, first.dot(second) / (firstLength * secondLength))))
    if (turn < 1e-6) continue
    tightest = Math.min(tightest, (firstLength + secondLength) / 2 / turn)
  }

  return tightest
}

function createSmoothTransition(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  fromVisit: GateVisit,
  toVisit: GateVisit,
): Detour | null {
  const chord = Math.hypot(to.x - from.x, to.z - from.z)
  const rise = Math.abs(to.y - from.y)
  const climbBudget = chord > 1e-6 ? (2.5 * rise) / chord : TRANSITION_LENGTH_BUDGET

  const build = (
    filter: ((points: readonly Vector3[]) => boolean) | null,
    preferShortest = false,
  ): Detour | null => {
    const result = planSmoothTransition(
      { x: from.x, z: from.z, heading: Math.atan2(fromDirection.z, fromDirection.x) },
      { x: to.x, z: to.z, heading: Math.atan2(toDirection.z, toDirection.x) },
      {
        lengthBudget: Math.max(TRANSITION_LENGTH_BUDGET, climbBudget),
        preferShortest,
        ...(filter ? { isAllowed: (points: readonly { x: number; z: number }[]) => filter(liftTransition(points, from, to)) } : {}),
      },
    )
    if (!result) return null

    const vertices = liftTransition(result.points, from, to)
    const curve = new ArcRouteCurve(
      result.plan,
      result.radius,
      vertices[0],
      to,
      Math.atan2(fromDirection.z, fromDirection.x),
    )
    return { curves: [{ curve, length: curve.getLength() }], totalLength: curve.getLength() }
  }

  const clearsHardware = (points: readonly Vector3[]) => (
    !pointsCrossForbiddenZone(points, toVisit)
    && !pointsEnterOpening(points, fromVisit)
    && !pointsEnterOpening(points, toVisit)
    && minimumPolylineRadius(points) >= MIN_TRANSITION_RADIUS * 0.95
  )

  return build(clearsHardware)
    ?? build(clearsHardware, true)
    ?? build(null)
    ?? build(null, true)
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

function getGateLocalXDirection(gate: Gate): Vector3 {
  const rotated = rotateLocalVector(1, 0, gate.rotation)
  return new Vector3(rotated.x, 0, rotated.z).normalize()
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

function isStackedSameGateTransition(fromVisit: GateVisit, toVisit: GateVisit): boolean {
  if (fromVisit.gate.id !== toVisit.gate.id) return false
  if (fromVisit.opening.id === toVisit.opening.id) return false
  if ((fromVisit.opening.rotationX ?? 0) !== 0 || (toVisit.opening.rotationX ?? 0) !== 0) return false

  const verticalGap = Math.abs(getGateVisitCenterPoint(fromVisit).y - getGateVisitCenterPoint(toVisit).y)
  return verticalGap >= Math.min(fromVisit.opening.height, toVisit.opening.height) * 0.5
}

function isSideDefinedSameGateTransition(fromVisit: GateVisit, toVisit: GateVisit): boolean {
  return isHGateBackrestTransition(fromVisit, toVisit) || isDoubleHGateStackTransition(fromVisit, toVisit)
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

function sampleCurvePoints(curve: RouteCurve, length: number): Vector3[] {
  if (curve.denseVertices && curve.denseVertices.length >= 2) {
    return curve.denseVertices.map((vertex) => vertex.clone())
  }

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

  const registerCurve = (curve: RouteCurve, length: number, legIndex: number) => {
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

    const throughGateCurve = toRouteCurve(createStraightCurve(getGateEntryPoint(fromVisit), getGateExitPoint(fromVisit)))
    const throughGateLength = throughGateCurve.getLength()
    registerCurve(throughGateCurve, throughGateLength, i)
    allPoints.push(...throughGateCurve.controlPoints)

    const from = getGateExitPoint(fromVisit)
    const to = getGateEntryPoint(toVisit)
    const fromDirection = getGateExitDirection(fromVisit.gate, fromVisit.opening, fromVisit.reverse)
    const toDirection = getGateExitDirection(toVisit.gate, toVisit.opening, toVisit.reverse)
    const tangent = normalize(getGateVisitCenterPoint(toVisit).clone().sub(getGateVisitCenterPoint(fromVisit)))

    let transitionCurves: { curve: RouteCurve; length: number }[]

    if (isSideDefinedSameGateTransition(fromVisit, toVisit)) {
      const physicalSide = getGateLocalXDirection(fromVisit.gate).multiplyScalar(getHGateBackrestSide(fromVisit.gate.id))
      const lateral = getStackedTransitionLateral(fromVisit, toVisit)
      const splitS = createSplitS(from, fromDirection, to, toDirection)
      const uTurn = createUTurn(from, fromDirection, to, toDirection, physicalSide, lateral)
      const pylon = createPylonTurn(from, fromDirection, to, toDirection, physicalSide, lateral, SAME_GATE_PYLON_LEAD)
      transitionCurves = (splitS ?? uTurn ?? pylon).curves
    } else if (isStackedSameGateTransition(fromVisit, toVisit)) {
      const sides = getGateSideDirections(fromDirection, fromVisit.gate)
      const lateral = getStackedTransitionLateral(fromVisit, toVisit)
      const splitS = createSplitS(from, fromDirection, to, toDirection)
      const uTurns = sides
        .map((sideDirection) => createUTurn(from, fromDirection, to, toDirection, sideDirection, lateral))
        .filter((candidate): candidate is Detour => candidate !== null)
      const fallback = uTurns.length > 0
        ? selectSmoothestDetour(uTurns)
        : selectSmoothestDetour(sides.map((sideDirection) => createPylonTurn(
          from,
          fromDirection,
          to,
          toDirection,
          sideDirection,
          lateral,
          SAME_GATE_PYLON_LEAD,
        )))
      transitionCurves = (splitS ?? fallback).curves
    } else {
      const smooth = createSmoothTransition(from, fromDirection, to, toDirection, fromVisit, toVisit)
      transitionCurves = smooth?.curves
        ?? [{ curve: toRouteCurve(createStraightCurve(from, to)), length: from.distanceTo(to) }]
    }

    for (const { curve, length } of transitionCurves) {
      registerCurve(curve, length, i)
      allPoints.push(...curve.controlPoints)
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
