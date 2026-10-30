import type { Point3 } from '../types'

/**
 * Drone race motion: four tinywhoops fly the ideal line forever, each on its own
 * sine-shaped sideways and height offset so the pack looks like real pilots who cut
 * corners tighter or wider. Pure math only — the scene component drives it from `useFrame`.
 *
 * The ideal line joins gate-to-gate curves with direction breaks, so the route is closed
 * into a lap, its points and its unit directions are smoothed, and heading, bank and pace
 * are eased over time. Raw sampling makes a racer twitch at every gate.
 */

export interface DroneDirection {
  x: number
  z: number
}

export interface DroneRoute {
  points: Point3[]
  distances: number[]
  totalLength: number
  turnRates: number[]
  directions: DroneDirection[]
}

export interface DroneRacerSpec {
  id: string
  color: string
  speedMetersPerSecond: number
  lateralAmplitudeMeters: number
  lateralWavelengthMeters: number
  verticalAmplitudeMeters: number
  verticalWavelengthMeters: number
  phaseRadians: number
}

export interface DronePose {
  position: Point3
  /** Radians around Y; the drone model's local +Z points along the flight direction. */
  heading: number
  /** Radians around the local Z axis; negative banks left, positive banks right. */
  roll: number
}

export interface DroneRouteOptions {
  closeLoop?: boolean
}

export const DRONE_FLOOR_HEIGHT = 0.12
export const DRONE_MAX_BANK_RADIANS = 0.48
export const DRONE_MIN_SPEED_FACTOR = 0.5

const TWO_PI = Math.PI * 2
const ROUTE_SMOOTHING_METERS = 0.35
const DIRECTION_SMOOTHING_METERS = 0.4
const TURN_WINDOW_METERS = 0.7
const TURN_SMOOTHING_RADIUS = 10
const CURVATURE_SLOWDOWN = 0.85
const BANK_GAIN = 0.016
const LOOP_CLOSE_TOLERANCE = 0.01
const RETURN_LEG_MIN_GAP = 0.02
const MAX_SMOOTHING_RADIUS = 60

export const DRONE_RACERS: readonly DroneRacerSpec[] = [
  {
    id: 'pink',
    color: '#ff3d9e',
    speedMetersPerSecond: 5.2,
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

function vertexDirection(points: Point3[], index: number, closed: boolean): DroneDirection {
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

function computeDirections(points: Point3[], closed: boolean): DroneDirection[] {
  const raw = points.map((_, index) => vertexDirection(points, index, closed))
  const radius = smoothingRadius(points, DIRECTION_SMOOTHING_METERS)
  if (radius < 2 || radius > MAX_SMOOTHING_RADIUS) return raw

  const smoothedX = smoothValues(raw.map((direction) => direction.x), closed, radius)
  const smoothedZ = smoothValues(raw.map((direction) => direction.z), closed, radius)

  return raw.map((direction, index) => {
    const length = Math.hypot(smoothedX[index], smoothedZ[index])
    return length > 1e-6
      ? { x: smoothedX[index] / length, z: smoothedZ[index] / length }
      : direction
  })
}

export function buildDroneRoute(rawPoints: readonly Point3[], options: DroneRouteOptions = {}): DroneRoute {
  if (rawPoints.length < 2) {
    return {
      points: clonePoints(rawPoints),
      distances: rawPoints.map(() => 0),
      totalLength: 0,
      turnRates: rawPoints.map(() => 0),
      directions: rawPoints.map(() => ({ x: 0, z: 1 })),
    }
  }

  let points = clonePoints(rawPoints)
  const sourceClosed = distanceBetween(points[0], points[points.length - 1]) <= LOOP_CLOSE_TOLERANCE
  const closed = sourceClosed || options.closeLoop === true

  if (!sourceClosed && options.closeLoop === true) {
    points = appendReturnLeg(points, averageSpacing(points))
  }

  points = smoothPolyline(points, closed)
  const { distances, totalLength } = buildDistances(points)
  const turnRates = computeTurnRates(points, distances, totalLength, closed)
  const directions = computeDirections(points, closed)

  return { points, distances, totalLength, turnRates, directions }
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
const scratchDirection: DroneDirection = { x: 0, z: 1 }

function sampleDirection(route: DroneRoute, distance: number, out: DroneDirection): DroneDirection {
  const { directions, totalLength } = route
  if (totalLength <= 0 || directions.length === 0) {
    out.x = 0
    out.z = 1
    return out
  }

  const wrapped = wrapRouteDistance(route, distance)
  const index = findSegmentIndex(route.distances, wrapped)
  const nextIndex = Math.min(index + 1, directions.length - 1)
  const t = routeFraction(route, wrapped, index)
  const from = directions[index]
  const to = directions[nextIndex]
  const x = from.x + (to.x - from.x) * t
  const z = from.z + (to.z - from.z) * t
  const length = Math.hypot(x, z)

  if (length > 1e-6) {
    out.x = x / length
    out.z = z / length
  } else {
    out.x = from.x
    out.z = from.z
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

function offsetPoint(route: DroneRoute, distance: number, spec: DroneRacerSpec, out: Point3): Point3 {
  const wrapped = wrapRouteDistance(route, distance)
  const base = sampleRoutePoint(route, wrapped, scratchBase)
  const direction = sampleDirection(route, wrapped, scratchDirection)
  const lateral = lateralOffsetMeters(spec, wrapped, route.totalLength)

  out.x = base.x - direction.z * lateral
  out.y = Math.max(DRONE_FLOOR_HEIGHT, base.y + verticalOffsetMeters(spec, wrapped, route.totalLength))
  out.z = base.z + direction.x * lateral
  return out
}

/** Signed turn rate along the route; positive means the drone turns left. */
export function turnRateRadiansPerMeter(route: DroneRoute, distance: number): number {
  const { turnRates, totalLength } = route
  if (totalLength <= 0 || turnRates.length === 0) return 0

  const wrapped = wrapRouteDistance(route, distance)
  const index = findSegmentIndex(route.distances, wrapped)
  const nextIndex = Math.min(index + 1, turnRates.length - 1)
  const t = routeFraction(route, wrapped, index)

  return turnRates[index] + (turnRates[nextIndex] - turnRates[index]) * t
}

/** Pilots brake into tight sections and carry full speed down a straight. */
export function speedFactorAt(route: DroneRoute, distance: number): number {
  const turnRate = Math.abs(turnRateRadiansPerMeter(route, distance))

  return Math.max(DRONE_MIN_SPEED_FACTOR, 1 / (1 + CURVATURE_SLOWDOWN * turnRate))
}

/** Banks the drone into the corner it is flying. */
export function bankRadians(turnRate: number, speedMetersPerSecond: number): number {
  const raw = -turnRate * speedMetersPerSecond * speedMetersPerSecond * BANK_GAIN

  return Math.max(-DRONE_MAX_BANK_RADIANS, Math.min(DRONE_MAX_BANK_RADIANS, raw))
}

/** Eases an angle towards a target along the shorter arc, so a quad never snaps round. */
export function approachAngle(
  current: number,
  target: number,
  responsePerSecond: number,
  deltaSeconds: number,
): number {
  const shortest = Math.atan2(Math.sin(target - current), Math.cos(target - current))

  return current + shortest * (1 - Math.exp(-responsePerSecond * deltaSeconds))
}

export function sampleDronePose(route: DroneRoute, distance: number, spec: DroneRacerSpec): DronePose {
  const wrapped = wrapRouteDistance(route, distance)
  const position = offsetPoint(route, wrapped, spec, { x: 0, y: 0, z: 0 })
  const direction = sampleDirection(route, wrapped, scratchDirection)

  return {
    position,
    heading: Math.atan2(direction.x, direction.z),
    roll: bankRadians(turnRateRadiansPerMeter(route, wrapped), spec.speedMetersPerSecond),
  }
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
    const direction = sampleDirection(route, wrapRouteDistance(route, along), scratchDirection)
    const offsetX = -direction.z * halfWidthMeters
    const offsetZ = direction.x * halfWidthMeters

    target[index * 6] = point.x + offsetX
    target[index * 6 + 1] = point.y
    target[index * 6 + 2] = point.z + offsetZ
    target[index * 6 + 3] = point.x - offsetX
    target[index * 6 + 4] = point.y
    target[index * 6 + 5] = point.z - offsetZ
  }

  return target
}
