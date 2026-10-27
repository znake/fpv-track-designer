import { describe, expect, it } from 'vitest'

import { deserializeTrack, serializeTrack, validateTrack } from './track.schema'
import type { Config, Track } from '../types'
import { createDefaultGateOpenings } from '../utils/gateOpenings'

const config: Config = {
  gateQuantities: {
    standard: 1,
    'h-gate': 0,
    'double-h': 0,
    hurdle: 0,
    dive: 0,
    double: 0,
    ladder: 0,
    'start-finish': 0,
    flag: 0,
    'flag-small': 0,
    'octagonal-tunnel': 0,
  },
  fieldSize: { width: 30, height: 15 },
  venueId: null,
  snapGatesToGrid: false,
  snapGridSize: 0.3,
  showFlightPath: true,
  showOpeningLabels: true,
  showGrid: false,
  theme: 'minimal',
}

const track: Track = {
  id: 'track-id',
  name: 'Continuous Rotation Track',
  gates: [
    {
      id: 'gate-1',
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 91.5999755859375,
      openings: createDefaultGateOpenings('standard', 'gate-1'),
    },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-04-25T15:41:20.141Z',
  updatedAt: '2026-04-25T15:55:07.407Z',
}

describe('track schema', () => {
  it('imports tracks with continuous drag rotations exported by the app', () => {
    const result = deserializeTrack(serializeTrack(track, config))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.track.gates[0].rotation).toBe(91.5999755859375)
  })

  it('imports small flag gates and fills missing flag-small quantities with 0', () => {
    const smallFlagPayload = JSON.stringify({
      version: '1.2.0',
      track: {
        ...track,
        gates: [
          {
            id: 'gate-small-1',
            type: 'flag-small',
            position: { x: 2, y: 0, z: 1 },
            rotation: 90,
            openings: createDefaultGateOpenings('flag-small', 'gate-small-1'),
          },
        ],
        gateSequence: [{ gateId: 'gate-small-1', openingId: 'main', reverse: false }],
      },
      config: {
        gateQuantities: { standard: 1 },
        fieldSize: { width: 30, height: 15 },
      },
    })

    const result = deserializeTrack(smallFlagPayload)

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.track.gates[0].type).toBe('flag-small')
    expect(result.track.gates[0].openings[0]).toMatchObject({
      id: 'main',
      width: 0.6,
      height: 1.2,
    })
    expect(result.config.gateQuantities['flag-small']).toBe(0)
  })

  it('fills missing optional config display flags with defaults when importing legacy payloads', () => {
    const legacyJson = JSON.stringify({
      version: '1.0.0',
      track: {
        ...track,
        gateSize: 1.5,
        gates: track.gates.map((trackGate) => ({ ...trackGate, size: 1.5 })),
      },
      config: {
        gateQuantities: {
          ...config.gateQuantities,
        },
        fieldSize: config.fieldSize,
      },
    })

    const result = deserializeTrack(legacyJson)

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.snapGatesToGrid).toBe(false)
    expect(result.config.snapGridSize).toBe(0.3)
    expect(result.config.showGrid).toBe(false)
    expect(result.config.showFlightPath).toBe(true)
    expect(result.config.showOpeningLabels).toBe(true)
  })

  it('rejects rotations outside the normalized degree range', () => {
    const invalidTrack = {
      ...track,
      gates: [{ ...track.gates[0], rotation: 360 }],
    }

    const result = deserializeTrack(serializeTrack(invalidTrack, config))

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'track.gates[0].rotation',
      message: 'Rotation must be a finite number between 0 and less than 360 degrees',
    })
  })

  it('loads legacy saved tracks with gateSize and gate size fields and drops them', () => {
    const legacyJson = JSON.stringify({
      version: '1.1.0',
      track: {
        ...track,
        gateSize: 1.5,
        gates: track.gates.map((gate) => ({ ...gate, size: 1.5 })),
      },
      config: {
        ...config,
        gateSize: 1.5,
      },
    })

    const result = deserializeTrack(legacyJson)

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect('gateSize' in result.track).toBe(false)
    expect('gateSize' in result.config).toBe(false)
    expect('size' in result.track.gates[0]).toBe(false)
  })

  it('loads legacy exports created before octagonal tunnel gate quantities existed', () => {
    const legacyGateQuantities: Partial<Config['gateQuantities']> = { ...config.gateQuantities }
    delete legacyGateQuantities['octagonal-tunnel']
    const legacyJson = JSON.stringify({
      version: '1.1.0',
      track: {
        ...track,
        gateSize: 1,
        gates: track.gates.map((gate) => ({ ...gate, size: 1 })),
      },
      config: {
        ...config,
        gateQuantities: legacyGateQuantities,
        gateSize: 1,
      },
    })

    const result = deserializeTrack(legacyJson)

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.gateQuantities['octagonal-tunnel']).toBe(0)
    expect(result.config.gateQuantities.standard).toBe(1)
  })

  it('round-trips hurdle gates through serialization and deserialization', () => {
    const hurdleTrack: Track = {
      ...track,
      gates: [
        {
          id: 'hurdle-1',
          type: 'hurdle',
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          openings: createDefaultGateOpenings('hurdle', 'hurdle-1'),
        },
      ],
      gateSequence: [{ gateId: 'hurdle-1', openingId: 'main', reverse: false }],
    }
    const hurdleConfig: Config = {
      ...config,
      gateQuantities: {
        ...config.gateQuantities,
        standard: 0,
        hurdle: 1,
      },
    }

    const result = deserializeTrack(serializeTrack(hurdleTrack, hurdleConfig))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.track.gates[0].type).toBe('hurdle')
    expect(result.track.gates[0].openings[0]).toMatchObject({
      id: 'main',
      position: { x: 0, y: 1.74, z: 0 },
    })
    expect(result.config.gateQuantities.hurdle).toBe(1)
  })

  it('still rejects invalid legacy gate quantity values when the key is present', () => {
    const legacyJson = JSON.stringify({
      version: '1.1.0',
      track,
      config: {
        ...config,
        gateQuantities: {
          ...config.gateQuantities,
          'octagonal-tunnel': -1,
        },
      },
    })

    const result = deserializeTrack(legacyJson)

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'config.gateQuantities.octagonal-tunnel',
      message: 'Gate quantity for octagonal-tunnel must be a non-negative integer',
    })
  })

  it('rejects unsupported theme ids in track payload', () => {
    const unsupportedThemePayload = JSON.stringify({
      version: '1.2.0',
      track,
      config: {
        ...config,
        theme: 'unsupported-theme',
      },
    })

    const result = deserializeTrack(unsupportedThemePayload)

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'config.theme',
      message: 'Theme must be one of: minimal, realistic, night',
    })
  })

  it('round-trips configured snap grid size', () => {
    const result = deserializeTrack(serializeTrack(track, { ...config, snapGatesToGrid: true, snapGridSize: 1 }))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.snapGatesToGrid).toBe(true)
    expect(result.config.snapGridSize).toBe(1)
  })

  it('rejects unsupported snap grid sizes', () => {
    const invalidPayload = JSON.stringify({
      version: '1.2.0',
      track,
      config: {
        ...config,
        snapGridSize: 0.25,
      },
    })

    const result = deserializeTrack(invalidPayload)

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'config.snapGridSize',
      message: 'Snap grid size must be one of: 0.3, 0.5, 1',
    })
  })

  it('round-trips the venue id together with the preset field size', () => {
    const venueConfig: Config = {
      ...config,
      venueId: 'last-og3',
      fieldSize: { width: 10.5, height: 22.7 },
    }

    const result = deserializeTrack(serializeTrack(track, venueConfig))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.venueId).toBe('last-og3')
    expect(result.config.fieldSize).toEqual({ width: 10.5, height: 22.7 })
  })

  it('round-trips a null venue id', () => {
    const result = deserializeTrack(serializeTrack(track, { ...config, venueId: null }))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.venueId).toBeNull()
  })

  it('loads legacy 1.2.0 payloads without a venue id as null', () => {
    const legacyPayload = {
      version: '1.2.0',
      track,
      config: {
        gateQuantities: config.gateQuantities,
        fieldSize: config.fieldSize,
      },
    }

    expect(validateTrack(legacyPayload).valid).toBe(true)

    const result = deserializeTrack(JSON.stringify(legacyPayload))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.venueId).toBeNull()
  })

  const idealLinePoints: NonNullable<Track['idealLinePoints']> = [
    {
      id: 'point-a',
      leg: {
        from: { gateId: 'gate-1', openingId: 'main' },
        to: { gateId: 'gate-2', openingId: 'main' },
      },
      u: 0.25,
      position: { x: 1, y: 2, z: 3 },
    },
    {
      id: 'point-b',
      leg: {
        from: { gateId: 'gate-2', openingId: 'main' },
        to: { gateId: 'gate-1', openingId: 'main' },
      },
      u: 0.75,
      position: { x: -2, y: 0.5, z: 4 },
    },
  ]

  it('round-trips ideal-line points and discards extra properties', () => {
    // Given a track with two authored points
    const pointTrack: Track = { ...track, idealLinePoints }
    // When serializing, adding unknown properties and deserializing
    const payload = JSON.parse(serializeTrack(pointTrack, config)) as {
      version: string
      track: { idealLinePoints: unknown[] }
    }
    expect(payload.version).toBe('1.5.0')
    payload.track.idealLinePoints[0] = { ...idealLinePoints[0], ignored: 'x' }
    const result = deserializeTrack(JSON.stringify(payload))
    // Then only the exact contract survives
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.track.idealLinePoints).toEqual(idealLinePoints)
  })

  it('omits absent and empty ideal-line point arrays from serialized payloads', () => {
    // Given tracks without points and with an empty array
    const absent = JSON.parse(serializeTrack(track, config)) as { track: Record<string, unknown> }
    const empty = JSON.parse(serializeTrack({ ...track, idealLinePoints: [] }, config)) as { track: Record<string, unknown> }
    // When checking exported keys
    // Then neither payload materializes the optional field
    expect('idealLinePoints' in absent.track).toBe(false)
    expect('idealLinePoints' in empty.track).toBe(false)
  })

  const invalidPointCases: Array<{ name: string; points: unknown; expectedField: string }> = [
    { name: 'non-array', points: { id: 'p' }, expectedField: 'track.idealLinePoints' },
    { name: 'null entry', points: [null], expectedField: 'track.idealLinePoints[0]' },
    { name: 'empty id', points: [{ ...idealLinePoints[0], id: '' }], expectedField: 'track.idealLinePoints[0].id' },
    { name: 'duplicate id', points: [idealLinePoints[0], idealLinePoints[0]], expectedField: 'track.idealLinePoints[1].id' },
    { name: 'zero u', points: [{ ...idealLinePoints[0], u: 0 }], expectedField: 'track.idealLinePoints[0].u' },
    { name: 'unit u', points: [{ ...idealLinePoints[0], u: 1 }], expectedField: 'track.idealLinePoints[0].u' },
    { name: 'non-finite u', points: [{ ...idealLinePoints[0], u: Number.NaN }], expectedField: 'track.idealLinePoints[0].u' },
    { name: 'missing gate id', points: [{ ...idealLinePoints[0], leg: { ...idealLinePoints[0].leg, from: { openingId: 'main' } } }], expectedField: 'track.idealLinePoints[0].leg.from.gateId' },
    { name: 'invalid opening id', points: [{ ...idealLinePoints[0], leg: { ...idealLinePoints[0].leg, to: { gateId: 'g', openingId: 2 } } }], expectedField: 'track.idealLinePoints[0].leg.to.openingId' },
    { name: 'non-finite position', points: [{ ...idealLinePoints[0], position: { x: 1, y: 2, z: Number.POSITIVE_INFINITY } }], expectedField: 'track.idealLinePoints[0].position.z' },
  ]

  it.each(invalidPointCases)('rejects invalid ideal-line points: $name', ({ points, expectedField }) => {
    // Given malformed point data before JSON encoding
    const validation = validateTrack({ version: '1.5.0', track: { ...track, idealLinePoints: points }, config })
    // When validating
    // Then the exact indexed field is rejected
    expect(validation.valid).toBe(false)
    expect(validation.errors.map((error) => error.field)).toContain(expectedField)
  })

  it.each(['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0'])('loads a literal %s payload without inventing ideal-line points', (version) => {
    // Given a literal legacy payload without the field
    const legacyPayload = {
      version,
      track: {
        id: track.id, name: track.name, gates: track.gates, gateSequence: track.gateSequence,
        fieldSize: track.fieldSize, createdAt: track.createdAt, updatedAt: track.updatedAt,
      },
      config: { gateQuantities: config.gateQuantities, fieldSize: config.fieldSize },
    }
    // When deserializing
    const result = deserializeTrack(JSON.stringify(legacyPayload))
    // Then no points are invented
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect('idealLinePoints' in result.track).toBe(false)
  })

  it('drops the replaced height-offset field instead of migrating it', () => {
    // Given a payload containing the unversioned predecessor field
    const payload = JSON.parse(serializeTrack(track, config)) as {
      version: string
      track: Record<string, unknown>
    }
    payload.version = '1.4.0'
    payload.track.flightPathHeightOffsets = [{ station: 1, offsetY: 8 }]
    // When deserializing and serializing again
    const result = deserializeTrack(JSON.stringify(payload))
    // Then the old field is ignored and neither point system is invented
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect('flightPathHeightOffsets' in result.track).toBe(false)
    expect('idealLinePoints' in result.track).toBe(false)
    const exported = JSON.parse(serializeTrack(result.track, result.config)) as { track: Record<string, unknown> }
    expect('flightPathHeightOffsets' in exported.track).toBe(false)
  })

  it('rejects unknown venue ids in track payload', () => {
    const unsupportedVenuePayload = {
      version: '1.3.0',
      track,
      config: {
        ...config,
        venueId: 'nope',
      },
    }

    const validation = validateTrack(unsupportedVenuePayload)

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContainEqual({
      field: 'config.venueId',
      message: 'Venue must be one of: last-og3',
    })
  })
})
