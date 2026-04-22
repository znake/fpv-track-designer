import type { StateCreator } from 'zustand'
import type { Track, Gate } from '../types'

const MAX_HISTORY = 50

export interface TrackSlice {
  currentTrack: Track | null
  selectedGateId: string | null
  selectedGateIds: string[]
  past: Track[]
  future: Track[]
  setTrack: (track: Track | null) => void
  updateGate: (gateId: string, updates: Partial<Gate>) => void
  moveGate: (gateId: string, direction: 'N' | 'S' | 'E' | 'W', distance?: number) => void
  moveSelectedGates: (direction: 'N' | 'S' | 'E' | 'W', distance?: number) => void
  rotateGate: (gateId: string, clockwise: boolean) => void
  selectGate: (gateId: string | null, additive?: boolean) => void
  setSelectedGates: (gateIds: string[]) => void
  deleteSelectedGates: () => void
  undo: () => void
  redo: () => void
}

function normalizeGateSequence(track: Track): string[] {
  const gateIds = new Set(track.gates.map((g) => g.id))
  const source = Array.isArray(track.gateSequence) && track.gateSequence.length > 0
    ? track.gateSequence
    : track.gates.map((g) => g.id)

  const normalized: string[] = []
  for (const id of source) {
    if (!gateIds.has(id)) continue
    if (normalized.length > 0 && normalized[normalized.length - 1] === id) continue
    normalized.push(id)
  }

  if (normalized.length > 1 && normalized[0] === normalized[normalized.length - 1]) {
    normalized.pop()
  }

  if (normalized.length === 0) {
    return track.gates.map((g) => g.id)
  }

  return normalized
}

function normalizeTrack(track: Track): Track {
  return {
    ...track,
    gateSequence: normalizeGateSequence(track),
  }
}

function pushHistory(state: TrackSlice): { past: Track[]; future: Track[] } {
  if (!state.currentTrack) return { past: state.past, future: [] }
  const newPast = [...state.past, state.currentTrack].slice(-MAX_HISTORY)
  return { past: newPast, future: [] }
}

export const createTrackSlice: StateCreator<TrackSlice, [], [], TrackSlice> = (set) => ({
  currentTrack: null,
  selectedGateId: null,
  selectedGateIds: [],
  past: [],
  future: [],
  setTrack: (track) => set((state) => ({
    currentTrack: track ? normalizeTrack(track) : null,
    selectedGateId: null,
    selectedGateIds: [],
    ...pushHistory({ ...state, currentTrack: state.currentTrack }),
  })),
  updateGate: (gateId, updates) => set((state) => {
    if (!state.currentTrack) return state
    const history = pushHistory(state)
    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId ? { ...g, ...updates } : g,
        ),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
    }
  }),
  moveGate: (gateId, direction, distance = 1) => set((state) => {
    if (!state.currentTrack) return state
    const history = pushHistory(state)
    const deltas = { N: { y: distance }, S: { y: -distance }, E: { x: distance }, W: { x: -distance } }
    const delta = deltas[direction]
    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId ? { ...g, position: { ...g.position, ...delta } } : g,
        ),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
    }
  }),
  moveSelectedGates: (direction, distance = 1) => set((state) => {
    if (!state.currentTrack || state.selectedGateIds.length === 0) return state

    const history = pushHistory(state)
    const selectedIds = new Set(state.selectedGateIds)
    const deltas = { N: { y: distance }, S: { y: -distance }, E: { x: distance }, W: { x: -distance } }
    const delta = deltas[direction]

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          selectedIds.has(g.id) ? { ...g, position: { ...g.position, ...delta } } : g,
        ),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
    }
  }),
  rotateGate: (gateId, clockwise) => set((state) => {
    if (!state.currentTrack) return state
    const history = pushHistory(state)
    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId
            ? { ...g, rotation: clockwise ? (g.rotation + 30) % 360 : (g.rotation - 30 + 360) % 360 }
            : g,
        ),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
    }
  }),
  selectGate: (gateId, additive = false) => set((state) => {
    if (!gateId) {
      return { selectedGateId: null, selectedGateIds: [] }
    }

    if (!additive) {
      return { selectedGateId: gateId, selectedGateIds: [gateId] }
    }

    const isAlreadySelected = state.selectedGateIds.includes(gateId)
    const selectedGateIds = isAlreadySelected
      ? state.selectedGateIds.filter((id) => id !== gateId)
      : [...state.selectedGateIds, gateId]

    return {
      selectedGateIds,
      selectedGateId: selectedGateIds.length > 0 ? selectedGateIds[0] : null,
    }
  }),
  setSelectedGates: (gateIds) => set((state) => {
    if (!state.currentTrack) return { selectedGateId: null, selectedGateIds: [] }

    const existingGateIds = new Set(state.currentTrack.gates.map((g) => g.id))
    const selectedGateIds = [...new Set(gateIds)].filter((id) => existingGateIds.has(id))

    return {
      selectedGateIds,
      selectedGateId: selectedGateIds.length > 0 ? selectedGateIds[0] : null,
    }
  }),
  deleteSelectedGates: () => set((state) => {
    if (!state.currentTrack || state.selectedGateIds.length === 0) return state

    const history = pushHistory(state)
    const selectedIds = new Set(state.selectedGateIds)

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.filter((g) => !selectedIds.has(g.id)),
        gateSequence: state.currentTrack.gateSequence.filter((gateId) => !selectedIds.has(gateId)),
        updatedAt: new Date().toISOString(),
      }),
      selectedGateId: null,
      selectedGateIds: [],
      ...history,
    }
  }),
  undo: () => set((state) => {
    if (state.past.length === 0 || !state.currentTrack) return state
    const previous = normalizeTrack(state.past[state.past.length - 1])
    const newPast = state.past.slice(0, -1)
    return {
      currentTrack: previous,
      past: newPast,
      future: [state.currentTrack, ...state.future],
    }
  }),
  redo: () => set((state) => {
    if (state.future.length === 0 || !state.currentTrack) return state
    const next = normalizeTrack(state.future[0])
    const newFuture = state.future.slice(1)
    return {
      currentTrack: next,
      past: [...state.past, state.currentTrack],
      future: newFuture,
    }
  }),
})
