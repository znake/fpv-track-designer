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
})
