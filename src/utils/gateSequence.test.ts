import { describe, expect, it } from 'vitest'
import type { Gate } from '../types'
import { createDefaultGateOpenings } from './gateOpenings'
import { buildDefaultGateSequenceEntries, normalizeGateSequence } from './gateSequence'

function createGate(id: string, type: Gate['type']): Gate {
  return {
    id,
    type,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    size: 1,
    openings: createDefaultGateOpenings(type, 1),
  }
}

describe('gateSequence', () => {
  it('builds h-gate default sequence as lower then backrest pass', () => {
    const gate = createGate('h-gate-1', 'h-gate')

    expect(buildDefaultGateSequenceEntries(gate)).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'backrest-pass', reverse: false },
    ])
  })

  it('expands legacy string h-gate sequence entries to both h-gate passes', () => {
    const gate = createGate('legacy-h-gate', 'h-gate')

    expect(normalizeGateSequence([gate.id], [gate])).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'backrest-pass', reverse: false },
    ])
  })
})
