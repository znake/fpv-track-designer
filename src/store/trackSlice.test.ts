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

  it('should replace track without preserving undo history', () => {
    const originalTrack = createTestTrack([
      createTestGate('gate-1'),
    ])
    const loadedTrack = createTestTrack([
      createTestGate('gate-2', { position: { x: 5, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(originalTrack)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().past.length).toBe(1)

    store.getState().replaceTrack(loadedTrack)
    store.getState().undo()

    expect(store.getState().currentTrack?.gates[0]?.id).toBe('gate-2')
    expect(store.getState().past).toEqual([])
    expect(store.getState().future).toEqual([])
  })

  it('should sync current track without adding undo history', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)
    store.getState().syncCurrentTrack({ ...track, name: 'Saved Name' })

    expect(store.getState().currentTrack?.name).toBe('Saved Name')
    expect(store.getState().past).toEqual([])
    expect(store.getState().future).toEqual([])
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

  it('should move a gate sequence entry to a new number and shift the rest', () => {
    const firstDoubleGate = createTestGate('gate-1', {
      type: 'double',
      openings: createDefaultGateOpenings('double', 1),
    })
    const secondDoubleGate = createTestGate('gate-2', {
      type: 'double',
      openings: createDefaultGateOpenings('double', 1),
    })
    const track = createTestTrack([firstDoubleGate, secondDoubleGate])
    track.gateSequence = [
      { gateId: 'gate-1', openingId: 'lower', reverse: false },
      { gateId: 'gate-1', openingId: 'upper', reverse: false },
      { gateId: 'gate-2', openingId: 'lower', reverse: false },
      { gateId: 'gate-2', openingId: 'upper', reverse: false },
    ]

    store.getState().setTrack(track)
    store.getState().moveGateSequenceEntry('gate-2', 'lower', 3, 2)

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'lower', reverse: false },
      { gateId: 'gate-2', openingId: 'lower', reverse: false },
      { gateId: 'gate-1', openingId: 'upper', reverse: false },
      { gateId: 'gate-2', openingId: 'upper', reverse: false },
    ])
    expect(store.getState().past.length).toBe(1)
  })

  it('should ignore sequence moves with mismatched source labels', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2'),
    ])

    store.getState().setTrack(track)
    store.getState().moveGateSequenceEntry('gate-2', 'main', 1, 2)

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
    expect(store.getState().past).toEqual([])
  })

  it('should preserve an explicit double-h sequence order including middle when normalizing track', () => {
    const doubleHGate = createTestGate('double-h-1', {
      type: 'double-h',
      openings: createDefaultGateOpenings('double-h', 1),
    })
    const track = createTestTrack([doubleHGate])
    track.gateSequence = [
      { gateId: 'double-h-1', openingId: 'lower', reverse: false },
      { gateId: 'double-h-1', openingId: 'upper', reverse: false },
      { gateId: 'double-h-1', openingId: 'middle', reverse: false },
    ]

    store.getState().setTrack(track)

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'double-h-1', openingId: 'lower', reverse: false },
      { gateId: 'double-h-1', openingId: 'upper', reverse: false },
      { gateId: 'double-h-1', openingId: 'middle', reverse: false },
    ])
  })

  it('should move a double-h upper opening from sequence number 10 to 9 without duplicating middle', () => {
    const fillerGates = Array.from({ length: 7 }, (_, index) => createTestGate(`gate-${index + 1}`))
    const doubleHGate = createTestGate('double-h-1', {
      type: 'double-h',
      openings: createDefaultGateOpenings('double-h', 1),
    })
    const track = createTestTrack([...fillerGates, doubleHGate])
    track.gateSequence = [
      ...fillerGates.map((gate) => ({ gateId: gate.id, openingId: 'main', reverse: false })),
      { gateId: 'double-h-1', openingId: 'lower', reverse: false },
      { gateId: 'double-h-1', openingId: 'middle', reverse: false },
      { gateId: 'double-h-1', openingId: 'upper', reverse: false },
    ]

    store.getState().setTrack(track)
    store.getState().moveGateSequenceEntry('double-h-1', 'upper', 10, 9)

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      ...fillerGates.map((gate) => ({ gateId: gate.id, openingId: 'main', reverse: false })),
      { gateId: 'double-h-1', openingId: 'lower', reverse: false },
      { gateId: 'double-h-1', openingId: 'upper', reverse: false },
      { gateId: 'double-h-1', openingId: 'middle', reverse: false },
    ])
    expect(store.getState().currentTrack?.gateSequence).toHaveLength(10)
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

  it('should only open delete dialog for a single selected gate', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1'])
    expect(store.getState().isDeleteDialogOpen).toBe(false)

    store.getState().openDeleteDialog()
    expect(store.getState().isDeleteDialogOpen).toBe(true)

    store.getState().setSelectedGates(['gate-1', 'gate-2'])
    store.getState().openDeleteDialog()
    expect(store.getState().isDeleteDialogOpen).toBe(false)
  })

  it('should close delete dialog', () => {
    const track = createTestTrack([createTestGate('gate-1')])

    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1'])
    store.getState().openDeleteDialog()
    expect(store.getState().isDeleteDialogOpen).toBe(true)

    store.getState().closeDeleteDialog()
    expect(store.getState().isDeleteDialogOpen).toBe(false)
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

  it('should not insert a second start-finish gate', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish', 1) }),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      {
        id: 'gate-3',
        type: 'start-finish',
        position: { x: 5, y: 0, z: 0 },
        rotation: 30,
        size: 1,
        openings: createDefaultGateOpenings('start-finish', 1),
      },
      1,
      1,
    )

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-2'])
    expect(store.getState().past).toEqual([])
  })

  it('should not insert a second flag gate', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'flag', openings: createDefaultGateOpenings('flag', 1) }),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      {
        id: 'gate-3',
        type: 'flag',
        position: { x: 5, y: 0, z: 0 },
        rotation: 30,
        size: 1,
        openings: createDefaultGateOpenings('flag', 1),
      },
      1,
      1,
    )

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-2'])
    expect(store.getState().past).toEqual([])
  })

  it('should not update another gate to an existing singleton gate type', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish', 1) }),
      createTestGate('gate-2'),
      createTestGate('gate-3', { type: 'flag', openings: createDefaultGateOpenings('flag', 1) }),
      createTestGate('gate-4'),
    ])

    store.getState().setTrack(track)
    store.getState().updateGate('gate-2', { type: 'start-finish' })
    store.getState().updateGate('gate-4', { type: 'flag' })

    expect(store.getState().currentTrack?.gates.map((gate) => gate.type)).toEqual([
      'start-finish',
      'standard',
      'flag',
      'standard',
    ])
    expect(store.getState().past).toEqual([])
  })

  it('should remove duplicate singleton gates when setting a track', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish', 1) }),
      createTestGate('gate-2', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish', 1) }),
      createTestGate('gate-3', { type: 'flag', openings: createDefaultGateOpenings('flag', 1) }),
      createTestGate('gate-4', { type: 'flag', openings: createDefaultGateOpenings('flag', 1) }),
      createTestGate('gate-5'),
    ])

    store.getState().setTrack(track)

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-5'])
    expect(store.getState().currentTrack?.gateSequence.map((entry) => entry.gateId)).toEqual(['gate-1', 'gate-3', 'gate-5'])
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
