import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { createTrackSlice, type TrackSlice } from './trackSlice'
import type { Track, Gate } from '../types'

const createTestTrack = (gates: Gate[] = []): Track => ({
  id: 'test-track',
  name: 'Test Track',
  gates,
  gateSequence: gates.map((gate) => gate.id),
  fieldSize: { width: 100, height: 100 },
  gateSize: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
    ])

    store.getState().setTrack(track)

    expect(store.getState().currentTrack).toEqual(track)
    expect(store.getState().selectedGateId).toBeNull()
    expect(store.getState().selectedGateIds).toEqual([])
  })

  it('should move gate and record history', () => {
    const track = createTestTrack([
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
    ])
    store.getState().setTrack(track)

    // Move gate north by 1
    store.getState().moveGate('gate-1', 'N', 1)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(1)
    expect(store.getState().past.length).toBe(1)
  })

  it('should undo last gate move', () => {
    const track = createTestTrack([
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
    ])
    store.getState().setTrack(track)

    // Move gate north
    store.getState().moveGate('gate-1', 'N', 1)

    // Undo
    store.getState().undo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(0)
    expect(store.getState().future.length).toBe(1)
  })

  it('should redo undone gate move', () => {
    const track = createTestTrack([
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
    ])
    store.getState().setTrack(track)

    // Move gate north
    store.getState().moveGate('gate-1', 'N', 1)

    // Undo
    store.getState().undo()

    // Redo
    store.getState().redo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(1)
  })

  it('should rotate gate clockwise', () => {
    const track = createTestTrack([
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
    ])
    store.getState().setTrack(track)

    store.getState().rotateGate('gate-1', true)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.rotation).toBe(30)
  })

  it('should rotate gate counter-clockwise', () => {
    const track = createTestTrack([
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 30, size: 1 },
    ])
    store.getState().setTrack(track)

    store.getState().rotateGate('gate-1', false)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.rotation).toBe(0)
  })

  it('should update gate properties', () => {
    const track = createTestTrack([
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
    ])
    store.getState().setTrack(track)

    store.getState().updateGate('gate-1', { type: 'h-gate', size: 1.5 })

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.type).toBe('h-gate')
    expect(gate?.size).toBe(1.5)
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
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
      { id: 'gate-2', type: 'standard', position: { x: 10, y: 0, z: 0 }, rotation: 0, size: 1 },
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
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
      { id: 'gate-2', type: 'standard', position: { x: 10, y: 0, z: 0 }, rotation: 0, size: 1 },
    ])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1', 'gate-2'])

    store.getState().deleteSelectedGates()

    expect(store.getState().currentTrack?.gates).toEqual([])
    expect(store.getState().currentTrack?.gateSequence).toEqual([])
    expect(store.getState().selectedGateIds).toEqual([])
  })

  it('should limit history to 50 changes', () => {
    const track = createTestTrack([
      { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, size: 1 },
    ])
    store.getState().setTrack(track)

    // Make 60 moves
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
