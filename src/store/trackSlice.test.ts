import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { createTrackSlice, type TrackSlice } from './trackSlice'
import type { Track, Gate } from '../types'
import { createDefaultGateOpenings } from '../utils/gateOpenings'

const createTestTrack = (gates: Gate[] = []): Track => ({
  id: 'test-track',
  name: 'Test Track',
  gates,
  gateSequence: gates.map((gate) => ({ gateId: gate.id, openingId: gate.openings[0]?.id ?? 'main', reverse: false })),
  fieldSize: { width: 100, height: 100 },
  gateSize: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const createTestGate = (id: string, overrides: Partial<Gate> = {}): Gate => ({
  id,
  type: 'standard',
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  size: 1,
  openings: createDefaultGateOpenings('standard', 1),
  ...overrides,
})

const createTestStore = () => {
  return create<TrackSlice>()((set, get, store) => ({
    ...createTrackSlice(set, get, store),
  }))
}

describe('TrackSlice - Undo/Redo', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
  })

  it('should set track and clear selection', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)

    expect(store.getState().currentTrack).toEqual(track)
    expect(store.getState().selectedGateId).toBeNull()
    expect(store.getState().selectedGateIds).toEqual([])
  })

  it('should move gate and record history', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().moveGate('gate-1', 'N', 1)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(1)
    expect(store.getState().past.length).toBe(1)
  })

  it('should undo last gate move', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().undo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(0)
    expect(store.getState().future.length).toBe(1)
  })

  it('should redo undone gate move', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().undo()
    store.getState().redo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(1)
  })

  it('should rotate gate clockwise', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().rotateGate('gate-1', true)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.rotation).toBe(30)
  })

  it('should rotate gate counter-clockwise', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { rotation: 30 }),
    ])
    store.getState().setTrack(track)

    store.getState().rotateGate('gate-1', false)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.rotation).toBe(0)
  })

  it('should update gate properties', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().updateGate('gate-1', { type: 'h-gate', size: 1.5 })

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.type).toBe('h-gate')
    expect(gate?.size).toBe(1.5)
    expect(gate?.openings[0]?.id).toBe('lower')
  })

  it('should toggle gate direction and update matching sequence entries', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2'),
    ])
    track.gateSequence = [
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ]

    store.getState().setTrack(track)
    store.getState().toggleGateDirection('gate-1', 'main')

    const gate = store.getState().currentTrack?.gates.find((candidate) => candidate.id === 'gate-1')
    expect(gate?.openings[0]?.reverse).toBe(true)
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: true },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
      { gateId: 'gate-1', openingId: 'main', reverse: true },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
    expect(store.getState().past.length).toBe(1)
  })

  it('should undo and redo gate opening direction toggles', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2'),
    ])

    store.getState().setTrack(track)
    store.getState().selectGate('gate-1')
    store.getState().toggleGateDirection('gate-1', 'main')
    store.getState().undo()

    expect(store.getState().currentTrack?.gates[0].openings[0]?.reverse).toBeFalsy()
    expect(store.getState().currentTrack?.gateSequence[0]?.reverse).toBe(false)
    expect(store.getState().selectedGateId).toBe('gate-1')

    store.getState().redo()

    expect(store.getState().currentTrack?.gates[0].openings[0]?.reverse).toBe(true)
    expect(store.getState().currentTrack?.gateSequence[0]?.reverse).toBe(true)
    expect(store.getState().selectedGateId).toBe('gate-1')
  })

  it('should not modify state when toggling unknown gate opening', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)
    store.getState().toggleGateDirection('gate-1', 'missing')

    expect(store.getState().past).toEqual([])
    expect(store.getState().currentTrack?.gates[0].openings[0]?.reverse).toBeFalsy()
    expect(store.getState().currentTrack?.gateSequence[0]?.reverse).toBe(false)
  })

  it('should toggle visible opening direction even when the opening is not in the sequence', () => {
    const gate = createTestGate('gate-1', {
      type: 'double',
      openings: createDefaultGateOpenings('double', 1),
    })
    const track = createTestTrack([gate])
    track.gateSequence = [
      { gateId: 'gate-1', openingId: 'lower', reverse: false },
    ]

    store.getState().setTrack(track)
    store.getState().toggleGateDirection('gate-1', 'upper')

    const upperOpening = store.getState().currentTrack?.gates[0].openings.find((opening) => opening.id === 'upper')
    expect(upperOpening?.reverse).toBe(true)
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'lower', reverse: false },
    ])
    expect(store.getState().past.length).toBe(1)
  })

  it('should select gate', () => {
    store.getState().selectGate('gate-1')
    expect(store.getState().selectedGateId).toBe('gate-1')
    expect(store.getState().selectedGateIds).toEqual(['gate-1'])

    store.getState().selectGate('gate-2', true)
    expect(store.getState().selectedGateIds).toEqual(['gate-1', 'gate-2'])

    store.getState().selectGate(null)
    expect(store.getState().selectedGateId).toBeNull()
    expect(store.getState().selectedGateIds).toEqual([])
  })

  it('should move all selected gates', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1', 'gate-2'])

    store.getState().moveSelectedGates('N', 1)

    const movedTrack = store.getState().currentTrack
    const gate1 = movedTrack?.gates.find((g) => g.id === 'gate-1')
    const gate2 = movedTrack?.gates.find((g) => g.id === 'gate-2')

    expect(gate1?.position.y).toBe(1)
    expect(gate2?.position.y).toBe(1)
  })

  it('should delete all selected gates', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1', 'gate-2'])

    store.getState().deleteSelectedGates()

    expect(store.getState().currentTrack?.gates).toEqual([])
    expect(store.getState().currentTrack?.gateSequence).toEqual([])
    expect(store.getState().selectedGateIds).toEqual([])
  })

  it('should insert a gate at the provided gate and sequence indexes', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])
    track.updatedAt = '2026-04-23T00:00:00.000Z'
    track.gateSequence = [
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
      { gateId: 'gate-1', openingId: 'main', reverse: false },
    ]

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      { id: 'gate-3', type: 'h-gate', position: { x: 5, y: 0, z: 0 }, rotation: 30, size: 1, openings: createDefaultGateOpenings('h-gate', 1) },
      1,
      2,
    )

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-2'])
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
      { gateId: 'gate-3', openingId: 'lower', reverse: false },
      { gateId: 'gate-3', openingId: 'backrest-pass', reverse: false },
    ])
    expect(store.getState().selectedGateId).toBe('gate-3')
    expect(store.getState().selectedGateIds).toEqual(['gate-3'])
    expect(store.getState().currentTrack?.updatedAt).not.toBe('2026-04-23T00:00:00.000Z')
    expect(store.getState().past.length).toBe(1)
  })

  it('should insert double gates as lower then upper sequence visits', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      {
        id: 'gate-3',
        type: 'double',
        position: { x: 5, y: 0, z: 0 },
        rotation: 0,
        size: 1,
        openings: createDefaultGateOpenings('double', 1),
      },
      1,
      1,
    )

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-3', openingId: 'lower', reverse: false },
      { gateId: 'gate-3', openingId: 'upper', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
  })

  it('should undo and redo inserted gates with selection history', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])
    const insertedGate = {
      id: 'gate-3',
      type: 'h-gate' as const,
      position: { x: 5, y: 0, z: 0 },
      rotation: 30,
      size: 1 as const,
      openings: createDefaultGateOpenings('h-gate', 1),
    }

    store.getState().setTrack(track)
    store.getState().selectGate('gate-2')

    store.getState().insertGateAtIndex(insertedGate, 1, 1)

    expect(store.getState().selectedGateId).toBe('gate-3')
    expect(store.getState().selectedGateIds).toEqual(['gate-3'])

    store.getState().undo()

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-2'])
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
    expect(store.getState().selectedGateId).toBe('gate-2')
    expect(store.getState().selectedGateIds).toEqual(['gate-2'])

    store.getState().redo()

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-2'])
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-3', openingId: 'lower', reverse: false },
      { gateId: 'gate-3', openingId: 'backrest-pass', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
    expect(store.getState().selectedGateId).toBe('gate-3')
    expect(store.getState().selectedGateIds).toEqual(['gate-3'])
  })

  it('should limit history to 50 changes', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    for (let i = 0; i < 60; i++) {
      store.getState().moveGate('gate-1', 'N', 1)
    }

    expect(store.getState().past.length).toBe(50)
  })

  it('should not undo when no history', () => {
    const track = createTestTrack([])
    store.getState().setTrack(track)

    store.getState().undo()

    expect(store.getState().currentTrack).toEqual(track)
  })

  it('should not redo when no future', () => {
    const track = createTestTrack([])
    store.getState().setTrack(track)

    store.getState().redo()

    expect(store.getState().currentTrack).toEqual(track)
  })
})
