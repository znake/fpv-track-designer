import type { Gate, GateOpening, GateSize, GateType } from '../types'

const BASE_WIDTH = 1.2
const BASE_HEIGHT = 1.2
const STACK_DISTANCE = BASE_HEIGHT

type DiveExitSide = 'front' | 'back' | 'left' | 'right'
const DIVE_EXIT_SIDES: DiveExitSide[] = ['front', 'back', 'left', 'right']

function hashGateId(seed: string): number {
  let hash = 0

  for (const char of seed) {
    hash += char.charCodeAt(0)
  }

  return hash
}

function getDiveExitSide(gateId?: string): DiveExitSide {
  if (!gateId) {
    return DIVE_EXIT_SIDES[0]
  }

  const index = hashGateId(gateId) % DIVE_EXIT_SIDES.length
  return DIVE_EXIT_SIDES[index] ?? DIVE_EXIT_SIDES[0]
}
type GateLike = Omit<Gate, 'openings'> & { openings?: GateOpening[] }

function createOpening(
  id: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  rotation = 0,
  rotationX?: number,
): GateOpening {
  return {
    id,
    position: { x, y, z },
    width,
    height,
    rotation,
    ...(rotationX !== undefined ? { rotationX } : {}),
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

function createDoubleHGateOpenings(size: GateSize): GateOpening[] {
  const width = BASE_WIDTH * size
  const height = BASE_HEIGHT * size
  const stackOffset = STACK_DISTANCE * size

  return [
    createOpening('lower', 0, height / 2, 0, width, height),
    createOpening('middle', 0, stackOffset + height / 2, 0, width, height),
    createOpening('upper', 0, stackOffset * 2 + height / 2, 0, width, height),
  ]
}

function createDiveOpenings(size: GateSize, gateId?: string): GateOpening[] {
  const width = BASE_WIDTH * size
  const height = BASE_HEIGHT * size
  const half = size * BASE_WIDTH * 0.5
  const entryTopOpening = createOpening('entry-top', 0, height, 0, width, height, 0, 90)
  const side = getDiveExitSide(gateId)

  if (side === 'front') {
    return [
      entryTopOpening,
      createOpening('exit-front', 0, height / 2, -half, width, height, 180),
    ]
  }

  if (side === 'back') {
    return [
      entryTopOpening,
      createOpening('exit-back', 0, height / 2, half, width, height, 0),
    ]
  }

  if (side === 'left') {
    return [
      entryTopOpening,
      createOpening('exit-left', -half, height / 2, 0, width, height, 270),
    ]
  }

  return [
    entryTopOpening,
    createOpening('exit-right', half, height / 2, 0, width, height, 90),
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
    rotationX: defaultOpening.rotationX,
  }))
}

function normalizeDoubleHGateOpenings(gate: Pick<Gate, 'size'> & { openings?: GateOpening[] }): GateOpening[] {
  const defaultOpenings = createDoubleHGateOpenings(gate.size)

  if (!gate.openings || gate.openings.length === 0) {
    return defaultOpenings
  }

  const openingsById = new Map(gate.openings.map((opening) => [opening.id, opening]))
  const isLegacyTwoOpeningDoubleH = gate.openings.length === 2 && openingsById.has('upper') && !openingsById.has('middle')
  const legacyMiddleOpening = isLegacyTwoOpeningDoubleH ? openingsById.get('upper') : undefined

  return defaultOpenings.map((defaultOpening) => {
    const persistedOpening = defaultOpening.id === 'middle'
      ? openingsById.get('middle') ?? legacyMiddleOpening
      : isLegacyTwoOpeningDoubleH && defaultOpening.id === 'upper'
      ? undefined
      : openingsById.get(defaultOpening.id)

    return {
      ...defaultOpening,
      ...(persistedOpening ?? {}),
      id: defaultOpening.id,
      position: defaultOpening.position,
      rotation: defaultOpening.rotation,
      rotationX: defaultOpening.rotationX,
    }
  })
}

function normalizeDiveGateOpenings(gate: Pick<Gate, 'id' | 'size'> & { openings?: GateOpening[] }): GateOpening[] {
  const defaultOpenings = createDiveOpenings(gate.size, gate.id)

  if (!gate.openings || gate.openings.length === 0) {
    return defaultOpenings
  }

  const openingsById = new Map(gate.openings.map((opening) => [opening.id, opening]))
  const hasDiveDefaultIds = gate.openings.some((opening) => opening.id === 'entry-top' || opening.id.startsWith('exit-'))

  if (!hasDiveDefaultIds && gate.openings.length === 1) {
    const [legacyOpening] = gate.openings
    return [
      {
        ...legacyOpening,
        ...defaultOpenings[0],
        position: defaultOpenings[0].position,
        rotation: defaultOpenings[0].rotation,
        rotationX: defaultOpenings[0].rotationX,
      },
      defaultOpenings[1],
    ]
  }

  return defaultOpenings.map((defaultOpening) => ({
    ...defaultOpening,
    ...(openingsById.get(defaultOpening.id) ?? {}),
    position: defaultOpening.position,
    rotation: defaultOpening.rotation,
    rotationX: defaultOpening.rotationX,
  }))
}

export function createDefaultGateOpenings(type: GateType, size: GateSize, gateId?: string): GateOpening[] {
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
    case 'double-h':
      return createDoubleHGateOpenings(size)
    case 'flag':
      return [
        createOpening('main', -0.45 * size, 1.1 * size, 0, 0.8 * size, 1.6 * size),
      ]
    case 'standard':
      return [createOpening('main', 0, height / 2, 0, width, height)]
    case 'dive':
      return createDiveOpenings(size, gateId)
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
      : gate.type === 'double-h'
      ? normalizeDoubleHGateOpenings(gate)
      : gate.type === 'dive'
      ? normalizeDiveGateOpenings(gate)
      : gate.openings && gate.openings.length > 0
      ? gate.openings
      : createDefaultGateOpenings(gate.type, gate.size, gate.id),
  }
}

export function normalizeGates(gates: GateLike[]): Gate[] {
  return gates.map(normalizeGate)
}

export function recreateGateOpenings(gate: Pick<Gate, 'type' | 'size'> & { id?: string }): GateOpening[] {
  return createDefaultGateOpenings(gate.type, gate.size, gate.id)
}

export function getPrimaryOpeningId(gate: Pick<Gate, 'openings'>): string {
  return gate.openings[0]?.id ?? 'main'
}
