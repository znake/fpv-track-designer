import { describe, it, expect } from 'vitest'
import { generateTrack } from './generator'
import type { Config } from '../types'

const createTestConfig = (overrides: Partial<Config> = {}): Config => ({
  gateQuantities: {
    'start-finish': 1,
    standard: 4,
    'h-gate': 2,
    huerdel: 1,
    doppelgate: 1,
    ladder: 1,
    flag: 0,
  },
  fieldSize: { width: 50, height: 50 },
  gateSize: 1,
  ...overrides,
})

describe('generateTrack', () => {
  it('generates a track with all configured gates', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    const totalGates = Object.values(config.gateQuantities).reduce((a, b) => a + b, 0)
    expect(track.gates).toHaveLength(totalGates)
  })

  it('places start-finish gate first', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    expect(track.gates[0].type).toBe('start-finish')
  })

  it('places start-finish gate at origin', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    expect(track.gates[0].position).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('enforces minimum 3m distance between all gates', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    for (let i = 0; i < track.gates.length; i++) {
      for (let j = i + 1; j < track.gates.length; j++) {
        const a = track.gates[i].position
        const b = track.gates[j].position
        const dist = Math.sqrt(
          (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2,
        )
        expect(dist).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('places all gates within field bounds', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    const halfW = config.fieldSize.width / 2
    const halfH = config.fieldSize.height / 2

    for (const gate of track.gates) {
      expect(gate.position.x).toBeGreaterThanOrEqual(-halfW)
      expect(gate.position.x).toBeLessThanOrEqual(halfW)
      expect(gate.position.z).toBeGreaterThanOrEqual(-halfH)
      expect(gate.position.z).toBeLessThanOrEqual(halfH)
      expect(gate.position.y).toBeGreaterThanOrEqual(0)
      expect(gate.position.y).toBeLessThanOrEqual(0)
    }
  })

  it('generates rotation in 30-degree steps', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    for (const gate of track.gates) {
      expect(gate.rotation % 30).toBe(0)
      expect(gate.rotation).toBeGreaterThanOrEqual(0)
      expect(gate.rotation).toBeLessThanOrEqual(330)
    }
  })

  it('assigns unique IDs to all gates and the track', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    const gateIds = track.gates.map((g) => g.id)
    const uniqueGateIds = new Set(gateIds)
    expect(uniqueGateIds.size).toBe(gateIds.length)

    // Track ID should be a valid UUID string
    expect(track.id).toBeTruthy()
    expect(typeof track.id).toBe('string')
  })

  it('sets gate size from config', () => {
    const config = createTestConfig({ gateSize: 1.5 })
    const track = generateTrack(config)

    for (const gate of track.gates) {
      expect(gate.size).toBe(1.5)
    }
  })

  it('sets field size from config on the track', () => {
    const config = createTestConfig({ fieldSize: { width: 30, height: 20 } })
    const track = generateTrack(config)

    expect(track.fieldSize).toEqual({ width: 30, height: 20 })
  })

  it('orders gates by proximity (nearest neighbor)', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    // Each consecutive pair should be reasonably close (nearest neighbor heuristic)
    // We just verify the ordering produces a valid path
    for (let i = 1; i < track.gates.length; i++) {
      const prev = track.gates[i - 1].position
      const curr = track.gates[i].position
      const dist = Math.sqrt(
        (prev.x - curr.x) ** 2 + (prev.y - curr.y) ** 2 + (prev.z - curr.z) ** 2,
      )
      // Distance should be finite and positive
      expect(dist).toBeGreaterThan(0)
      expect(isFinite(dist)).toBe(true)
    }
  })

  it('completes generation in under 2 seconds', () => {
    const config = createTestConfig()
    const start = performance.now()
    generateTrack(config)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(2000)
  })

  it('handles config with no start-finish gate', () => {
    const config: Config = {
      gateQuantities: {
        'start-finish': 0,
        standard: 3,
        'h-gate': 0,
        huerdel: 0,
        doppelgate: 0,
        ladder: 0,
        flag: 0,
      },
      fieldSize: { width: 50, height: 50 },
      gateSize: 1,
    }

    const track = generateTrack(config)
    expect(track.gates).toHaveLength(3)
    // No start-finish gate, first gate is whatever was placed first
    expect(track.gates.every((g) => g.type === 'standard')).toBe(true)
  })

  it('generates valid track metadata', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    expect(track.name).toMatch(/^Track \d{4}-\d{2}-\d{2}$/)
    expect(track.createdAt).toBeTruthy()
    expect(track.updatedAt).toBeTruthy()
    expect(track.createdAt).toBe(track.updatedAt)
  })

  it('aligns gate rotations to face the next gate in the flight path', () => {
    const config = createTestConfig()
    const track = generateTrack(config)

    const n = track.gates.length
    for (let i = 0; i < n; i++) {
      const curr = track.gates[i]
      const next = track.gates[(i + 1) % n]

      const dx = next.position.x - curr.position.x
      const dz = next.position.z - curr.position.z

      // atan2(dx, dz) gives angle from +Z axis (Three.js Y-rotation)
      const expectedAngle = Math.atan2(dx, dz) * (180 / Math.PI)
      const normalizedExpected = ((expectedAngle % 360) + 360) % 360

      // Rotation should be within 15° of the true direction (30° step rounding)
      const diff = Math.abs(curr.rotation - normalizedExpected)
      const minDiff = Math.min(diff, 360 - diff)
      expect(minDiff).toBeLessThanOrEqual(15)
    }
  })
})
