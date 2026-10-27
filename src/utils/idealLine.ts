import type { IdealLineLegRef, IdealLinePoint, Point3 } from '../types'

export const MIN_IDEAL_LINE_U = 0.001
export const MAX_IDEAL_LINE_U = 0.999
export const MAX_IDEAL_LINE_OFFSET_HANDLE = 2.5
export const IDEAL_LINE_U_EPSILON = 1e-6

export interface IdealLineOffsetKnot {
  u: number
  offset: Point3
}

export interface IdealLineBasisSample {
  u: number
  point: Point3
}

export interface IdealLineHoverQuery {
  leg: IdealLineLegRef
  samples: readonly Point3[]
  sampleUs: readonly number[]
  segmentIndex: number
  curveSampleOffset: number
  hit: Point3
}

export interface IdealLineHoverTarget {
  leg: IdealLineLegRef
  u: number
  position: Point3
}

const ZERO: Point3 = { x: 0, y: 0, z: 0 }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const add = (a: Point3, b: Point3): Point3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const sub = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const scale = (point: Point3, factor: number): Point3 => ({ x: point.x * factor, y: point.y * factor, z: point.z * factor })
const length = (point: Point3) => Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2)
const isFinitePoint = (point: Point3) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)

export function clampIdealLineU(u: number): number {
  return clamp(u, MIN_IDEAL_LINE_U, MAX_IDEAL_LINE_U)
}

export function idealLineLegRefEquals(a: IdealLineLegRef, b: IdealLineLegRef): boolean {
  return a.from.gateId === b.from.gateId
    && a.from.openingId === b.from.openingId
    && a.to.gateId === b.to.gateId
    && a.to.openingId === b.to.openingId
}

/** The first matching leg owns the pair; stable u-sort and dedup preserve input order on ties. */
export function groupIdealLinePointsByLeg(
  points: readonly IdealLinePoint[],
  legRefs: readonly IdealLineLegRef[],
): { legIndex: number; points: { id: string; u: number; position: Point3 }[] }[] {
  const groups: { legIndex: number; points: { id: string; u: number; position: Point3 }[] }[] = []

  for (const point of points) {
    const legIndex = legRefs.findIndex((leg) => idealLineLegRefEquals(leg, point.leg))
    if (legIndex < 0 || !Number.isFinite(point.u) || point.u <= 0 || point.u >= 1 || !isFinitePoint(point.position)) continue

    const existing = groups.find((group) => group.legIndex === legIndex)
    const group = existing ?? { legIndex, points: [] }
    if (!existing) groups.push(group)
    group.points.push({ id: point.id, u: point.u, position: point.position })
  }

  for (const group of groups) {
    group.points.sort((a, b) => a.u - b.u)
    group.points = group.points.filter((point, index) => (
      index === 0 || point.u - group.points[index - 1].u >= IDEAL_LINE_U_EPSILON
    ))
  }

  return groups.sort((a, b) => a.legIndex - b.legIndex)
}

export function basisPointAtU(samples: readonly IdealLineBasisSample[], u: number): Point3 {
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (u <= first.u) return { ...first.point }
  if (u >= last.u) return { ...last.point }

  for (let index = 0; index < samples.length - 1; index++) {
    const a = samples[index]
    const b = samples[index + 1]
    const du = b.u - a.u
    if (du <= 0 || u < a.u || u > b.u) continue
    const fraction = (u - a.u) / du
    return {
      x: a.point.x + (b.point.x - a.point.x) * fraction,
      y: a.point.y + (b.point.y - a.point.y) * fraction,
      z: a.point.z + (b.point.z - a.point.z) * fraction,
    }
  }

  return { ...last.point }
}

function clampHandle(handle: Point3): Point3 {
  const magnitude = length(handle)
  return magnitude > MAX_IDEAL_LINE_OFFSET_HANDLE ? scale(handle, MAX_IDEAL_LINE_OFFSET_HANDLE / magnitude) : handle
}

export function createIdealLineOffsetField(
  knots: readonly IdealLineOffsetKnot[],
): (u: number) => Point3 {
  const sorted = knots
    .filter((knot) => Number.isFinite(knot.u) && knot.u > 0 && knot.u < 1 && isFinitePoint(knot.offset))
    .map((knot) => ({ u: knot.u, offset: { ...knot.offset } }))
    .sort((a, b) => a.u - b.u)
    .filter((knot, index, all) => index === 0 || knot.u - all[index - 1].u >= IDEAL_LINE_U_EPSILON)

  if (sorted.length === 0) return () => ({ ...ZERO })

  const values = [{ u: 0, offset: { ...ZERO } }, ...sorted, { u: 1, offset: { ...ZERO } }]
  const tangents = values.map((_, index) => {
    const previous = values[Math.max(0, index - 1)]
    const next = values[Math.min(values.length - 1, index + 1)]
    return scale(sub(next.offset, previous.offset), 1 / (next.u - previous.u))
  })
  const segments = values.slice(0, -1).map((start, index) => {
    const end = values[index + 1]
    const du = end.u - start.u
    return {
      start,
      end,
      c1: add(start.offset, clampHandle(scale(tangents[index], du / 3))),
      c2: sub(end.offset, clampHandle(scale(tangents[index + 1], du / 3))),
    }
  })

  return (inputU) => {
    const u = clamp(inputU, 0, 1)
    const segment = segments.find((candidate) => u <= candidate.end.u) ?? segments[segments.length - 1]
    const du = segment.end.u - segment.start.u
    const s = du > 0 ? (u - segment.start.u) / du : 0
    const inverse = 1 - s
    return add(
      add(scale(segment.start.offset, inverse ** 3), scale(segment.c1, 3 * inverse ** 2 * s)),
      add(scale(segment.c2, 3 * inverse * s ** 2), scale(segment.end.offset, s ** 3)),
    )
  }
}

export function getClosestPathPoint(target: Point3, points: readonly Point3[]): Point3 | null {
  if (points.length === 0) return null
  const distanceSquared = (point: Point3) => (
    (point.x - target.x) ** 2 + (point.y - target.y) ** 2 + (point.z - target.z) ** 2
  )
  return points.reduce((closest, point) => distanceSquared(point) < distanceSquared(closest) ? point : closest)
}

export function resolveIdealLineHover(query: IdealLineHoverQuery): IdealLineHoverTarget | null {
  const start = query.curveSampleOffset + query.segmentIndex
  if (start < 0 || start + 1 >= query.samples.length || start + 1 >= query.sampleUs.length) return null

  const a = query.samples[start]
  const b = query.samples[start + 1]
  const delta = sub(b, a)
  const lengthSquared = delta.x ** 2 + delta.y ** 2 + delta.z ** 2
  const toHit = sub(query.hit, a)
  const fraction = lengthSquared > 1e-18
    ? clamp((toHit.x * delta.x + toHit.y * delta.y + toHit.z * delta.z) / lengthSquared, 0, 1)
    : 0
  const uA = query.sampleUs[start]
  const uB = query.sampleUs[start + 1]

  return {
    leg: query.leg,
    u: clampIdealLineU(uA + (uB - uA) * fraction),
    position: { ...query.hit },
  }
}
