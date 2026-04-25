import { describe, it, expect } from 'vitest'
import { moveGate, rotateGate } from './gateOperations'
import type { Gate } from '../types'
import { createDefaultGateOpenings } from './gateOpenings'

const createTestGate = (overrides: Partial<Gate> = {}): Gate => ({
  id: 'test-gate',
  type: 'standard',
  position: { x: 0, y: 2, z: 0 },
  rotation: 0,
  openings: createDefaultGateOpenings('standard'),
  ...overrides,
})

describe('rotateGate', () => {
  it('rotates gate 30deg clockwise', () => {
    const gate = createTestGate({ rotation: 0 })
    const result = rotateGate(gate, true)
    expect(result.rotation).toBe(30)
  })

  it('rotates gate 30deg counter-clockwise', () => {
    const gate = createTestGate({ rotation: 0 })
    const result = rotateGate(gate, false)
    expect(result.rotation).toBe(330)
  })

  it('rotates gate 4 times clockwise → rotation = 120deg', () => {
    let gate = createTestGate({ rotation: 0 })
    for (let i = 0; i < 4; i++) {
      gate = rotateGate(gate, true)
    }
    expect(gate.rotation).toBe(120)
  })

  it('wraps rotation correctly at 360 boundary', () => {
    const gate = createTestGate({ rotation: 350 })
    const result = rotateGate(gate, true)
    expect(result.rotation).toBe(20)
  })

  it('wraps rotation correctly at 0 boundary (counter-clockwise)', () => {
    const gate = createTestGate({ rotation: 10 })
    const result = rotateGate(gate, false)
    expect(result.rotation).toBe(340)
  })

  it('returns a new gate object without mutating original', () => {
    const gate = createTestGate({ rotation: 0 })
    const result = rotateGate(gate, true)
    expect(result).not.toBe(gate)
    expect(gate.rotation).toBe(0)
  })
})

describe('moveGate', () => {
  const fieldSize = { width: 20, height: 15 }

  it('moves gate N by 1 → z decreases by 1', () => {
    const gate = createTestGate({ position: { x: 0, y: 2, z: 0 } })
    const result = moveGate(gate, 'N', 1, fieldSize)
    expect(result.position.y).toBe(2)
    expect(result.position.x).toBe(0)
    expect(result.position.z).toBe(-1)
  })

  it('moves gate S by 1 → z increases by 1', () => {
    const gate = createTestGate({ position: { x: 0, y: 2, z: 0 } })
    const result = moveGate(gate, 'S', 1, fieldSize)
    expect(result.position.z).toBe(1)
  })

  it('moves gate E by 1 → x increases by 1', () => {
    const gate = createTestGate({ position: { x: 0, y: 2, z: 0 } })
    const result = moveGate(gate, 'E', 1, fieldSize)
    expect(result.position.x).toBe(1)
  })

  it('moves gate W by 1 → x decreases by 1', () => {
    const gate = createTestGate({ position: { x: 0, y: 2, z: 0 } })
    const result = moveGate(gate, 'W', 1, fieldSize)
    expect(result.position.x).toBe(-1)
  })

  it('moves gate by custom distance', () => {
    const gate = createTestGate({ position: { x: 0, y: 2, z: 0 } })
    const result = moveGate(gate, 'N', 3, fieldSize)
    expect(result.position.z).toBe(-3)
  })

  it('keeps y at the playing-field floor', () => {
    const gate = createTestGate({ position: { x: 0, y: -1, z: 0 } })
    const result = moveGate(gate, 'E', 1, fieldSize)
    expect(result.position.y).toBe(0)
  })

  it('allows gates to stay above the playing field', () => {
    const gate = createTestGate({ position: { x: 0, y: 10, z: 0 } })
    const result = moveGate(gate, 'N', 1, fieldSize)
    expect(result.position.y).toBe(10)
  })

  it('clamps x to field width boundary when moving E beyond bounds', () => {
    const gate = createTestGate({ position: { x: 10, y: 2, z: 0 } })
    const result = moveGate(gate, 'E', 1, fieldSize)
    expect(result.position.x).toBe(10) // halfW = 20/2 = 10
  })

  it('clamps x to negative field width boundary when moving W beyond bounds', () => {
    const gate = createTestGate({ position: { x: -10, y: 2, z: 0 } })
    const result = moveGate(gate, 'W', 1, fieldSize)
    expect(result.position.x).toBe(-10)
  })

  it('clamps z to field height boundary when moving N/S', () => {
    const gate = createTestGate({ position: { x: 0, y: 2, z: 7.5 } })
    const result = moveGate(gate, 'S', 1, fieldSize)
    expect(result.position.z).toBe(7.5)
  })

  it('returns a new gate object without mutating original', () => {
    const gate = createTestGate({ position: { x: 0, y: 2, z: 0 } })
    const result = moveGate(gate, 'N', 1, fieldSize)
    expect(result).not.toBe(gate)
    expect(gate.position.y).toBe(2)
    expect(gate.position.z).toBe(0)
  })
})
