import { describe, expect, it } from 'vitest'
import type { Gate, GateSequenceItem, IdealLineLegRef, Point3 } from '../types'
import { resolveIdealLineGateInsertion } from './gateInsertion'
import type { IdealLineGateInsertionQuery } from './gateInsertion'

const gate = (id: string, x: number, z: number, rotation = 0): Gate => ({
  id,
  type: 'standard',
  position: { x, y: 0, z },
  rotation,
  openings: [{ id: 'main', position: { x: 0, y: 0.6, z: 0 }, width: 1.2, height: 1.2, rotation: 0 }],
})

const gates = [gate('a', 0, 0), gate('b', 10, 0), gate('c', 10, 10)]
const gateSequence: GateSequenceItem[] = [
  { gateId: 'a', openingId: 'main' },
  { gateId: 'b', openingId: 'main' },
  { gateId: 'c', openingId: 'main' },
]

const legAB: IdealLineLegRef = {
  from: { gateId: 'a', openingId: 'main' },
  to: { gateId: 'b', openingId: 'main' },
}
const legLoop: IdealLineLegRef = {
  from: { gateId: 'b', openingId: 'main' },
  to: { gateId: 'b', openingId: 'main' },
}
const legCA: IdealLineLegRef = {
  from: { gateId: 'c', openingId: 'main' },
  to: { gateId: 'a', openingId: 'main' },
}

const lineToZ = (from: number, to: number, count = 9): { samples: Point3[]; us: number[] } => {
  const samples: Point3[] = []
  const us: number[] = []
  for (let index = 0; index < count; index++) {
    const u = index / (count - 1)
    us.push(u)
    samples.push({ x: from + (to - from) * u, y: 1, z: 5 })
  }
  return { samples, us }
}

const query = (overrides: Partial<IdealLineGateInsertionQuery> = {}): IdealLineGateInsertionQuery => {
  const { samples, us } = lineToZ(0, 10)
  return {
    hover: { leg: legAB, u: 0.5, position: { x: 5, y: 1, z: 5 } },
    legRefs: [legAB],
    sampledLegs: [samples],
    sampledLegUs: [us],
    gates,
    gateSequence,
    ...overrides,
  }
}

describe('resolveIdealLineGateInsertion', () => {
  it('inserts the gate before the leg target visit, right after the source gate', () => {
    // Given a hover in the middle of the a->b leg
    // When the insertion is resolved
    const insertion = resolveIdealLineGateInsertion(query())

    // Then it lands on the line, in the gate list after a and in sequence before b
    expect(insertion).not.toBeNull()
    expect(insertion?.gateIndex).toBe(1)
    expect(insertion?.sequenceIndex).toBe(1)
    expect(insertion?.position).toEqual({ x: 5, y: 0, z: 5 })
  })

  it('orients the gate along the curve tangent', () => {
    // Given a line heading towards +X
    const { samples, us } = lineToZ(0, 10)

    // When the insertion is resolved
    const insertion = resolveIdealLineGateInsertion(query({ sampledLegs: [samples], sampledLegUs: [us], legRefs: [legAB] }))

    // Then the gate rotation follows atan2(dx, dz) = 90 degrees
    expect(insertion?.rotation).toBeCloseTo(90)
  })

  it('keeps the from-gate rotation when the leg has no usable tangent', () => {
    // Given a leg with coincident samples and a rotated source gate
    const rotatedGates = [gate('a', 0, 0, 45), gate('b', 10, 0)]
    const samples = [{ x: 5, y: 1, z: 5 }, { x: 5, y: 1, z: 5 }]

    // When the insertion is resolved
    const insertion = resolveIdealLineGateInsertion(query({ gates: rotatedGates, sampledLegs: [samples], sampledLegUs: [[0, 1]] }))

    // Then the source gate rotation is the fallback
    expect(insertion?.rotation).toBe(45)
  })

  it('inserts after the last visit of a same-gate loop leg', () => {
    // Given a return leg into a gate that the sequence visits twice
    const { samples, us } = lineToZ(10, 0)
    const repeatedSequence: GateSequenceItem[] = [
      { gateId: 'a', openingId: 'main' },
      { gateId: 'b', openingId: 'main' },
      { gateId: 'c', openingId: 'main' },
      { gateId: 'b', openingId: 'main' },
    ]

    // When the insertion is resolved
    const insertion = resolveIdealLineGateInsertion(query({
      hover: { leg: legLoop, u: 0.5, position: { x: 5, y: 1, z: 5 } },
      legRefs: [legLoop],
      sampledLegs: [samples],
      sampledLegUs: [us],
      gateSequence: repeatedSequence,
    }))

    // Then the new gate lands before b's last visit, not its first one
    expect(insertion?.sequenceIndex).toBe(3)
    expect(insertion?.gateIndex).toBe(2)
  })

  it('returns null for a leg that is not part of the visible path', () => {
    // Given a hover whose leg is unknown
    const insertion = resolveIdealLineGateInsertion(query({ legRefs: [] }))

    // Then nothing is offered for insertion
    expect(insertion).toBeNull()
  })

  it('appends the gate when the target visit is missing from the sequence', () => {
    // Given a sequence without b
    const insertion = resolveIdealLineGateInsertion(query({
      gateSequence: [{ gateId: 'a', openingId: 'main' }],
    }))

    // Then the new gate goes to the end of the sequence
    expect(insertion?.sequenceIndex).toBe(1)
  })

  it('keeps inserting right after the source gate when that gate is visited again later', () => {
    // Given a lap that flies a -> b first and returns to a further down the sequence
    const revisitSequence: GateSequenceItem[] = [
      { gateId: 'a', openingId: 'main' },
      { gateId: 'b', openingId: 'main' },
      { gateId: 'a', openingId: 'main' },
      { gateId: 'c', openingId: 'main' },
    ]

    // When the a -> b leg is resolved
    const insertion = resolveIdealLineGateInsertion(query({ gateSequence: revisitSequence }))

    // Then the gate stays between a's first visit and b, not at the end of the lap
    expect(insertion?.sequenceIndex).toBe(1)
  })

  it('appends the gate when the leg closes the lap back into the start gate', () => {
    // Given a hover on the closing leg from the last gate back into the first one
    const { samples, us } = lineToZ(10, 0)

    // When the insertion is resolved
    const insertion = resolveIdealLineGateInsertion(query({
      hover: { leg: legCA, u: 0.5, position: { x: 5, y: 1, z: 5 } },
      legRefs: [legCA],
      sampledLegs: [samples],
      sampledLegUs: [us],
    }))

    // Then the new gate is the final pass of the lap, so the start gate keeps number 1
    expect(insertion?.sequenceIndex).toBe(3)
    expect(insertion?.gateIndex).toBe(3)
  })

  it('appends the closing-leg gate after every visit of a repeated gate', () => {
    // Given a lap that visits b twice and then closes back into a
    const repeatedSequence: GateSequenceItem[] = [
      ...gateSequence,
      { gateId: 'b', openingId: 'main' },
    ]
    const { samples, us } = lineToZ(10, 0)

    // When the closing leg is resolved
    const insertion = resolveIdealLineGateInsertion(query({
      hover: { leg: legCA, u: 0.5, position: { x: 5, y: 1, z: 5 } },
      legRefs: [legCA],
      sampledLegs: [samples],
      sampledLegUs: [us],
      gateSequence: repeatedSequence,
    }))

    // Then the new gate lands after the last stored visit
    expect(insertion?.sequenceIndex).toBe(4)
  })
})
