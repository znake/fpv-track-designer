import type { Gate, GateSequenceItem, IdealLineLegRef, IdealLineVisitRef, Point3 } from '../types'
import { idealLineLegRefEquals } from './idealLine'
import type { IdealLineHoverTarget } from './idealLine'

export interface IdealLineGateInsertion {
  gateIndex: number
  sequenceIndex: number
  position: Point3
  rotation: number
}

export interface IdealLineGateInsertionQuery {
  hover: IdealLineHoverTarget
  legRefs: readonly IdealLineLegRef[]
  sampledLegs: readonly (readonly Point3[])[]
  sampledLegUs: readonly (readonly number[])[]
  gates: readonly Gate[]
  gateSequence: readonly GateSequenceItem[]
}

const SAMPLE_LOOKAHEAD = 3
const MIN_TANGENT_LENGTH = 1e-6

function matchesVisit(entry: GateSequenceItem, visit: IdealLineVisitRef): boolean {
  return entry.gateId === visit.gateId && entry.openingId === visit.openingId
}

/** A same-gate leg must land after the last visit of that gate, not before its first one. */
function findInsertionSequenceIndex(
  gateSequence: readonly GateSequenceItem[],
  fromVisit: IdealLineVisitRef,
  toVisit: IdealLineVisitRef,
): number {
  const indexes: number[] = []
  gateSequence.forEach((entry, index) => {
    if (matchesVisit(entry, toVisit)) indexes.push(index)
  })
  if (indexes.length === 0) return gateSequence.length

  const isSameGateLeg = fromVisit.gateId === toVisit.gateId
  return isSameGateLeg ? indexes[indexes.length - 1] : indexes[0]
}

/**
 * `getGateEntryDirection` treats local -Z as the entry side, so a gate rotated
 * by r has travel direction (sin r, 0, cos r).
 */
function resolveRotation(
  legSamples: readonly Point3[],
  legSampleUs: readonly number[],
  u: number,
  fallback: number,
): number {
  if (legSamples.length < 2) return fallback

  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < legSampleUs.length; index++) {
    const distance = Math.abs(legSampleUs[index] - u)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  }

  const lastIndex = Math.min(legSamples.length, legSampleUs.length) - 1
  const start = legSamples[Math.max(0, closestIndex - SAMPLE_LOOKAHEAD)]
  const end = legSamples[Math.min(lastIndex, closestIndex + SAMPLE_LOOKAHEAD)]
  const dx = end.x - start.x
  const dz = end.z - start.z
  if (Math.hypot(dx, dz) < MIN_TANGENT_LENGTH) return fallback

  const degrees = (Math.atan2(dx, dz) * 180) / Math.PI
  return ((degrees % 360) + 360) % 360
}

export function resolveIdealLineGateInsertion(query: IdealLineGateInsertionQuery): IdealLineGateInsertion | null {
  const legIndex = query.legRefs.findIndex((leg) => idealLineLegRefEquals(leg, query.hover.leg))
  if (legIndex < 0) return null

  const fromGate = query.gates.find((gate) => gate.id === query.hover.leg.from.gateId) ?? null
  const toGate = query.gates.find((gate) => gate.id === query.hover.leg.to.gateId) ?? null
  if (!fromGate && !toGate) return null

  const fromGateIndex = fromGate ? query.gates.findIndex((gate) => gate.id === fromGate.id) : -1

  return {
    gateIndex: fromGateIndex >= 0 ? fromGateIndex + 1 : query.gates.length,
    sequenceIndex: findInsertionSequenceIndex(query.gateSequence, query.hover.leg.from, query.hover.leg.to),
    position: {
      x: query.hover.position.x,
      y: fromGate?.position.y ?? toGate?.position.y ?? 0,
      z: query.hover.position.z,
    },
    rotation: resolveRotation(
      query.sampledLegs[legIndex] ?? [],
      query.sampledLegUs[legIndex] ?? [],
      query.hover.u,
      fromGate?.rotation ?? toGate?.rotation ?? 0,
    ),
  }
}
