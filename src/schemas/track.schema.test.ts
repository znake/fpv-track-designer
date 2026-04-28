import { describe, expect, it } from 'vitest'

import { deserializeTrack, serializeTrack } from './track.schema'
import type { Config, Track } from '../types'
import { createDefaultGateOpenings } from '../utils/gateOpenings'

const config: Config = {
  gateQuantities: {
    standard: 1,
    'h-gate': 0,
    'double-h': 0,
    dive: 0,
    double: 0,
    ladder: 0,
    'start-finish': 0,
    flag: 0,
    'octagonal-tunnel': 0,
  },
  fieldSize: { width: 30, height: 15 },
  snapGatesToGrid: false,
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
})
