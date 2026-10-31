import type { Point3 } from '../types'

/**
 * Drone race motion: four tinywhoops fly the ideal line forever, each on its own
 * sine-shaped sideways and height offset so the pack looks like real pilots who cut
 * corners tighter or wider. Pure math only — the scene component drives it from `useFrame`.
 *
 * The ideal line joins gate-to-gate curves with direction breaks, so the route is closed
 * into a lap and its points are smoothed. Flight is integrated like a real quad instead of
 * being played back: `advanceDroneFlight()` pulls the speed toward the speed the line allows
 * (cornering grip, braking into tight sections) with a limited thrust and brake authority,
 * and gravity acts along the flown tangent, so a climb costs speed while a dive gains it.
 * Attitude comes from a rotation-minimizing frame that is walked once along the route and
 * stored per point: it follows every climb, dive and vertical loop without a twist, so a
 * loop over an h-gate is flown inverted at the top like a real quad. On top of that frame
 * the body pitches with the longitudinal acceleration (nose down under power, nose up under
 * braking) and rolls with the lateral acceleration as a coordinated turn
 * (`atan(v^2 * curvature / g)`). Once per lap the whole pack flies an explicit split-S at
 * the sharpest corner: a full pitch loop, inverted halfway, with a short dip.
 */

/** World-space vector for the pose frame; kept THREE-free so the math stays testable. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface DroneRoute {
  points: Point3[]
  distances: number[]
  totalLength: number
  turnRates: number[]
  /** Body-up per route point from the rotation-minimizing frame; the last one repeats the first on a closed lap. */
  ups: Vec3[]
  /** Signed horizontal curvature per route point, positive for a left turn. */
  horizontalCurvatures: number[]
  /** Full 3D curvature vector (dT/ds) per route point; its magnitude caps the cornering speed. */
  curvatures: Vec3[]
  /** Lap distance of the corner where the pack flies its split-S; negative when there is none. */
  maneuverDistance: number
}

export interface DroneRacerSpec {
  id: string
  color: string
  /** Top speed the quad reaches on a long straight. */
  speedMetersPerSecond: number
  /** Forward authority it can pull, in m/s^2 (thrust left over after carrying itself). */
  thrustAccelMetersPerSecondSquared: number
  /** How hard it can brake by pitching back, in m/s^2. */
  brakeAccelMetersPerSecondSquared: number
  /** Lateral acceleration its grip can hold in a corner, in m/s^2. */
  lateralAccelMetersPerSecondSquared: number
  lateralAmplitudeMeters: number
  lateralWavelengthMeters: number
  verticalAmplitudeMeters: number
  verticalWavelengthMeters: number
  phaseRadians: number
}

export interface DronePose {
  position: Point3
  /** Unit tangent of the flown line; the drone model's local +Z points along it. */
  forward: Vec3
  /** Unit body-up; it leans into the corner and points below the horizon while inverted. */
  up: Vec3
}

export interface DroneRouteOptions {
  closeLoop?: boolean
}

/**
 * Live flight state of one racer. The component owns one per drone and hands it to
 * `advanceDroneFlight()` every frame, so speed and position carry inertia across frames
 * instead of being recomputed from the lap distance alone.
 */
export interface DroneFlightState {
  distance: number
  speed: number
  /** Control acceleration of the last step, in m/s^2; the body pitches with it. */
  controlAccelMetersPerSecondSquared: number
}

export const DRONE_FLOOR_HEIGHT = 0.11
export const DRONE_MAX_BANK_RADIANS = (62 * Math.PI) / 180
export const DRONE_MAX_PITCH_RADIANS = (32 * Math.PI) / 180
export const DRONE_MIN_SPEED_FACTOR = 0.5
export const DRONE_MIN_SPEED_METERS_PER_SECOND = 1.2
export const DRONE_OVERSPEED_FACTOR = 1.25
export const DRONE_SPLIT_S_WINDOW_METERS = 3.6
export const DRONE_SPLIT_S_DIP_METERS = 0.45

const TWO_PI = Math.PI * 2
const GRAVITY = 9.81
const POSE_SAMPLE_METERS = 0.35
const TANGENT_SAMPLE_METERS = 0.2
const SPEED_SAMPLE_METERS = 1
const SPEED_CONTROLLER_GAIN = 8
const CONTROL_RESPONSE_PER_SECOND = 10
const PHYSICS_STEP_SECONDS = 1 / 120
const MAX_PHYSICS_STEP_SECONDS = 0.1
const FLOOR_SOFTNESS_METERS = 0.06
const MIN_MANEUVER_TURN_RATE = 0.1
const MIN_MANEUVER_CONTRAST = 0.06
const MANEUVER_LEAD_IN_METERS = DRONE_SPLIT_S_WINDOW_METERS * 0.6
const ROUTE_SMOOTHING_METERS = 0.35
const TURN_WINDOW_METERS = 0.7
const TURN_SMOOTHING_RADIUS = 10
const CURVATURE_SMOOTHING_RADIUS = 6
const CURVATURE_SLOWDOWN = 0.85
const LOOP_CLOSE_TOLERANCE = 0.01
const RETURN_LEG_MIN_GAP = 0.02
const MAX_SMOOTHING_RADIUS = 60

export const DRONE_RACERS: readonly DroneRacerSpec[] = [
  {
    id: 'pink',
    color: '#ff3d9e',
    speedMetersPerSecond: 5.2,
    thrustAccelMetersPerSecondSquared: 24,
    brakeAccelMetersPerSecondSquared: 26,
    lateralAccelMetersPerSecondSquared: 34,
    lateralAmplitudeMeters: 0.62,
    lateralWavelengthMeters: 9,
    verticalAmplitudeMeters: 0.16,
    verticalWavelengthMeters: 4.5,
    phaseRadians: 0.4,
  },
  {
    id: 'blue',
    color: '#2e9bff',
    speedMetersPerSecond: 4.6,
    thrustAccelMetersPerSecondSquared: 20,
    brakeAccelMetersPerSecondSquared: 22,
    lateralAccelMetersPerSecondSquared: 30,
    lateralAmplitudeMeters: 0.28,
    lateralWavelengthMeters: 13,
    verticalAmplitudeMeters: 0.09,
    verticalWavelengthMeters: 3.2,
    phaseRadians: 2.1,
  },
  {
    id: 'red',
    color: '#ff2d55',
    speedMetersPerSecond: 4.2,
    thrustAccelMetersPerSecondSquared: 22,
    brakeAccelMetersPerSecondSquared: 24,
    lateralAccelMetersPerSecondSquared: 28,
    lateralAmplitudeMeters: 0.48,
    lateralWavelengthMeters: 7,
    verticalAmplitudeMeters: 0.2,
    verticalWavelengthMeters: 5.4,
    phaseRadians: 4.2,
  },
  {
    id: 'green',
    color: '#3bff8c',
    speedMetersPerSecond: 3.7,
    thrustAccelMetersPerSecondSquared: 18,
    brakeAccelMetersPerSecondSquared: 18,
    lateralAccelMetersPerSecondSquared: 26,
    lateralAmplitudeMeters: 0.18,
    lateralWavelengthMeters: 16,
    verticalAmplitudeMeters: 0.06,
    verticalWavelengthMeters: 3.8,
    phaseRadians: 5.6,
  },
]

function distanceBetween(a: Point3, b: Point3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

function clonePoints(points: readonly Point3[]): Point3[] {
  return points.map((point) => ({ x: point.x, y: point.y, z: point.z }))
}

function averageSpacing(points: Point3[]): number {
  if (points.length < 2) return 0.02

  let total = 0
  for (let index = 1; index < points.length; index++) total += distanceBetween(points[index - 1], points[index])
  return total / (points.length - 1) || 0.02
}

function smoothingRadius(points: Point3[], meters: number): number {
  return Math.round(meters / Math.max(averageSpacing(points), 0.005))
}

function appendReturnLeg(points: Point3[], spacing: number): Point3[] {
  const first = points[0]
  const last = points[points.length - 1]
  const gap = distanceBetween(last, first)
  if (gap <= RETURN_LEG_MIN_GAP) return points

  const steps = Math.max(1, Math.round(gap / spacing))
  const closed = points.map((point) => ({ ...point }))
  for (let step = 1; step <= steps; step++) {
    const t = step / steps
    closed.push({
      x: last.x + (first.x - last.x) * t,
      y: last.y + (first.y - last.y) * t,
      z: last.z + (first.z - last.z) * t,
    })
  }
  return closed
}

function ringIndex(index: number, ring: number): number {
  return ((index % ring) + ring) % ring
}

function smoothPolyline(points: Point3[], closed: boolean): Point3[] {
  if (points.length < 5) return points

  const radius = smoothingRadius(points, ROUTE_SMOOTHING_METERS)
  if (radius < 2 || radius > MAX_SMOOTHING_RADIUS) return points

  const ring = closed ? points.length - 1 : points.length
  const smoothed = clonePoints(points)

  for (let index = 0; index < points.length; index++) {
    if (!closed && (index === 0 || index === points.length - 1)) continue

    let x = 0
    let y = 0
    let z = 0
    let samples = 0
    for (let offset = -radius; offset <= radius; offset++) {
      const sampleIndex = closed
        ? ringIndex(index + offset, ring)
        : Math.min(points.length - 1, Math.max(0, index + offset))
      x += points[sampleIndex].x
      y += points[sampleIndex].y
      z += points[sampleIndex].z
      samples += 1
    }
    smoothed[index] = { x: x / samples, y: y / samples, z: z / samples }
  }

  if (closed) smoothed[points.length - 1] = { ...smoothed[0] }
  return smoothed
}

function buildDistances(points: Point3[]): { distances: number[]; totalLength: number } {
  const distances: number[] = []
  let totalLength = 0

  for (const [index, point] of points.entries()) {
    if (index > 0) totalLength += distanceBetween(points[index - 1], point)
    distances.push(totalLength)
  }

  return { distances, totalLength }
}

function vertexDirection(points: Point3[], index: number, closed: boolean): { x: number; z: number } {
  const ring = closed ? points.length - 1 : points.length
  const previousIndex = closed ? ringIndex(index - 1, ring) : Math.max(0, index - 1)
  const nextIndex = closed ? ringIndex(index + 1, ring) : Math.min(points.length - 1, index + 1)
  const dx = points[nextIndex].x - points[previousIndex].x
  const dz = points[nextIndex].z - points[previousIndex].z
  const length = Math.hypot(dx, dz)

  return length > 1e-6 ? { x: dx / length, z: dz / length } : { x: 0, z: 1 }
}

function arcSpan(distances: number[], from: number, to: number, totalLength: number): number {
  if (to > from) return distances[to] - distances[from]
  return totalLength - distances[from] + distances[to]
}

function smoothValues(values: number[], closed: boolean, radius: number): number[] {
  const result = [...values]
  if (radius <= 0) return result

  const ring = closed ? values.length - 1 : values.length

  for (let index = 0; index < values.length; index++) {
    let sum = 0
    let samples = 0
    for (let offset = -radius; offset <= radius; offset++) {
      const sampleIndex = closed
        ? ringIndex(index + offset, ring)
        : Math.min(values.length - 1, Math.max(0, index + offset))
      sum += values[sampleIndex]
      samples += 1
    }
    result[index] = sum / samples
  }

  if (closed) result[values.length - 1] = result[0]
  return result
}

function computeTurnRates(points: Point3[], distances: number[], totalLength: number, closed: boolean): number[] {
  const ring = closed ? points.length - 1 : points.length
  const window = Math.max(2, smoothingRadius(points, TURN_WINDOW_METERS))
  const directions = points.map((_, index) => vertexDirection(points, index, closed))
  const raw = points.map((_, index) => {
    const previousIndex = closed ? ringIndex(index - window, ring) : Math.max(0, index - window)
    const nextIndex = closed ? ringIndex(index + window, ring) : Math.min(points.length - 1, index + window)
    if (previousIndex === nextIndex) return 0

    const span = arcSpan(distances, previousIndex, nextIndex, totalLength)
    if (span <= 1e-6) return 0

    const behind = directions[previousIndex]
    const ahead = directions[nextIndex]
    const cross = behind.z * ahead.x - behind.x * ahead.z
    const dot = behind.x * ahead.x + behind.z * ahead.z

    return Math.atan2(cross, dot) / span
  })

  return smoothValues(raw, closed, TURN_SMOOTHING_RADIUS)
}

function routeTangents(points: Point3[], closed: boolean): Vec3[] {
  const ring = closed ? points.length - 1 : points.length

  return points.map((_, index) => {
    const previousIndex = closed ? ringIndex(index - 1, ring) : Math.max(0, index - 1)
    const nextIndex = closed ? ringIndex(index + 1, ring) : Math.min(points.length - 1, index + 1)
    const x = points[nextIndex].x - points[previousIndex].x
    const y = points[nextIndex].y - points[previousIndex].y
    const z = points[nextIndex].z - points[previousIndex].z
    const length = Math.hypot(x, y, z) || 1

    return { x: x / length, y: y / length, z: z / length }
  })
}

function perpendicularUp(tangent: Vec3, out: Vec3): Vec3 {
  let x = -tangent.x * tangent.y
  let y = 1 - tangent.y * tangent.y
  let z = -tangent.z * tangent.y
  let length = Math.hypot(x, y, z)

  if (length < 1e-6) {
    x = 1
    y = 0
    z = 0
    length = 1
  }

  out.x = x / length
  out.y = y / length
  out.z = z / length
  return out
}

function signedAngleAround(a: Vec3, b: Vec3, axis: Vec3): number {
  const crossX = a.y * b.z - a.z * b.y
  const crossY = a.z * b.x - a.x * b.z
  const crossZ = a.x * b.y - a.y * b.x
  const crossDot = crossX * axis.x + crossY * axis.y + crossZ * axis.z

  return Math.atan2(crossDot, a.x * b.x + a.y * b.y + a.z * b.z)
}

function rotateAboutAxis(vector: Vec3, axis: Vec3, angle: number): void {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const crossX = axis.y * vector.z - axis.z * vector.y
  const crossY = axis.z * vector.x - axis.x * vector.z
  const crossZ = axis.x * vector.y - axis.y * vector.x
  const dot = axis.x * vector.x + axis.y * vector.y + axis.z * vector.z

  const x = vector.x * cosine + crossX * sine + axis.x * dot * (1 - cosine)
  const y = vector.y * cosine + crossY * sine + axis.y * dot * (1 - cosine)
  const z = vector.z * cosine + crossZ * sine + axis.z * dot * (1 - cosine)

  vector.x = x
  vector.y = y
  vector.z = z
}

function transportUp(from: Vec3, to: Vec3, up: Vec3): void {
  const axisX = from.y * to.z - from.z * to.y
  const axisY = from.z * to.x - from.x * to.z
  const axisZ = from.x * to.y - from.y * to.x
  const sine = Math.hypot(axisX, axisY, axisZ)
  if (sine < 1e-9) return

  const cosine = from.x * to.x + from.y * to.y + from.z * to.z
  const axis: Vec3 = { x: axisX / sine, y: axisY / sine, z: axisZ / sine }
  rotateAboutAxis(up, axis, Math.atan2(sine, cosine))
}

/**
 * Rotation-minimizing frame along the route: the up vector is rolled from point to point
 * without twisting, so it follows a vertical loop through inverted flight instead of
 * flipping when the horizon reference runs out.
 */
function computeRouteUps(points: Point3[], closed: boolean): Vec3[] {
  const tangents = routeTangents(points, closed)
  const count = points.length
  if (count === 0) return []

  const ring = closed ? count - 1 : count
  const ups: Vec3[] = new Array(count)

  ups[0] = perpendicularUp(tangents[0], { x: 0, y: 1, z: 0 })
  for (let index = 1; index < ring; index++) {
    const up = { ...ups[index - 1] }
    transportUp(tangents[index - 1], tangents[index], up)
    ups[index] = up
  }

  if (!closed) {
    for (let index = 0; index < ring; index++) {
      const along = tangents[index].x * ups[index].x + tangents[index].y * ups[index].y + tangents[index].z * ups[index].z
      ups[index] = {
        x: ups[index].x - tangents[index].x * along,
        y: ups[index].y - tangents[index].y * along,
        z: ups[index].z - tangents[index].z * along,
      }
    }
    return ups.map((up) => normalizeVec3(up))
  }

  const closingUp = { ...ups[ring - 1] }
  transportUp(tangents[ring - 1], tangents[0], closingUp)
  const twist = signedAngleAround(ups[0], closingUp, tangents[0])

  for (let index = 0; index < ring; index++) {
    if (twist !== 0) rotateAboutAxis(ups[index], tangents[index], (-twist * index) / ring)
  }

  const normalized = ups.map((up) => normalizeVec3(up))
  normalized[count - 1] = { ...normalized[0] }
  return normalized
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1

  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

function computeHorizontalCurvatures(points: Point3[], distances: number[], closed: boolean): number[] {
  const raw = points.map((point, index) => {
    const previousIndex = index === 0 ? Math.min(1, points.length - 1) : index - 1
    const nextIndex = index === points.length - 1 ? Math.max(0, points.length - 2) : index + 1
    const previous = points[previousIndex]
    const next = points[nextIndex]
    const span = Math.max(1e-4, (distances[nextIndex] - distances[previousIndex]) / 2)
    const curvatureX = (next.x - 2 * point.x + previous.x) / (span * span)
    const curvatureZ = (next.z - 2 * point.z + previous.z) / (span * span)
    const tangentX = next.x - previous.x
    const tangentY = next.y - previous.y
    const tangentZ = next.z - previous.z
    const tangentLength = Math.hypot(tangentX, tangentY, tangentZ) || 1

    return (tangentZ * curvatureX - tangentX * curvatureZ) / tangentLength
  })

  return smoothValues(raw, closed, CURVATURE_SMOOTHING_RADIUS)
}

/**
 * Full 3D curvature vector `dT/ds` per route point, smoothed like the horizontal part.
 * Its magnitude is what a real quad has to pull: on a vertical loop it points straight down
 * at the apex, so the same grip limit that slows a hairpin also slows the loop.
 */
function computeCurvatures(
  points: Point3[],
  distances: number[],
  totalLength: number,
  closed: boolean,
): Vec3[] {
  const tangents = routeTangents(points, closed)
  const raw = points.map((_, index) => {
    const previousIndex = closed ? ringIndex(index - 1, points.length - 1) : Math.max(0, index - 1)
    const nextIndex = closed ? ringIndex(index + 1, points.length - 1) : Math.min(points.length - 1, index + 1)
    const span = closed
      ? Math.max(1e-4, arcSpan(distances, previousIndex, nextIndex, totalLength))
      : Math.max(1e-4, distances[nextIndex] - distances[previousIndex])
    const from = tangents[previousIndex]
    const to = tangents[nextIndex]

    return { x: (to.x - from.x) / span, y: (to.y - from.y) / span, z: (to.z - from.z) / span }
  })

  const x = smoothValues(raw.map((curvature) => curvature.x), closed, CURVATURE_SMOOTHING_RADIUS)
  const y = smoothValues(raw.map((curvature) => curvature.y), closed, CURVATURE_SMOOTHING_RADIUS)
  const z = smoothValues(raw.map((curvature) => curvature.z), closed, CURVATURE_SMOOTHING_RADIUS)
  const curvatures = points.map((_, index) => ({ x: x[index], y: y[index], z: z[index] }))

  if (closed && curvatures.length > 0) curvatures[curvatures.length - 1] = { ...curvatures[0] }
  return curvatures
}

/** Sharpest real corner for the split-S; the synthetic return leg never qualifies. */
function findManeuverDistance(turnRates: number[], distances: number[], totalLength: number, searchLimit: number): number {
  const limit = Math.min(turnRates.length, Math.max(0, searchLimit))
  if (limit < 5 || totalLength <= DRONE_SPLIT_S_WINDOW_METERS * 2) return -1

  const rates: number[] = []
  for (let index = 0; index < limit; index++) rates.push(Math.abs(turnRates[index]))

  const sorted = [...rates].sort((a, b) => a - b)
  const median = sorted[sorted.length >> 1]

  let bestIndex = -1
  let bestRate = 0
  for (const [index, rate] of rates.entries()) {
    if (rate > bestRate) {
      bestRate = rate
      bestIndex = index
    }
  }

  if (bestIndex < 0 || bestRate < MIN_MANEUVER_TURN_RATE || bestRate - median < MIN_MANEUVER_CONTRAST) return -1

  return distances[bestIndex] - MANEUVER_LEAD_IN_METERS
}

export function buildDroneRoute(rawPoints: readonly Point3[], options: DroneRouteOptions = {}): DroneRoute {
  if (rawPoints.length < 2) {
    return {
      points: clonePoints(rawPoints),
      distances: rawPoints.map(() => 0),
      totalLength: 0,
      turnRates: rawPoints.map(() => 0),
      ups: rawPoints.map(() => ({ x: 0, y: 1, z: 0 })),
      horizontalCurvatures: rawPoints.map(() => 0),
      curvatures: rawPoints.map(() => ({ x: 0, y: 0, z: 0 })),
      maneuverDistance: -1,
    }
  }

  let points = clonePoints(rawPoints)
  const sourceClosed = distanceBetween(points[0], points[points.length - 1]) <= LOOP_CLOSE_TOLERANCE
  const closed = sourceClosed || options.closeLoop === true
  const sourceLength = points.length

  if (!sourceClosed && options.closeLoop === true) {
    points = appendReturnLeg(points, averageSpacing(points))
  }

  points = smoothPolyline(points, closed)
  const { distances, totalLength } = buildDistances(points)
  const turnRates = computeTurnRates(points, distances, totalLength, closed)
  const ups = computeRouteUps(points, closed)
  const horizontalCurvatures = computeHorizontalCurvatures(points, distances, closed)
  const curvatures = computeCurvatures(points, distances, totalLength, closed)
  const maneuverDistance = findManeuverDistance(turnRates, distances, totalLength, sourceLength - 1)

  return { points, distances, totalLength, turnRates, ups, horizontalCurvatures, curvatures, maneuverDistance }
}

export function wrapRouteDistance(route: DroneRoute, distance: number): number {
  if (route.totalLength <= 0) return 0

  const wrapped = distance % route.totalLength
  return wrapped < 0 ? wrapped + route.totalLength : wrapped
}

function findSegmentIndex(distances: number[], distance: number): number {
  let low = 0
  let high = distances.length - 1

  while (low + 1 < high) {
    const mid = (low + high) >> 1
    if (distances[mid] <= distance) {
      low = mid
    } else {
      high = mid
    }
  }

  return low
}

function routeFraction(route: DroneRoute, distance: number, index: number): number {
  const nextIndex = Math.min(index + 1, route.distances.length - 1)
  const span = route.distances[nextIndex] - route.distances[index]
  if (span <= 0) return 0

  return Math.min(1, Math.max(0, (distance - route.distances[index]) / span))
}

function sampleRoutePoint(route: DroneRoute, distance: number, out: Point3): Point3 {
  const { points, totalLength } = route
  if (points.length === 0 || totalLength <= 0) return out

  const wrapped = wrapRouteDistance(route, distance)
  const index = findSegmentIndex(route.distances, wrapped)
  const nextIndex = Math.min(index + 1, points.length - 1)
  const start = points[index]
  const end = points[nextIndex]
  const t = routeFraction(route, wrapped, index)

  out.x = start.x + (end.x - start.x) * t
  out.y = start.y + (end.y - start.y) * t
  out.z = start.z + (end.z - start.z) * t
  return out
}

const scratchBase: Point3 = { x: 0, y: 0, z: 0 }
const scratchTangentAhead: Point3 = { x: 0, y: 0, z: 0 }
const scratchTangentBehind: Point3 = { x: 0, y: 0, z: 0 }
const scratchTangent: Vec3 = { x: 0, y: 0, z: 1 }

/**
 * 3D tangent of the base route. Its horizontal components double as the weave normal,
 * which fades out on a vertical climb instead of flipping through the undefined
 * horizontal direction at the top of a loop.
 */
function sampleBaseTangent(route: DroneRoute, distance: number, out: Vec3): Vec3 {
  sampleRoutePoint(route, distance + TANGENT_SAMPLE_METERS, scratchTangentAhead)
  sampleRoutePoint(route, distance - TANGENT_SAMPLE_METERS, scratchTangentBehind)
  const x = scratchTangentAhead.x - scratchTangentBehind.x
  const y = scratchTangentAhead.y - scratchTangentBehind.y
  const z = scratchTangentAhead.z - scratchTangentBehind.z
  const length = Math.hypot(x, y, z)

  if (length > 1e-9) {
    out.x = x / length
    out.y = y / length
    out.z = z / length
  } else {
    out.x = 0
    out.y = 0
    out.z = 1
  }

  return out
}

function lateralOffsetMeters(spec: DroneRacerSpec, distance: number, totalLength: number): number {
  const waves = Math.max(1, Math.round(totalLength / spec.lateralWavelengthMeters))

  return spec.lateralAmplitudeMeters * Math.sin((TWO_PI * waves * distance) / totalLength + spec.phaseRadians)
}

function verticalOffsetMeters(spec: DroneRacerSpec, distance: number, totalLength: number): number {
  const waves = Math.max(1, Math.round(totalLength / spec.verticalWavelengthMeters))

  return spec.verticalAmplitudeMeters * Math.sin((TWO_PI * waves * distance) / totalLength + spec.phaseRadians * 1.7)
}

/** Smooth maximum: a dive settles onto the floor without a velocity kink. */
function softFloorHeight(height: number): number {
  const above = height - DRONE_FLOOR_HEIGHT
  if (above > FLOOR_SOFTNESS_METERS * 12) return height

  return DRONE_FLOOR_HEIGHT + FLOOR_SOFTNESS_METERS * Math.log1p(Math.exp(above / FLOOR_SOFTNESS_METERS))
}

function smootherStep(value: number): number {
  const t = Math.min(1, Math.max(0, value))

  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Split-S progress 0..1 inside the maneuver window, otherwise -1. */
function splitSProgress(route: DroneRoute, distance: number): number {
  if (route.maneuverDistance < 0 || route.totalLength <= 0) return -1

  const wrapped = wrapRouteDistance(route, distance)
  let delta = wrapped - route.maneuverDistance
  if (delta > route.totalLength / 2) delta -= route.totalLength
  if (delta < -route.totalLength / 2) delta += route.totalLength

  const half = DRONE_SPLIT_S_WINDOW_METERS / 2
  if (Math.abs(delta) > half) return -1

  return (delta + half) / DRONE_SPLIT_S_WINDOW_METERS
}

function splitSDipMeters(route: DroneRoute, distance: number): number {
  const progress = splitSProgress(route, distance)
  if (progress < 0) return 0

  const dip = Math.sin(Math.PI * progress)

  return -DRONE_SPLIT_S_DIP_METERS * dip * dip
}

function rawOffsetPoint(route: DroneRoute, distance: number, spec: DroneRacerSpec, out: Point3): Point3 {
  const wrapped = wrapRouteDistance(route, distance)
  const base = sampleRoutePoint(route, wrapped, scratchBase)
  const tangent = sampleBaseTangent(route, wrapped, scratchTangent)
  const lateral = lateralOffsetMeters(spec, wrapped, route.totalLength)

  out.x = base.x - tangent.z * lateral
  out.y = base.y + verticalOffsetMeters(spec, wrapped, route.totalLength)
  out.z = base.z + tangent.x * lateral
  return out
}

function offsetPoint(route: DroneRoute, distance: number, spec: DroneRacerSpec, out: Point3): Point3 {
  rawOffsetPoint(route, distance, spec, out)
  out.y = softFloorHeight(out.y + splitSDipMeters(route, distance))
  return out
}

/** Signed turn rate along the route; positive means the drone turns left. */
export function turnRateRadiansPerMeter(route: DroneRoute, distance: number): number {
  const { turnRates, totalLength } = route
  if (totalLength <= 0 || turnRates.length === 0) return 0

  return interpolateValues(route, turnRates, distance)
}

/** Signed horizontal curvature, positive for a left turn. */
export function horizontalCurvatureAt(route: DroneRoute, distance: number): number {
  const { horizontalCurvatures, totalLength } = route
  if (totalLength <= 0 || horizontalCurvatures.length === 0) return 0

  return interpolateValues(route, horizontalCurvatures, distance)
}

function interpolateValues(route: DroneRoute, values: number[], distance: number): number {
  const wrapped = wrapRouteDistance(route, distance)
  const index = findSegmentIndex(route.distances, wrapped)
  const nextIndex = Math.min(index + 1, values.length - 1)
  const t = routeFraction(route, wrapped, index)

  return values[index] + (values[nextIndex] - values[index]) * t
}

/** Pilots brake into tight sections and carry full speed down a straight. */
export function speedFactorAt(route: DroneRoute, distance: number): number {
  const turnRate = Math.abs(turnRateRadiansPerMeter(route, distance))

  return Math.max(DRONE_MIN_SPEED_FACTOR, 1 / (1 + CURVATURE_SLOWDOWN * turnRate))
}

/**
 * Coordinated-turn lean for a corner: `atan(v^2 * curvature / g)`, capped at the maximum
 * bank. Negative leans into a positive (left-hand) turn, matching the model's roll axis.
 */
export function bankRadians(turnRate: number, speedMetersPerSecond: number): number {
  const raw = Math.atan((turnRate * speedMetersPerSecond * speedMetersPerSecond) / GRAVITY)

  return Math.max(-DRONE_MAX_BANK_RADIANS, Math.min(DRONE_MAX_BANK_RADIANS, -raw))
}

const scratchAhead: Point3 = { x: 0, y: 0, z: 0 }
const scratchBehind: Point3 = { x: 0, y: 0, z: 0 }
const scratchFrameUp: Vec3 = { x: 0, y: 1, z: 0 }

function sampleRouteUp(route: DroneRoute, distance: number, out: Vec3): Vec3 {
  const { ups, totalLength } = route
  if (totalLength <= 0 || ups.length === 0) {
    out.x = 0
    out.y = 1
    out.z = 0
    return out
  }

  const wrapped = wrapRouteDistance(route, distance)
  const index = findSegmentIndex(route.distances, wrapped)
  const nextIndex = Math.min(index + 1, ups.length - 1)
  const t = routeFraction(route, wrapped, index)
  const from = ups[index]
  const to = ups[nextIndex]

  out.x = from.x + (to.x - from.x) * t
  out.y = from.y + (to.y - from.y) * t
  out.z = from.z + (to.z - from.z) * t
  return normalizeVec3(out)
}

/** Lateral acceleration the sine weave itself demands, as a turn-rate equivalent. */
function weaveTurnRateRadiansPerMeter(spec: DroneRacerSpec, distance: number, totalLength: number): number {
  if (totalLength <= 0 || spec.lateralAmplitudeMeters === 0) return 0

  const waves = Math.max(1, Math.round(totalLength / spec.lateralWavelengthMeters))
  const waveNumber = (TWO_PI * waves) / totalLength

  return spec.lateralAmplitudeMeters * waveNumber * waveNumber * Math.sin(waveNumber * distance + spec.phaseRadians)
}

/** Magnitude of the 3D curvature at a lap distance; drives the grip-limited cornering speed. */
export function curvatureMagnitudeAt(route: DroneRoute, distance: number): number {
  const { curvatures, distances, totalLength } = route
  if (totalLength <= 0 || curvatures.length === 0) return 0

  const wrapped = wrapRouteDistance(route, distance)
  const index = findSegmentIndex(distances, wrapped)
  const nextIndex = Math.min(index + 1, curvatures.length - 1)
  const t = routeFraction(route, wrapped, index)
  const from = curvatures[index]
  const to = curvatures[nextIndex]

  return Math.hypot(
    from.x + (to.x - from.x) * t,
    from.y + (to.y - from.y) * t,
    from.z + (to.z - from.z) * t,
  )
}

/**
 * Speed the line allows right now: the pilot brakes into tight sections and never asks for
 * more lateral acceleration than the quad can hold. The 3D curvature counts vertical loops
 * too, so the pack also slows over the top of one.
 */
export function targetSpeedAt(route: DroneRoute, spec: DroneRacerSpec, distance: number): number {
  const wrapped = wrapRouteDistance(route, distance)
  const curvature = curvatureMagnitudeAt(route, wrapped)
  const gripSpeed = Math.sqrt(spec.lateralAccelMetersPerSecondSquared / Math.max(curvature, 1e-4))
  const pilotSpeed = spec.speedMetersPerSecond * speedFactorAt(route, wrapped)

  return Math.max(
    DRONE_MIN_SPEED_METERS_PER_SECOND,
    Math.min(spec.speedMetersPerSecond, gripSpeed, pilotSpeed),
  )
}

/** Climb rate of the line: +1 straight up, -1 straight down, 0 level. */
function slopeAlongRoute(route: DroneRoute, distance: number): number {
  return sampleBaseTangent(route, wrapRouteDistance(route, distance), scratchTangent).y
}

/**
 * One physics step: the speed is pulled toward the speed the line allows with the racer's own
 * thrust and brake authority, gravity acts along the tangent (a climb costs speed, a dive gains
 * it) and the control acceleration is kept for the body pitch. Fixed substeps keep the
 * integration stable at any frame rate.
 */
export function advanceDroneFlight(
  route: DroneRoute,
  spec: DroneRacerSpec,
  state: DroneFlightState,
  deltaSeconds: number,
): void {
  if (route.totalLength <= 0 || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return

  const step = Math.min(deltaSeconds, MAX_PHYSICS_STEP_SECONDS)
  const substeps = Math.max(1, Math.ceil(step / PHYSICS_STEP_SECONDS))
  const dt = step / substeps
  const ceiling = spec.speedMetersPerSecond * DRONE_OVERSPEED_FACTOR

  for (let substep = 0; substep < substeps; substep++) {
    const target = targetSpeedAt(route, spec, state.distance)
    const control = Math.max(
      -spec.brakeAccelMetersPerSecondSquared,
      Math.min(spec.thrustAccelMetersPerSecondSquared, SPEED_CONTROLLER_GAIN * (target - state.speed)),
    )
    const gravity = -GRAVITY * slopeAlongRoute(route, state.distance)

    state.controlAccelMetersPerSecondSquared +=
      (control - state.controlAccelMetersPerSecondSquared) * (1 - Math.exp(-CONTROL_RESPONSE_PER_SECOND * dt))
    state.speed = Math.min(
      ceiling,
      Math.max(DRONE_MIN_SPEED_METERS_PER_SECOND, state.speed + (control + gravity) * dt),
    )
    state.distance = wrapRouteDistance(route, state.distance + state.speed * dt)
  }
}

/** Puts a racer on the line at speed; the component then advances it frame by frame. */
export function createDroneFlightState(
  route: DroneRoute,
  spec: DroneRacerSpec,
  startDistance: number,
): DroneFlightState {
  const distance = wrapRouteDistance(route, startDistance)

  return { distance, speed: targetSpeedAt(route, spec, distance), controlAccelMetersPerSecondSquared: 0 }
}

/** Longitudinal acceleration the changing speed target demands, from `v * dv/ds`. */
function longitudinalAccelAt(route: DroneRoute, spec: DroneRacerSpec, distance: number): number {
  const ahead = targetSpeedAt(route, spec, distance + SPEED_SAMPLE_METERS)
  const behind = targetSpeedAt(route, spec, distance - SPEED_SAMPLE_METERS)
  const speed = targetSpeedAt(route, spec, distance)
  const demanded = (speed * (ahead - behind)) / (2 * SPEED_SAMPLE_METERS)

  return Math.max(
    -spec.brakeAccelMetersPerSecondSquared,
    Math.min(spec.thrustAccelMetersPerSecondSquared, demanded),
  )
}

/** Reads the nose off the flown line, the attitude off the route frame, pitch and lean off the acceleration. */
function samplePathFrame(
  route: DroneRoute,
  distance: number,
  spec: DroneRacerSpec,
  speed: number,
  controlAccel: number,
  forward: Vec3,
  up: Vec3,
): void {
  const step = POSE_SAMPLE_METERS
  rawOffsetPoint(route, distance + step, spec, scratchAhead)
  rawOffsetPoint(route, distance - step, spec, scratchBehind)

  let forwardX = scratchAhead.x - scratchBehind.x
  let forwardY = scratchAhead.y - scratchBehind.y
  let forwardZ = scratchAhead.z - scratchBehind.z
  const forwardLength = Math.hypot(forwardX, forwardY, forwardZ)

  if (forwardLength > 1e-6) {
    forwardX /= forwardLength
    forwardY /= forwardLength
    forwardZ /= forwardLength
  } else {
    forwardX = 0
    forwardY = 0
    forwardZ = 1
  }

  forward.x = forwardX
  forward.y = forwardY
  forward.z = forwardZ

  const frameUp = sampleRouteUp(route, distance, scratchFrameUp)
  let upX = frameUp.x
  let upY = frameUp.y
  let upZ = frameUp.z

  const along = upX * forwardX + upY * forwardY + upZ * forwardZ
  upX -= forwardX * along
  upY -= forwardY * along
  upZ -= forwardZ * along

  let upLength = Math.hypot(upX, upY, upZ)
  if (upLength < 1e-4) {
    const fallback = perpendicularUp(forward, { x: 0, y: 1, z: 0 })
    upX = fallback.x
    upY = fallback.y
    upZ = fallback.z
    upLength = 1
  }

  up.x = upX / upLength
  up.y = upY / upLength
  up.z = upZ / upLength

  const pitch = Math.max(
    -DRONE_MAX_PITCH_RADIANS,
    Math.min(DRONE_MAX_PITCH_RADIANS, Math.atan(controlAccel / GRAVITY)),
  )
  if (pitch !== 0) {
    const right = {
      x: up.y * forward.z - up.z * forward.y,
      y: up.z * forward.x - up.x * forward.z,
      z: up.x * forward.y - up.y * forward.x,
    }
    const rightLength = Math.hypot(right.x, right.y, right.z) || 1
    right.x /= rightLength
    right.y /= rightLength
    right.z /= rightLength

    rotateAboutAxis(forward, right, pitch)
    rotateAboutAxis(up, right, pitch)
  }

  const turnRate =
    horizontalCurvatureAt(route, distance) + weaveTurnRateRadiansPerMeter(spec, distance, route.totalLength)
  const bank = bankRadians(turnRate, speed)
  if (bank !== 0) rotateAboutAxis(up, forward, bank)
}

/** Split-S: dive through a full pitch loop, inverted halfway, then pull back out level. */
function applySplitSRotation(route: DroneRoute, distance: number, forward: Vec3, up: Vec3): void {
  const progress = splitSProgress(route, distance)
  if (progress < 0) return

  const pitch = TWO_PI * smootherStep(progress)
  const right: Vec3 = {
    x: up.y * forward.z - up.z * forward.y,
    y: up.z * forward.x - up.x * forward.z,
    z: up.x * forward.y - up.y * forward.x,
  }
  const rightLength = Math.hypot(right.x, right.y, right.z) || 1
  right.x /= rightLength
  right.y /= rightLength
  right.z /= rightLength

  rotateAboutAxis(forward, right, pitch)
  rotateAboutAxis(up, right, pitch)
}

export function sampleDronePose(route: DroneRoute, distance: number, spec: DroneRacerSpec): DronePose {
  const wrapped = wrapRouteDistance(route, distance)

  return buildPose(route, wrapped, spec, targetSpeedAt(route, spec, wrapped), longitudinalAccelAt(route, spec, wrapped))
}

/** Pose of a racer that is being integrated by `advanceDroneFlight()`. */
export function sampleDroneFlightPose(route: DroneRoute, spec: DroneRacerSpec, state: DroneFlightState): DronePose {
  const wrapped = wrapRouteDistance(route, state.distance)

  return buildPose(route, wrapped, spec, state.speed, state.controlAccelMetersPerSecondSquared)
}

function buildPose(
  route: DroneRoute,
  distance: number,
  spec: DroneRacerSpec,
  speed: number,
  controlAccel: number,
): DronePose {
  const forward: Vec3 = { x: 0, y: 0, z: 1 }
  const up: Vec3 = { x: 0, y: 1, z: 0 }

  samplePathFrame(route, distance, spec, speed, controlAccel, forward, up)
  applySplitSRotation(route, distance, forward, up)

  return { position: offsetPoint(route, distance, spec, { x: 0, y: 0, z: 0 }), forward, up }
}

/**
 * Trail ribbon behind a drone: `count` positions as xyz triplets, head first.
 * Re-sampling the same weave at earlier distances keeps the streak glued to the path
 * without storing any per-frame history.
 */
export function sampleDroneTrailRibbon(
  route: DroneRoute,
  distance: number,
  spec: DroneRacerSpec,
  count: number,
  spacingMeters: number,
  halfWidthMeters: number,
  out?: Float32Array,
): Float32Array {
  const target = out && out.length >= count * 6 ? out : new Float32Array(count * 6)
  const point: Point3 = { x: 0, y: 0, z: 0 }

  for (let index = 0; index < count; index++) {
    const along = distance - index * spacingMeters
    offsetPoint(route, along, spec, point)
    const tangent = sampleBaseTangent(route, wrapRouteDistance(route, along), scratchTangent)
    const offsetX = -tangent.z * halfWidthMeters
    const offsetZ = tangent.x * halfWidthMeters

    target[index * 6] = point.x + offsetX
    target[index * 6 + 1] = point.y
    target[index * 6 + 2] = point.z + offsetZ
    target[index * 6 + 3] = point.x - offsetX
    target[index * 6 + 4] = point.y
    target[index * 6 + 5] = point.z - offsetZ
  }

  return target
}
