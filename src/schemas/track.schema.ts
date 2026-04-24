import type { Config } from '../types/config'
import type { Gate, GateOpening, GateType } from '../types/gate'
import type { GateSequenceItem, Track } from '../types/track'
import { normalizeGates } from '../utils/gateOpenings'
import { normalizeGateSequence } from '../utils/gateSequence'

export const SCHEMA_VERSION = '1.1.0'

export interface TrackExportSchema {
  version: string
  track: {
    id: string
    name: string
    gates: Gate[]
    gateSequence?: Array<string | GateSequenceItem>
    fieldSize: { width: number; height: number }
    gateSize: 0.75 | 1 | 1.5
    createdAt: string
    updatedAt: string
  }
  config: {
    gateQuantities: Record<GateType, number>
    fieldSize: { width: number; height: number }
    gateSize: 0.75 | 1 | 1.5
    showFlightPath?: boolean
    showOpeningLabels?: boolean
  }
}

export interface ValidationError {
  field: string
  message: string
}

const LEGACY_GATE_TYPE_MAP = {
  asymmetric: 'double-h' as const,
} as const

const VALID_GATE_TYPES: GateType[] = ['standard', 'h-gate', 'double-h', 'dive', 'double', 'ladder', 'start-finish', 'flag']
const VALID_GATE_SIZES = [0.75, 1, 1.5] as const

function normalizeGateType(type: unknown): GateType | null {
  if (typeof type !== 'string') return null
  if (type in LEGACY_GATE_TYPE_MAP) {
    return LEGACY_GATE_TYPE_MAP[type as keyof typeof LEGACY_GATE_TYPE_MAP]
  }
  return (VALID_GATE_TYPES as readonly string[]).includes(type) ? (type as GateType) : null
}

function getGateQuantityCandidate(candidate: Record<string, unknown>, gateType: GateType): number | undefined {
  if (gateType === 'double-h' && candidate.asymmetric !== undefined) {
    return typeof candidate.asymmetric === 'number' ? candidate.asymmetric : undefined
  }

  const value = candidate[gateType]
  return typeof value === 'number' ? value : undefined
}

function normalizeGateQuantities(quantities: Record<string, unknown>): Record<GateType, number> {
  const result = {} as Record<GateType, number>

  VALID_GATE_TYPES.forEach((gateType) => {
    const value = getGateQuantityCandidate(quantities, gateType)
    result[gateType] = value ?? 0
  })

  return result
}

function validateOpening(opening: unknown, gateIndex: number, openingIndex: number): ValidationError[] {
  const errors: ValidationError[] = []
  const candidate = opening as Record<string, unknown>

  if (typeof candidate.id !== 'string') {
    errors.push({ field: `track.gates[${gateIndex}].openings[${openingIndex}].id`, message: 'Opening id must be a string' })
  }

  if (!candidate.position || typeof candidate.position !== 'object') {
    errors.push({ field: `track.gates[${gateIndex}].openings[${openingIndex}].position`, message: 'Opening position must be an object' })
  } else {
    const position = candidate.position as Record<string, unknown>
    if (typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      errors.push({ field: `track.gates[${gateIndex}].openings[${openingIndex}].position`, message: 'Opening position must contain numeric x, y, z values' })
    }
  }

  if (typeof candidate.width !== 'number' || candidate.width <= 0) {
    errors.push({ field: `track.gates[${gateIndex}].openings[${openingIndex}].width`, message: 'Opening width must be a positive number' })
  }

  if (typeof candidate.height !== 'number' || candidate.height <= 0) {
    errors.push({ field: `track.gates[${gateIndex}].openings[${openingIndex}].height`, message: 'Opening height must be a positive number' })
  }

  if (typeof candidate.rotation !== 'number') {
    errors.push({ field: `track.gates[${gateIndex}].openings[${openingIndex}].rotation`, message: 'Opening rotation must be a number' })
  }

  if (candidate.rotationX !== undefined && typeof candidate.rotationX !== 'number') {
    errors.push({ field: `track.gates[${gateIndex}].openings[${openingIndex}].rotationX`, message: 'Opening rotationX must be a number when provided' })
  }

  if (candidate.reverse !== undefined && typeof candidate.reverse !== 'boolean') {
    errors.push({ field: `track.gates[${gateIndex}].openings[${openingIndex}].reverse`, message: 'Opening reverse must be a boolean when provided' })
  }

  return errors
}

function validateGate(gate: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = []
  const candidate = gate as Record<string, unknown>

  if (typeof candidate.id !== 'string') {
    errors.push({ field: `track.gates[${index}].id`, message: 'Gate id must be a string' })
  }

  if (!normalizeGateType(candidate.type)) {
    errors.push({ field: `track.gates[${index}].type`, message: `Gate type must be one of: ${VALID_GATE_TYPES.join(', ')}` })
  }

  if (!candidate.position || typeof candidate.position !== 'object') {
    errors.push({ field: `track.gates[${index}].position`, message: 'Gate position must be an object' })
  } else {
    const position = candidate.position as Record<string, unknown>
    if (typeof position.x !== 'number') {
      errors.push({ field: `track.gates[${index}].position.x`, message: 'Position x must be a number' })
    }
    if (typeof position.y !== 'number') {
      errors.push({ field: `track.gates[${index}].position.y`, message: 'Position y must be a number' })
    }
    if (typeof position.z !== 'number') {
      errors.push({ field: `track.gates[${index}].position.z`, message: 'Position z must be a number' })
    }
  }

  if (typeof candidate.rotation !== 'number' || candidate.rotation < 0 || candidate.rotation > 330 || candidate.rotation % 30 !== 0) {
    errors.push({ field: `track.gates[${index}].rotation`, message: 'Rotation must be a number between 0-330 in 30deg steps' })
  }

  if (!VALID_GATE_SIZES.includes(candidate.size as typeof VALID_GATE_SIZES[number])) {
    errors.push({ field: `track.gates[${index}].size`, message: `Gate size must be one of: ${VALID_GATE_SIZES.join(', ')}` })
  }

  if (candidate.openings !== undefined) {
    if (!Array.isArray(candidate.openings)) {
      errors.push({ field: `track.gates[${index}].openings`, message: 'Gate openings must be an array when provided' })
    } else {
      candidate.openings.forEach((opening, openingIndex) => {
        errors.push(...validateOpening(opening, index, openingIndex))
      })
    }
  }

  return errors
}

function validateFieldSize(fieldSize: unknown, prefix: string): ValidationError[] {
  const errors: ValidationError[] = []
  const candidate = fieldSize as Record<string, unknown>

  if (!candidate || typeof candidate !== 'object') {
    errors.push({ field: prefix, message: 'Field size must be an object' })
    return errors
  }

  if (typeof candidate.width !== 'number' || candidate.width <= 0) {
    errors.push({ field: `${prefix}.width`, message: 'Width must be a positive number' })
  }

  if (typeof candidate.height !== 'number' || candidate.height <= 0) {
    errors.push({ field: `${prefix}.height`, message: 'Height must be a positive number' })
  }

  return errors
}

function validateBooleanFlag(flag: unknown, field: string): ValidationError[] {
  if (flag === undefined) return []
  return typeof flag === 'boolean'
    ? []
    : [{ field, message: 'Config value must be a boolean when provided' }]
}

function validateGateQuantities(quantities: unknown): ValidationError[] {
  const errors: ValidationError[] = []
  const candidate = quantities as Record<string, unknown>

  if (!candidate || typeof candidate !== 'object') {
    errors.push({ field: 'config.gateQuantities', message: 'Gate quantities must be an object' })
    return errors
  }

  for (const gateType of VALID_GATE_TYPES) {
    const quantity = getGateQuantityCandidate(candidate, gateType)
    if (typeof quantity !== 'number' || quantity < 0 || !Number.isInteger(quantity)) {
      errors.push({ field: `config.gateQuantities.${gateType}`, message: `Gate quantity for ${gateType} must be a non-negative integer` })
    }
  }

  return errors
}

function validateGateSequenceEntry(
  entry: unknown,
  index: number,
  gateOpenings: Map<string, Set<string>>,
): ValidationError[] {
  const errors: ValidationError[] = []

  if (typeof entry === 'string') {
    if (!gateOpenings.has(entry)) {
      errors.push({ field: `track.gateSequence[${index}]`, message: `gateSequence entry '${entry}' does not match any gate id` })
    }
    return errors
  }

  if (!entry || typeof entry !== 'object') {
    errors.push({ field: `track.gateSequence[${index}]`, message: 'gateSequence entry must be a string or sequence object' })
    return errors
  }

  const candidate = entry as Record<string, unknown>
  if (typeof candidate.gateId !== 'string') {
    errors.push({ field: `track.gateSequence[${index}].gateId`, message: 'gateId must be a string' })
    return errors
  }

  const openings = gateOpenings.get(candidate.gateId)
  if (!openings) {
    errors.push({ field: `track.gateSequence[${index}].gateId`, message: `gateId '${candidate.gateId}' does not match any gate id` })
    return errors
  }

  if (typeof candidate.openingId !== 'string') {
    errors.push({ field: `track.gateSequence[${index}].openingId`, message: 'openingId must be a string' })
  } else if (openings.size > 0 && !openings.has(candidate.openingId)) {
    errors.push({ field: `track.gateSequence[${index}].openingId`, message: `openingId '${candidate.openingId}' does not match any opening on gate '${candidate.gateId}'` })
  }

  if (candidate.reverse !== undefined && typeof candidate.reverse !== 'boolean') {
    errors.push({ field: `track.gateSequence[${index}].reverse`, message: 'reverse must be a boolean when provided' })
  }

  return errors
}

export function validateTrack(data: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] }
  }

  const root = data as Record<string, unknown>

  if (typeof root.version !== 'string') {
    errors.push({ field: 'version', message: 'Version must be a string' })
  }

  if (!root.track || typeof root.track !== 'object') {
    errors.push({ field: 'track', message: 'Track must be an object' })
  } else {
    const track = root.track as Record<string, unknown>

    if (typeof track.id !== 'string') {
      errors.push({ field: 'track.id', message: 'Track id must be a string' })
    }

    if (typeof track.name !== 'string') {
      errors.push({ field: 'track.name', message: 'Track name must be a string' })
    }

    const gateOpeningMap = new Map<string, Set<string>>()

    if (!Array.isArray(track.gates)) {
      errors.push({ field: 'track.gates', message: 'Track gates must be an array' })
    } else {
      track.gates.forEach((gate, index) => {
        errors.push(...validateGate(gate, index))
        if (gate && typeof gate === 'object') {
          const candidate = gate as Record<string, unknown>
          const openingIds = Array.isArray(candidate.openings)
            ? new Set((candidate.openings as GateOpening[]).map((opening) => opening.id))
            : new Set<string>()

          if (typeof candidate.id === 'string') {
            gateOpeningMap.set(candidate.id, openingIds)
          }
        }
      })
    }

    if (track.gateSequence !== undefined) {
      if (!Array.isArray(track.gateSequence)) {
        errors.push({ field: 'track.gateSequence', message: 'gateSequence must be an array when provided' })
      } else {
        const gateSequence = track.gateSequence as unknown[]

        gateSequence.forEach((entry, index) => {
          errors.push(...validateGateSequenceEntry(entry, index, gateOpeningMap))
          if (index > 0 && JSON.stringify(entry) === JSON.stringify(gateSequence[index - 1])) {
            errors.push({ field: `track.gateSequence[${index}]`, message: 'Consecutive identical gateSequence entries are not allowed' })
          }
        })

        if (gateSequence.length > 1) {
          const first = gateSequence[0]
          const last = gateSequence[gateSequence.length - 1]
          if (JSON.stringify(first) === JSON.stringify(last)) {
            errors.push({ field: 'track.gateSequence', message: 'First and last gateSequence entry must not be identical in looped tracks' })
          }
        }
      }
    }

    errors.push(...validateFieldSize(track.fieldSize, 'track.fieldSize'))

    if (!VALID_GATE_SIZES.includes(track.gateSize as typeof VALID_GATE_SIZES[number])) {
      errors.push({ field: 'track.gateSize', message: `Track gate size must be one of: ${VALID_GATE_SIZES.join(', ')}` })
    }

    if (typeof track.createdAt !== 'string') {
      errors.push({ field: 'track.createdAt', message: 'CreatedAt must be an ISO date string' })
    }

    if (typeof track.updatedAt !== 'string') {
      errors.push({ field: 'track.updatedAt', message: 'UpdatedAt must be an ISO date string' })
    }
  }

  if (!root.config || typeof root.config !== 'object') {
    errors.push({ field: 'config', message: 'Config must be an object' })
  } else {
    const config = root.config as Record<string, unknown>
    errors.push(...validateGateQuantities(config.gateQuantities))
    errors.push(...validateFieldSize(config.fieldSize, 'config.fieldSize'))

    if (!VALID_GATE_SIZES.includes(config.gateSize as typeof VALID_GATE_SIZES[number])) {
      errors.push({ field: 'config.gateSize', message: `Config gateSize must be one of: ${VALID_GATE_SIZES.join(', ')}` })
    }

    errors.push(...validateBooleanFlag(config.showFlightPath, 'config.showFlightPath'))
    errors.push(...validateBooleanFlag(config.showOpeningLabels, 'config.showOpeningLabels'))
  }

  return { valid: errors.length === 0, errors }
}

export function serializeTrack(track: Track, config: Config): string {
  const exportData: TrackExportSchema = {
    version: SCHEMA_VERSION,
    track: {
      id: track.id,
      name: track.name,
      gates: track.gates,
      gateSequence: track.gateSequence,
      fieldSize: track.fieldSize,
      gateSize: track.gateSize,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    },
    config: {
      gateQuantities: config.gateQuantities,
      fieldSize: config.fieldSize,
      gateSize: config.gateSize,
      showFlightPath: config.showFlightPath,
      showOpeningLabels: config.showOpeningLabels,
    },
  }

  return JSON.stringify(exportData, null, 2)
}

export function deserializeTrack(jsonString: string): { track: Track; config: Config } | { error: string; errors: ValidationError[] } {
  let parsed: unknown

  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { error: 'Invalid JSON', errors: [{ field: 'root', message: 'Failed to parse JSON' }] }
  }

  const validation = validateTrack(parsed)
  if (!validation.valid) {
    return { error: 'Validation failed', errors: validation.errors }
  }

  const data = parsed as TrackExportSchema
  const normalizedGates = data.track.gates.map((gate) => ({
    ...gate,
    type: normalizeGateType(gate.type) ?? gate.type,
  }))
  const gates = normalizeGates(normalizedGates)

  return {
    track: {
      id: data.track.id,
      name: data.track.name,
      gates,
      gateSequence: normalizeGateSequence(data.track.gateSequence, gates),
      fieldSize: data.track.fieldSize,
      gateSize: data.track.gateSize,
      createdAt: data.track.createdAt,
      updatedAt: data.track.updatedAt,
    },
    config: {
      gateQuantities: normalizeGateQuantities(data.config.gateQuantities),
      fieldSize: data.config.fieldSize,
      gateSize: data.config.gateSize,
      showFlightPath: data.config.showFlightPath ?? true,
      showOpeningLabels: data.config.showOpeningLabels ?? true,
    },
  }
}

export function isValidTrack(data: unknown): boolean {
  return validateTrack(data).valid
}
