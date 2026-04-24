import type { Gate, GateOpening, GateSize, GateType } from '../types'

const BASE_WIDTH = 1.2
const BASE_HEIGHT = 1.2
const STACK_DISTANCE = BASE_HEIGHT
type GateLike = Omit<Gate, 'openings'> & { openings?: GateOpening[] }

function createOpening(
  id: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  rotation = 0,
): GateOpening {
  return {
    id,
    position: { x, y, z },
    width,
    height,
    rotation,
  }
}

export function getHGateBackrestSide(gateId: string): -1 | 1 {
  let hash = 0

  for (const char of gateId) {
    hash += char.charCodeAt(0)
  }

  return hash % 2 === 0 ? -1 : 1
}

function createHGateOpenings(size: GateSize): GateOpening[] {
  const width = BASE_WIDTH * size
  const height = BASE_HEIGHT * size
  const stackOffset = STACK_DISTANCE * size

  return [
    createOpening('lower', 0, height / 2, 0, width, height),
    createOpening('backrest-pass', 0, stackOffset + height / 2, 0, width, height * 0.9),
  ]
}

function normalizeHGateOpenings(gate: Pick<Gate, 'size'> & { openings?: GateOpening[] }): GateOpening[] {
  const defaultOpenings = createHGateOpenings(gate.size)

  if (!gate.openings || gate.openings.length === 0) {
    return defaultOpenings
  }

  const openingsById = new Map(gate.openings.map((opening) => [opening.id, opening]))
  return defaultOpenings.map((defaultOpening) => ({
    ...defaultOpening,
    ...(openingsById.get(defaultOpening.id) ?? {}),
    position: defaultOpening.position,
    rotation: defaultOpening.rotation,
  }))
}

export function createDefaultGateOpenings(type: GateType, size: GateSize): GateOpening[] {
  const width = BASE_WIDTH * size
  const height = BASE_HEIGHT * size
  const stackOffset = STACK_DISTANCE * size

  switch (type) {
    case 'h-gate':
      return createHGateOpenings(size)
    case 'double':
      return [
        createOpening('lower', 0, height / 2, 0, width, height),
        createOpening('upper', 0, stackOffset + height / 2, 0, width, height),
      ]
    case 'ladder':
      return [
        createOpening('lower', 0, height / 2, 0, width, height),
        createOpening('middle', 0, stackOffset + height / 2, 0, width, height),
        createOpening('upper', 0, stackOffset * 2 + height / 2, 0, width, height),
      ]
    case 'asymmetric':
      return [
        createOpening('lower', 0, height / 2, 0, width, height),
        createOpening('upper', 0, stackOffset + height / 2, 0, width, height),
      ]
    case 'flag':
      return [
        createOpening('left', -0.9 * size, 1.1 * size, 0, 0.8 * size, 1.6 * size),
        createOpening('right', 0.9 * size, 1.1 * size, 0, 0.8 * size, 1.6 * size),
      ]
    case 'standard':
    case 'dive':
    case 'start-finish':
    default:
      return [createOpening('main', 0, height / 2, 0, width, height)]
  }
}

export function normalizeGate(gate: GateLike): Gate {
  return {
    ...gate,
    openings: gate.type === 'h-gate'
      ? normalizeHGateOpenings(gate)
      : gate.openings && gate.openings.length > 0
      ? gate.openings
      : createDefaultGateOpenings(gate.type, gate.size),
  }
}

export function normalizeGates(gates: GateLike[]): Gate[] {
  return gates.map(normalizeGate)
}

export function recreateGateOpenings(gate: Pick<Gate, 'type' | 'size'> & { id?: string }): GateOpening[] {
  return createDefaultGateOpenings(gate.type, gate.size)
}

export function getPrimaryOpeningId(gate: Pick<Gate, 'openings'>): string {
  return gate.openings[0]?.id ?? 'main'
}
