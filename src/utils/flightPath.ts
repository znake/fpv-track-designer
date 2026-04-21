import type { Gate } from '../types'

export interface PathSegment {
  from: { x: number; y: number; z: number }
  to: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  length: number
}

export interface ArrowPosition {
  position: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
}

export interface FlightPath {
  segments: PathSegment[]
  arrows: ArrowPosition[]
  totalLength: number
}

const ARROW_SPACING = 5 // meters between arrows

function distance3d(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

function normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)
  if (len === 0) return { x: 0, y: 0, z: 1 }
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

export function calculateFlightPath(gates: Gate[]): FlightPath {
  if (gates.length < 2) {
    return { segments: [], arrows: [], totalLength: 0 }
  }

  const segments: PathSegment[] = []
  const arrows: ArrowPosition[] = []
  let totalLength = 0

  // Include closing segment (last gate to first)
  const allGates = [...gates, gates[0]]

  for (let i = 0; i < allGates.length - 1; i++) {
    const from = allGates[i].position
    const to = allGates[i + 1].position
    const direction = normalize({ x: to.x - from.x, y: to.y - from.y, z: to.z - from.z })
    const length = distance3d(from, to)

    segments.push({ from, to, direction, length })
    totalLength += length

    // Place arrows along segment
    let arrowDist = ARROW_SPACING / 2 // First arrow at half spacing
    while (arrowDist < length) {
      const t = arrowDist / length
      arrows.push({
        position: {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          z: from.z + (to.z - from.z) * t,
        },
        direction,
      })
      arrowDist += ARROW_SPACING
    }
  }

  return { segments, arrows, totalLength }
}
