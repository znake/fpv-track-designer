import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { createTrackSlice, type TrackSlice } from './trackSlice'
import type { Config, Track, Gate, IdealLinePoint } from '../types'
import { createDefaultGateOpenings } from '../utils/gateOpenings'
import type { GenerationConfig } from '../utils/generationConfig'

const createTestTrack = (gates: Gate[] = []): Track => ({
  id: 'test-track',
  name: 'Test Track',
  gates,
  gateSequence: gates.map((gate) => ({ gateId: gate.id, openingId: gate.openings[0]?.id ?? 'main', reverse: false })),
  fieldSize: { width: 100, height: 100 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const createTestGate = (id: string, overrides: Partial<Gate> = {}): Gate => ({
  id,
  type: 'standard',
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  openings: createDefaultGateOpenings('standard'),
  ...overrides,
})

const createTestStore = () => {
  return create<TrackSlice>()((set, get, store) => ({
    ...createTrackSlice(set, get, store),
  }))
}

const createSnapTestStore = (config: Pick<Config, 'snapGatesToGrid'> & Partial<Pick<Config, 'snapGridSize'>>) => {
  return create<TrackSlice & { config: Pick<Config, 'fieldSize' | 'snapGatesToGrid' | 'snapGridSize'> }>()((set, get, store) => ({
    config: { fieldSize: { width: 100, height: 100 }, snapGridSize: 0.3, ...config },
    ...createTrackSlice(set, get, store),
  }))
}

describe('TrackSlice - ideal-line points', () => {
  let store: ReturnType<typeof createTestStore>
  const leg = {
    from: { gateId: 'gate-1', openingId: 'main' },
    to: { gateId: 'gate-2', openingId: 'main' },
  }
  const insertion = { leg, u: 0.5, position: { x: 2, y: 1, z: 3 } }

  const insertedPoint = (): IdealLinePoint => {
    const point = store.getState().currentTrack?.idealLinePoints?.[0]
    if (!point) throw new Error('Missing inserted point')
    return point
  }

  beforeEach(() => {
    store = createTestStore()
    store.getState().setTrack(createTestTrack([
      createTestGate('gate-1', { position: { x: 1.1, y: 0.8, z: -1.1 } }),
      createTestGate('gate-2', { position: { x: 8, y: 0, z: 0 } }),
    ]))
  })

  it('inserts one selected point with a single dirty history entry', () => {
    // Given a clean track and an out-of-range u
    store.getState().moveGate('gate-1', 'N')
    store.getState().undo()
    // When inserting a point
    store.getState().insertFlightPathPoint({ ...insertion, u: 2 })
    // Then the point is selected, clamped inside the leg and undoable once
    const point = insertedPoint()
    expect(point.u).toBeGreaterThan(0)
    expect(point.u).toBeLessThan(1)
    expect(point.leg).toEqual(leg)
    expect(store.getState().selectedFlightPathPointId).toBe(point.id)
    expect(store.getState().isTrackModified).toBe(true)
    expect(store.getState().past).toHaveLength(1)
    expect(store.getState().future).toEqual([])
  })

  it('deletes a point with one undoable history entry', () => {
    // Given an inserted and selected point
    store.getState().insertFlightPathPoint(insertion)
    const point = insertedPoint()
    // When deleting it
    store.getState().deleteFlightPathPoint(point.id)
    // Then it disappears with one new dirty history entry and can be restored
    expect(store.getState().currentTrack).not.toHaveProperty('idealLinePoints')
    expect(store.getState().selectedFlightPathPointId).toBeNull()
    expect(store.getState().past).toHaveLength(2)
    expect(store.getState().isTrackModified).toBe(true)
    store.getState().undo()
    expect(store.getState().currentTrack?.idealLinePoints).toEqual([point])
    store.getState().redo()
    expect(store.getState().currentTrack).not.toHaveProperty('idealLinePoints')
  })

  it('allows inserting another point after deleting a dragged point', () => {
    // Given an active point drag and its delete action
    store.getState().insertFlightPathPoint(insertion)
    const firstId = insertedPoint().id
    store.getState().setFlightPathPointPosition(firstId, { x: 4, y: 3, z: 5 })
    store.getState().setDraggingGate(true)
    store.getState().deleteFlightPathPoint(firstId)
    // When inserting another point
    store.getState().insertFlightPathPoint({ ...insertion, u: 0.6 })
    // Then the old drag cannot block insertion and the new point is independent
    expect(store.getState().isDraggingGate).toBe(false)
    expect(store.getState().dragHistoryEntry).toBeNull()
    expect(store.getState().currentTrack?.idealLinePoints).toHaveLength(1)
    expect(insertedPoint().id).not.toBe(firstId)
    expect(store.getState().selectedFlightPathPointId).toBe(insertedPoint().id)
  })

  it('rejects insertion without a track or with a non-finite position', () => {
    // Given no track and an invalid insertion
    const emptyStore = createTestStore()
    const before = emptyStore.getState()
    // When inserting without a track and with NaN
    emptyStore.getState().insertFlightPathPoint(insertion)
    store.getState().insertFlightPathPoint({ ...insertion, position: { x: Number.NaN, y: 0, z: 0 } })
    // Then neither operation mutates state
    expect(emptyStore.getState()).toBe(before)
    expect(store.getState().currentTrack?.idealLinePoints).toBeUndefined()
  })

  it('makes gate and point selection exclusive without dirtying the track', () => {
    // Given an inserted point and a selected gate
    store.getState().insertFlightPathPoint(insertion)
    const id = insertedPoint().id
    store.getState().markTrackSaved()
    store.getState().selectGate('gate-1')
    store.getState().openDeleteDialog()
    // When selecting the point and then the ground
    store.getState().selectFlightPathPoint(id)
    // Then the gate selection and dialogs clear without dirtying
    expect(store.getState()).toMatchObject({ selectedFlightPathPointId: id, selectedGateIds: [], isDeleteDialogOpen: false, isTrackModified: false })
    store.getState().selectGate(null)
    expect(store.getState().selectedFlightPathPointId).toBeNull()
  })

  it('applies the gate field and ground policy during a live drag', () => {
    // Given an inserted point
    store.getState().insertFlightPathPoint(insertion)
    const id = insertedPoint().id
    const originalTrack = store.getState().currentTrack
    // When dragging outside the field and below ground
    store.getState().setFlightPathPointPosition(id, { x: 200, y: -4, z: 3 })
    // Then position is clamped like a gate and only a clean draft exists
    expect(insertedPoint().position).toEqual({ x: 50, y: 0, z: 3 })
    expect(store.getState().dragHistoryEntry?.track).toBe(originalTrack)
    expect(store.getState().isTrackModified).toBe(true)
    expect(store.getState().past).toHaveLength(1)
  })

  it('applies the active snap grid to point movement', () => {
    // Given snapping and an inserted point
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    snapStore.getState().setTrack(createTestTrack([createTestGate('gate-1'), createTestGate('gate-2')]))
    snapStore.getState().insertFlightPathPoint(insertion)
    const id = snapStore.getState().currentTrack?.idealLinePoints?.[0].id
    if (!id) throw new Error('Missing point id')
    // When moving to fractional coordinates
    snapStore.getState().setFlightPathPointPosition(id, { x: 2.31, y: 1.32, z: 3.33 })
    // Then every coordinate snaps to 0.3 metres
    expect(snapStore.getState().currentTrack?.idealLinePoints?.[0].position).toEqual({ x: 2.4, y: 1.2, z: 3.3 })
  })

  it('ignores unknown point ids and non-finite drag positions', () => {
    // Given an inserted point
    store.getState().insertFlightPathPoint(insertion)
    const before = store.getState()
    // When updating an unknown id and NaN
    store.getState().setFlightPathPointPosition('unknown', { x: 1, y: 1, z: 1 })
    store.getState().setFlightPathPointPosition(insertedPoint().id, { x: 1, y: Number.NaN, z: 1 })
    // Then state remains identical
    expect(store.getState()).toBe(before)
  })

  it('captures one draft across multiple moves and commits one undo step', () => {
    // Given an inserted point
    store.getState().insertFlightPathPoint(insertion)
    const id = insertedPoint().id
    store.getState().setFlightPathPointPosition(id, { x: 3, y: 2, z: 4 })
    const draft = store.getState().dragHistoryEntry
    // When moving again and committing
    store.getState().setFlightPathPointPosition(id, { x: 4, y: 3, z: 5 })
    store.getState().commitGateDrag()
    // Then one new history entry contains the first draft
    expect(store.getState().past.at(-1)).toBe(draft)
    expect(store.getState().dragHistoryEntry).toBeNull()
    expect(insertedPoint().position).toEqual({ x: 4, y: 3, z: 5 })
  })

  it('undoes and redoes insertion and position edits', () => {
    // Given an inserted and moved point
    store.getState().insertFlightPathPoint(insertion)
    const id = insertedPoint().id
    store.getState().setFlightPathPointPosition(id, { x: 4, y: 3, z: 5 })
    store.getState().commitGateDrag()
    // When undoing twice and redoing twice
    store.getState().undo()
    expect(store.getState().currentTrack?.idealLinePoints?.[0].position).toEqual(insertion.position)
    store.getState().undo()
    expect(store.getState().currentTrack?.idealLinePoints).toBeUndefined()
    expect(store.getState().isTrackModified).toBe(false)
    store.getState().redo()
    expect(store.getState().currentTrack?.idealLinePoints).toHaveLength(1)
    store.getState().redo()
    // Then both point and position are restored
    expect(store.getState().currentTrack?.idealLinePoints?.[0].position).toEqual({ x: 4, y: 3, z: 5 })
    expect(store.getState().selectedFlightPathPointId).toBeNull()
  })

  it('restores only the points when an unfinished drag is canceled', () => {
    // Given an inserted point and a later gate rotation
    store.getState().insertFlightPathPoint(insertion)
    const id = insertedPoint().id
    store.getState().setFlightPathPointPosition(id, { x: 9, y: 8, z: 7 })
    store.getState().updateGate('gate-1', { rotation: 45 })
    // When canceling the point drag
    store.getState().cancelFlightPathPointDrag()
    // Then the insertion position returns but the gate rotation remains
    expect(insertedPoint().position).toEqual(insertion.position)
    expect(store.getState().currentTrack?.gates[0].rotation).toBe(45)
    expect(store.getState().dragHistoryEntry).toBeNull()
    expect(store.getState().isDraggingGate).toBe(false)
  })

  it.each(['setTrack', 'replaceTrack'] as const)('clears selection and stale drafts on %s', (replace) => {
    // Given an active point draft
    store.getState().insertFlightPathPoint(insertion)
    store.getState().setFlightPathPointPosition(insertedPoint().id, { x: 9, y: 8, z: 7 })
    const replacement = createTestTrack([createTestGate('gate-2')])
    // When replacing the track and invoking stale cleanup
    store.getState()[replace](replacement)
    store.getState().cancelFlightPathPointDrag()
    // Then the replacement remains intact and no old draft restores
    expect(store.getState().selectedFlightPathPointId).toBeNull()
    expect(store.getState().dragHistoryEntry).toBeNull()
    expect(store.getState().currentTrack).toEqual(replacement)
  })

  it('preserves authored points through gate edits and same-track synchronization', () => {
    // Given an inserted point
    store.getState().insertFlightPathPoint(insertion)
    const points = store.getState().currentTrack?.idealLinePoints
    // When editing gates and synchronizing the track name
    store.getState().setGatePosition('gate-1', { x: 2, y: 2, z: 2 })
    store.getState().rotateGate('gate-1', true)
    store.getState().toggleGateDirection('gate-1', 'main')
    store.getState().updateGate('gate-1', { type: 'h-gate' })
    const current = store.getState().currentTrack
    if (!current) throw new Error('Missing track')
    store.getState().syncCurrentTrack({ ...current, name: 'Saved' })
    // Then the authored data is unchanged
    expect(store.getState().currentTrack?.idealLinePoints).toEqual(points)
    expect(store.getState().currentTrack?.name).toBe('Saved')
  })
})

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
    expect(gate?.position.z).toBe(-1)
    expect(store.getState().past.length).toBe(1)
  })

  it('should clamp store gate movement to the field bounds', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 49.5, y: 0, z: -49.5 } }),
    ])
    store.getState().setTrack(track)

    expect(store.getState().currentTrack?.fieldSize).toEqual({ width: 100, height: 100 })
    expect(store.getState().currentTrack?.gates[0]?.position).toEqual({ x: 49.5, y: 0, z: -49.5 })

    store.getState().moveGate('gate-1', 'E', 10)
    store.getState().moveGate('gate-1', 'N', 10)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position).toEqual({ x: 50, y: 0, z: -50 })
  })

  it('should clamp selected gate movement to the field bounds', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: -49.5, y: 0, z: 49.5 } }),
      createTestGate('gate-2', { position: { x: -48, y: 0, z: 48 } }),
    ])
    store.getState().setTrack(track)
    expect(store.getState().currentTrack?.fieldSize).toEqual({ width: 100, height: 100 })
    store.getState().setSelectedGates(['gate-1', 'gate-2'])

    store.getState().moveSelectedGates('W', 10)
    store.getState().moveSelectedGates('S', 10)

    expect(store.getState().currentTrack?.gates.map((gate) => gate.position)).toEqual([
      { x: -50, y: 0, z: 50 },
      { x: -50, y: 0, z: 50 },
    ])
  })

  it('should not position dragged gates below the playing field', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)
    store.getState().setGatePosition('gate-1', { x: 0, y: -2, z: 0 })

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(0)
  })

  it('should undo a committed drag to the pre-drag position', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)
    store.getState().selectGate('gate-1')
    store.getState().setGatePosition('gate-1', { x: 3, y: 2, z: 4 })
    store.getState().setGatePosition('gate-1', { x: 4, y: 3, z: 5 })
    store.getState().commitGateDrag()
    store.getState().undo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(store.getState().selectedGateId).toBe('gate-1')
  })

  it('should snap so adjacent gates can touch edge-to-edge without overlap', () => {
    // Snap step is 1/4 of the 1.2m gate footprint (0.3m) so gates can be placed edge-to-edge
    // (every 4 steps) while still allowing finer in-between placement.
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 0, y: 0, z: 0 } }),
      createTestGate('gate-2'),
    ])

    snapStore.getState().setTrack(track)
    // User drags gate-2 close to the right edge of gate-1; centre distance must be a multiple of 0.3.
    snapStore.getState().setGatePosition('gate-2', { x: 1.1, y: 0, z: 0 })

    const gate2 = snapStore.getState().currentTrack?.gates.find(g => g.id === 'gate-2')
    // 1.1 rounds to nearest 0.3 step → 1.2 (which also equals one full gate width).
    expect(gate2?.position.x).toBeCloseTo(1.2, 9)
  })

  it('should snap to quarter-gate sub-steps for fine adjustments', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 0, y: 0, z: 0 } }),
    ])

    snapStore.getState().setTrack(track)
    // 0.4 rounds to nearest 0.3 step → 0.3 (one quarter of a gate width).
    snapStore.getState().setGatePosition('gate-1', { x: 0.4, y: 0, z: 0.7 })

    const gate = snapStore.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.x).toBeCloseTo(0.3, 9)
    expect(gate?.position.z).toBeCloseTo(0.6, 9)
  })

  it('should use the configured half-field snap size for position and height', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true, snapGridSize: 0.5 })
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    snapStore.getState().setTrack(track)
    snapStore.getState().setGatePosition('gate-1', { x: 0.76, y: 1.24, z: -0.26 })

    const gate = snapStore.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position).toEqual({ x: 1, y: 1, z: -0.5 })
  })

  it('should use the configured full-field snap size for all-gate alignment', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true, snapGridSize: 1 })
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 1.4, y: 0.6, z: -1.6 } }),
      createTestGate('gate-2', { position: { x: 2.49, y: 2.51, z: 2.49 } }),
    ])

    snapStore.getState().setTrack(track)
    snapStore.getState().snapAllGatesToGrid()

    const positions = snapStore.getState().currentTrack?.gates.map((gate) => gate.position) ?? []
    expect(positions).toEqual([
      { x: 1, y: 1, z: -2 },
      { x: 2, y: 3, z: 2 },
    ])
  })

  it('should clamp vertical drag positions before snapping them to the active grid', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    snapStore.getState().setTrack(track)
    snapStore.getState().setGatePosition('gate-1', { x: 0, y: -0.8, z: 0 })

    const gate = snapStore.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(0)
  })

  it('should align all gates when grid snapping is enabled', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 1.1, y: 0.8, z: -1.1 } }),
      createTestGate('gate-2', { position: { x: 2.4, y: 2.2, z: 2.4 } }),
    ])

    snapStore.getState().setTrack(track)
    snapStore.getState().snapAllGatesToGrid()

    const positions = snapStore.getState().currentTrack?.gates.map((gate) => gate.position) ?? []
    expect(positions[0].x).toBeCloseTo(1.2, 9)
    expect(positions[0].y).toBeCloseTo(0.9, 9)
    expect(positions[0].z).toBeCloseTo(-1.2, 9)
    expect(positions[1].x).toBeCloseTo(2.4, 9)
    expect(positions[1].y).toBeCloseTo(2.1, 9)
    expect(positions[1].z).toBeCloseTo(2.4, 9)
    expect(snapStore.getState().past.length).toBe(1)
  })

  it('should undo last gate move', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().undo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.z).toBe(0)
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
    expect(gate?.position.z).toBe(-1)
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

    store.getState().updateGate('gate-1', { type: 'h-gate' })

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.type).toBe('h-gate')
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
      openings: createDefaultGateOpenings('double'),
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
      openings: createDefaultGateOpenings('double'),
    })
    const secondDoubleGate = createTestGate('gate-2', {
      type: 'double',
      openings: createDefaultGateOpenings('double'),
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
      openings: createDefaultGateOpenings('double-h'),
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
      openings: createDefaultGateOpenings('double-h'),
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

    expect(gate1?.position.z).toBe(-1)
    expect(gate2?.position.z).toBe(-1)
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
      { id: 'gate-3', type: 'h-gate', position: { x: 5, y: 0, z: 0 }, rotation: 30, openings: createDefaultGateOpenings('h-gate') },
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
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish') }),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      {
        id: 'gate-3',
        type: 'start-finish',
        position: { x: 5, y: 0, z: 0 },
        rotation: 30,
        openings: createDefaultGateOpenings('start-finish'),
      },
      1,
      1,
    )

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-2'])
    expect(store.getState().past).toEqual([])
  })

  it('should insert multiple flag gates', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'flag', openings: createDefaultGateOpenings('flag') }),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      {
        id: 'gate-3',
        type: 'flag',
        position: { x: 5, y: 0, z: 0 },
        rotation: 30,
        openings: createDefaultGateOpenings('flag'),
      },
      1,
      1,
    )

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-2'])
    expect(store.getState().past.length).toBe(1)
  })

  it('should only block updates to an existing start-finish gate type', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish') }),
      createTestGate('gate-2'),
      createTestGate('gate-3', { type: 'flag', openings: createDefaultGateOpenings('flag') }),
      createTestGate('gate-4'),
    ])

    store.getState().setTrack(track)
    store.getState().updateGate('gate-2', { type: 'start-finish' })
    store.getState().updateGate('gate-4', { type: 'flag' })

    expect(store.getState().currentTrack?.gates.map((gate) => gate.type)).toEqual([
      'start-finish',
      'standard',
      'flag',
      'flag',
    ])
    expect(store.getState().past.length).toBe(1)
  })

  it('should only remove duplicate start-finish gates when setting a track', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish') }),
      createTestGate('gate-2', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish') }),
      createTestGate('gate-3', { type: 'flag', openings: createDefaultGateOpenings('flag') }),
      createTestGate('gate-4', { type: 'flag', openings: createDefaultGateOpenings('flag') }),
      createTestGate('gate-5'),
    ])

    store.getState().setTrack(track)

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-4', 'gate-5'])
    expect(store.getState().currentTrack?.gateSequence.map((entry) => entry.gateId)).toEqual(['gate-1', 'gate-3', 'gate-4', 'gate-5'])
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
        openings: createDefaultGateOpenings('double'),
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
      openings: createDefaultGateOpenings('h-gate'),
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

describe('TrackSlice - generationConfig and isTrackModified', () => {
  const fixtureGenerationConfig: GenerationConfig = {
    gateQuantities: {
      'standard': 2,
      'start-finish': 1,
      'h-gate': 1,
      'double-h': 1,
      'hurdle': 1,
      'dive': 1,
      'double': 1,
      'ladder': 1,
      'flag': 1,
      'flag-small': 0,
      'octagonal-tunnel': 1,
    },
    fieldSize: { width: 30, height: 15 },
  }

  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
  })

  it('setTrack without generationConfig sets generationConfig to null and isTrackModified to false', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    expect(store.getState().generationConfig).toBeNull()
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('setTrack with explicit generationConfig stores it', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track, fixtureGenerationConfig)
    expect(store.getState().generationConfig).toEqual(fixtureGenerationConfig)
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('setTrack always resets isTrackModified to false even after prior mutations', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().isTrackModified).toBe(true)

    const nextTrack = createTestTrack([createTestGate('gate-2')])
    store.getState().setTrack(nextTrack)
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('replaceTrack clears both generationConfig and isTrackModified', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track, fixtureGenerationConfig)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().generationConfig).toEqual(fixtureGenerationConfig)
    expect(store.getState().isTrackModified).toBe(true)

    const loadedTrack = createTestTrack([createTestGate('gate-2')])
    store.getState().replaceTrack(loadedTrack)
    expect(store.getState().generationConfig).toBeNull()
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('moveGate sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('commitGateDrag sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().setGatePosition('gate-1', { x: 1, y: 0, z: 1 })
    expect(store.getState().isTrackModified).toBe(false)
    store.getState().commitGateDrag()
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('deleteSelectedGates sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1'), createTestGate('gate-2')])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1'])
    store.getState().deleteSelectedGates()
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('toggleGateDirection sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().toggleGateDirection('gate-1', 'main')
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('moveGateSequenceEntry sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1'), createTestGate('gate-2')])
    store.getState().setTrack(track)
    store.getState().moveGateSequenceEntry('gate-2', 'main', 2, 1)
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('insertGateAtIndex sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().insertGateAtIndex(
      {
        id: 'gate-2',
        type: 'standard',
        position: { x: 5, y: 0, z: 0 },
        rotation: 0,
        openings: createDefaultGateOpenings('standard'),
      },
      1,
      1,
    )
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('rotateGate sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().rotateGate('gate-1', true)
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('snapAllGatesToGrid sets isTrackModified to true', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([createTestGate('gate-1', { position: { x: 1.1, y: 0, z: 0 } })])
    snapStore.getState().setTrack(track)
    snapStore.getState().snapAllGatesToGrid()
    expect(snapStore.getState().isTrackModified).toBe(true)
  })

  it('updateGate sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().updateGate('gate-1', { type: 'h-gate' })
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('moveSelectedGates sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1'), createTestGate('gate-2')])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1', 'gate-2'])
    store.getState().moveSelectedGates('N', 1)
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('undo restores isTrackModified=false from history snapshot', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track, fixtureGenerationConfig)
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().isTrackModified).toBe(true)

    store.getState().undo()
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('redo restores isTrackModified=true from future snapshot', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().undo()
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().redo()
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('selectGate does not flip isTrackModified after a fresh setTrack', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().selectGate('gate-1')
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().selectGate('gate-1', true)
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().selectGate(null)
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('setGatePosition does not flip isTrackModified (drag-in-progress, transient)', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().setGatePosition('gate-1', { x: 1, y: 0, z: 1 })
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().setGatePosition('gate-1', { x: 2, y: 0, z: 2 })
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('requestDestructiveAction runs immediately when the track is clean', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    let called = false

    store.getState().setTrack(track)
    store.getState().requestDestructiveAction(
      () => {
        called = true
      },
      'Titel',
      'Beschreibung',
    )

    expect(called).toBe(true)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('requestDestructiveAction stages the action when the track is modified', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    let called = false

    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().requestDestructiveAction(
      () => {
        called = true
      },
      'Titel',
      'Beschreibung',
    )

    expect(called).toBe(false)
    expect(store.getState().pendingDestructiveAction?.title).toBe('Titel')
    expect(store.getState().pendingDestructiveAction?.description).toBe('Beschreibung')
  })

  it('cancelDestructiveAction discards a staged destructive action', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    let called = false

    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().requestDestructiveAction(
      () => {
        called = true
      },
      'Titel',
      'Beschreibung',
    )
    store.getState().cancelDestructiveAction()

    expect(called).toBe(false)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('confirmDestructiveAction runs and clears a staged destructive action', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    let called = false

    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().requestDestructiveAction(
      () => {
        called = true
      },
      'Titel',
      'Beschreibung',
    )
    store.getState().confirmDestructiveAction()

    expect(called).toBe(true)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('saveBeforeDestructiveAction opens save dialog while keeping the staged action', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    let called = false

    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().requestDestructiveAction(
      () => {
        called = true
      },
      'Titel',
      'Beschreibung',
    )
    store.getState().saveBeforeDestructiveAction()

    expect(called).toBe(false)
    expect(store.getState().isSaveDialogOpen).toBe(true)
    expect(store.getState().pendingDestructiveAction).not.toBeNull()
  })

  it('markTrackSaved clears dirty state and continues a staged destructive action', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    let called = false

    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().isTrackModified).toBe(true)

    store.getState().requestDestructiveAction(
      () => {
        called = true
      },
      'Titel',
      'Beschreibung',
    )
    store.getState().saveBeforeDestructiveAction()
    store.getState().markTrackSaved()

    expect(called).toBe(true)
    expect(store.getState().isTrackModified).toBe(false)
    expect(store.getState().isSaveDialogOpen).toBe(false)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('dismissSaveDialog cancels both the save dialog and the staged destructive action', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    let called = false

    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().requestDestructiveAction(
      () => {
        called = true
      },
      'Titel',
      'Beschreibung',
    )
    store.getState().saveBeforeDestructiveAction()
    store.getState().dismissSaveDialog()

    expect(called).toBe(false)
    expect(store.getState().isSaveDialogOpen).toBe(false)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })
})
