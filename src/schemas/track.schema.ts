import type { Gate, GateType } from '../types/gate';
import type { Track } from '../types/track';
import type { Config } from '../types/config';

// Schema version for future compatibility
export const SCHEMA_VERSION = '1.0.0';

// JSON Schema definition for track export/import
export interface TrackExportSchema {
  version: string;
  track: {
    id: string;
    name: string;
    gates: Gate[];
    fieldSize: { width: number; height: number };
    gateSize: 0.75 | 1 | 1.5;
    createdAt: string;
    updatedAt: string;
  };
  config: {
    gateQuantities: Record<GateType, number>;
    fieldSize: { width: number; height: number };
    gateSize: 0.75 | 1 | 1.5;
  };
}

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
}

// Valid gate types
const VALID_GATE_TYPES: GateType[] = ['standard', 'h-gate', 'huerdel', 'doppelgate', 'ladder', 'start-finish', 'flag'];

// Valid gate sizes
const VALID_GATE_SIZES = [0.75, 1, 1.5] as const;

// Validate a single gate
function validateGate(gate: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const g = gate as Record<string, unknown>;

  if (!g.id || typeof g.id !== 'string') {
    errors.push({ field: `gates[${index}].id`, message: 'Gate id must be a string' });
  }

  if (!g.type || !VALID_GATE_TYPES.includes(g.type as GateType)) {
    errors.push({ field: `gates[${index}].type`, message: `Gate type must be one of: ${VALID_GATE_TYPES.join(', ')}` });
  }

  if (!g.position || typeof g.position !== 'object') {
    errors.push({ field: `gates[${index}].position`, message: 'Gate position must be an object' });
  } else {
    const pos = g.position as Record<string, unknown>;
    if (typeof pos.x !== 'number') {
      errors.push({ field: `gates[${index}].position.x`, message: 'Position x must be a number' });
    }
    if (typeof pos.y !== 'number') {
      errors.push({ field: `gates[${index}].position.y`, message: 'Position y must be a number' });
    }
    if (typeof pos.z !== 'number') {
      errors.push({ field: `gates[${index}].position.z`, message: 'Position z must be a number' });
    }
  }

  if (typeof g.rotation !== 'number' || g.rotation < 0 || g.rotation > 330 || g.rotation % 30 !== 0) {
    errors.push({ field: `gates[${index}].rotation`, message: 'Rotation must be a number between 0-330 in 30deg steps' });
  }

  if (!VALID_GATE_SIZES.includes(g.size as typeof VALID_GATE_SIZES[number])) {
    errors.push({ field: `gates[${index}].size`, message: `Gate size must be one of: ${VALID_GATE_SIZES.join(', ')}` });
  }

  return errors;
}

// Validate field size
function validateFieldSize(fieldSize: unknown, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const fs = fieldSize as Record<string, unknown>;

  if (!fs || typeof fs !== 'object') {
    errors.push({ field: prefix, message: 'Field size must be an object' });
    return errors;
  }

  if (typeof fs.width !== 'number' || fs.width <= 0) {
    errors.push({ field: `${prefix}.width`, message: 'Width must be a positive number' });
  }

  if (typeof fs.height !== 'number' || fs.height <= 0) {
    errors.push({ field: `${prefix}.height`, message: 'Height must be a positive number' });
  }

  return errors;
}

// Validate gate quantities
function validateGateQuantities(quantities: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const q = quantities as Record<string, unknown>;

  if (!q || typeof q !== 'object') {
    errors.push({ field: 'config.gateQuantities', message: 'Gate quantities must be an object' });
    return errors;
  }

  for (const gateType of VALID_GATE_TYPES) {
    if (typeof q[gateType] !== 'number' || q[gateType] < 0 || !Number.isInteger(q[gateType])) {
      errors.push({ field: `config.gateQuantities.${gateType}`, message: `Gate quantity for ${gateType} must be a non-negative integer` });
    }
  }

  return errors;
}

// Main validation function
export function validateTrack(data: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
  }

  const d = data as Record<string, unknown>;

  // Validate version
  if (!d.version || typeof d.version !== 'string') {
    errors.push({ field: 'version', message: 'Version must be a string' });
  }

  // Validate track
  if (!d.track || typeof d.track !== 'object') {
    errors.push({ field: 'track', message: 'Track must be an object' });
  } else {
    const track = d.track as Record<string, unknown>;

    if (!track.id || typeof track.id !== 'string') {
      errors.push({ field: 'track.id', message: 'Track id must be a string' });
    }

    if (!track.name || typeof track.name !== 'string') {
      errors.push({ field: 'track.name', message: 'Track name must be a string' });
    }

    if (!Array.isArray(track.gates)) {
      errors.push({ field: 'track.gates', message: 'Track gates must be an array' });
    } else {
      track.gates.forEach((gate, index) => {
        errors.push(...validateGate(gate, index));
      });
    }

    errors.push(...validateFieldSize(track.fieldSize, 'track.fieldSize'));

    if (!VALID_GATE_SIZES.includes(track.gateSize as typeof VALID_GATE_SIZES[number])) {
      errors.push({ field: 'track.gateSize', message: `Track gate size must be one of: ${VALID_GATE_SIZES.join(', ')}` });
    }

    if (!track.createdAt || typeof track.createdAt !== 'string') {
      errors.push({ field: 'track.createdAt', message: 'CreatedAt must be an ISO date string' });
    }

    if (!track.updatedAt || typeof track.updatedAt !== 'string') {
      errors.push({ field: 'track.updatedAt', message: 'UpdatedAt must be an ISO date string' });
    }
  }

  // Validate config
  if (!d.config || typeof d.config !== 'object') {
    errors.push({ field: 'config', message: 'Config must be an object' });
  } else {
    const config = d.config as Record<string, unknown>;

    errors.push(...validateGateQuantities(config.gateQuantities));
    errors.push(...validateFieldSize(config.fieldSize, 'config.fieldSize'));

    if (!VALID_GATE_SIZES.includes(config.gateSize as typeof VALID_GATE_SIZES[number])) {
      errors.push({ field: 'config.gateSize', message: `Config gate size must be one of: ${VALID_GATE_SIZES.join(', ')}` });
    }
  }

  return { valid: errors.length === 0, errors };
}

// Serialize track and config to JSON string
export function serializeTrack(track: Track, config: Config): string {
  const exportData: TrackExportSchema = {
    version: SCHEMA_VERSION,
    track: {
      id: track.id,
      name: track.name,
      gates: track.gates,
      fieldSize: track.fieldSize,
      gateSize: track.gateSize,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    },
    config: {
      gateQuantities: config.gateQuantities,
      fieldSize: config.fieldSize,
      gateSize: config.gateSize,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

// Deserialize and validate JSON string to track and config
export function deserializeTrack(jsonString: string): { track: Track; config: Config } | { error: string; errors: ValidationError[] } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return { error: 'Invalid JSON', errors: [{ field: 'root', message: 'Failed to parse JSON' }] };
  }

  const validation = validateTrack(parsed);

  if (!validation.valid) {
    return { error: 'Validation failed', errors: validation.errors };
  }

  const data = parsed as TrackExportSchema;

  return {
    track: {
      id: data.track.id,
      name: data.track.name,
      gates: data.track.gates,
      fieldSize: data.track.fieldSize,
      gateSize: data.track.gateSize,
      createdAt: data.track.createdAt,
      updatedAt: data.track.updatedAt,
    },
    config: {
      gateQuantities: data.config.gateQuantities,
      fieldSize: data.config.fieldSize,
      gateSize: data.config.gateSize,
    },
  };
}

// Quick validation check - returns boolean only
export function isValidTrack(data: unknown): boolean {
  return validateTrack(data).valid;
}