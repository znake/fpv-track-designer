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
    y: Math.random() * 5 + 1, // Height between 1-6m
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
      position: { x: 0, y: 2, z: 0 },
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

  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: `Track ${now.slice(0, 10)}`,
    gates: ordered,
    fieldSize: config.fieldSize,
    gateSize: config.gateSize,
    createdAt: now,
    updatedAt: now,
  }
}
