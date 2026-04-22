import type { Gate, GateType, Track, Config } from '../types'

const MIN_DISTANCE = 3 // meters
const MAX_ATTEMPTS = 100

function distance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

function isTooClose(newGate: Gate, existingGates: Gate[]): boolean {
  return existingGates.some((g) => distance(newGate.position, g.position) < MIN_DISTANCE)
}

function generateRandomPosition(fieldSize: {
  width: number
  height: number
}): { x: number; y: number; z: number } {
  return {
    x: (Math.random() - 0.5) * fieldSize.width,
    y: 0, // On the ground
    z: (Math.random() - 0.5) * fieldSize.height,
  }
}

function orderGatesByProximity(gates: Gate[]): Gate[] {
  if (gates.length <= 1) return gates

  const remaining = [...gates]
  const ordered: Gate[] = [remaining.shift()!] // Start with first gate (start-finish)

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1]
    let nearestIdx = 0
    let nearestDist = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const d = distance(current.position, remaining[i].position)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }

    ordered.push(remaining.splice(nearestIdx, 1)[0])
  }

  return ordered
}

/** Align gate rotations so each gate faces the flight path direction (to next gate).
 *  Rotation is rounded to nearest 30° step to match the UI constraints.
 */
function alignGateRotations(gates: Gate[]): void {
  const n = gates.length
  if (n < 2) return

  for (let i = 0; i < n; i++) {
    const curr = gates[i]
    const next = gates[(i + 1) % n]

    const dx = next.position.x - curr.position.x
    const dz = next.position.z - curr.position.z

    // atan2(dx, dz) gives angle from +Z axis, which matches Three.js Y-rotation
    let angle = Math.atan2(dx, dz) * (180 / Math.PI)

    // Normalize to 0-360
    angle = ((angle % 360) + 360) % 360

    // Round to nearest 30° step (0, 30, 60, ..., 330)
    const rounded = Math.round(angle / 30) * 30

    gates[i].rotation = rounded % 360
  }
}

/**
 * Creates an ordered fly-through sequence from unique gates.
 * Same gate may appear multiple times, but never consecutively
 * (including the wrap-around from last -> first).
 */
function buildGateSequence(gates: Gate[]): string[] {
  const base = gates.map((g) => g.id)

  if (base.length < 2) return base

  const sequence = [...base]

  // Optional extra passes through existing gates
  if (base.length >= 3) {
    const maxExtras = Math.max(1, Math.floor(base.length / 2))
    const extraCount = Math.floor(Math.random() * (maxExtras + 1))

    for (let i = 0; i < extraCount; i++) {
      const gateId = base[Math.floor(Math.random() * base.length)]
      let inserted = false

      for (let attempt = 0; attempt < 30 && !inserted; attempt++) {
        const insertIdx = Math.floor(Math.random() * (sequence.length + 1))
        const prev = sequence[(insertIdx - 1 + sequence.length) % sequence.length]
        const next = sequence[insertIdx % sequence.length]

        if (prev !== gateId && next !== gateId) {
          sequence.splice(insertIdx, 0, gateId)
          inserted = true
        }
      }
    }
  }

  if (sequence.length > 1 && sequence[0] === sequence[sequence.length - 1]) {
    sequence.pop()
  }

  return sequence
}

export function generateTrack(config: Config): Track {
  const gates: Gate[] = []
  const gateTypes = Object.entries(config.gateQuantities)
    .flatMap(([type, count]) => Array(count).fill(type as GateType))

  // Place start-finish gate first at origin
  const startFinishIndex = gateTypes.indexOf('start-finish')
  if (startFinishIndex >= 0) {
    const [sf] = gateTypes.splice(startFinishIndex, 1)
    gates.push({
      id: crypto.randomUUID(),
      type: sf as GateType,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      size: config.gateSize,
    })
  }

  // Place remaining gates
  for (const type of gateTypes) {
    let placed = false
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !placed; attempt++) {
      const position = generateRandomPosition(config.fieldSize)
      const gate: Gate = {
        id: crypto.randomUUID(),
        type,
        position,
        rotation: Math.floor(Math.random() * 12) * 30, // 0-330 in 30deg steps
        size: config.gateSize,
      }
      if (!isTooClose(gate, gates)) {
        gates.push(gate)
        placed = true
      }
    }
    if (!placed) {
      console.warn(`Could not place ${type} gate`)
    }
  }

  // Order gates by proximity (nearest neighbor from start)
  const ordered = orderGatesByProximity(gates)

  // Align rotations so gates face the flight path
  alignGateRotations(ordered)

  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: `Track ${now.slice(0, 10)}`,
    gates: ordered,
    gateSequence: buildGateSequence(ordered),
    fieldSize: config.fieldSize,
    gateSize: config.gateSize,
    createdAt: now,
    updatedAt: now,
  }
}
