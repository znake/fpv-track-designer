import type { Gate } from '../types'

export type Direction = 'N' | 'S' | 'E' | 'W'

export function moveGate(
  gate: Gate,
  direction: Direction,
  distance: number = 1,
  fieldSize: { width: number; height: number }
): Gate {
  const halfW = fieldSize.width / 2
  const halfH = fieldSize.height / 2
  const newPos = { ...gate.position }

  switch (direction) {
    case 'N': newPos.y += distance; break
    case 'S': newPos.y -= distance; break
    case 'E': newPos.x += distance; break
    case 'W': newPos.x -= distance; break
  }

  // Clamp to field bounds (y is height, x/z are horizontal)
  newPos.y = Math.max(0.5, Math.min(10, newPos.y)) // Height range 0.5-10m
  newPos.x = Math.max(-halfW, Math.min(halfW, newPos.x))
  newPos.z = Math.max(-halfH, Math.min(halfH, newPos.z))

  return { ...gate, position: newPos }
}

export function rotateGate(gate: Gate, clockwise: boolean): Gate {
  const delta = clockwise ? 30 : -30
  const newRotation = ((gate.rotation + delta) % 360 + 360) % 360
  return { ...gate, rotation: newRotation }
}
