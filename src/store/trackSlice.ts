import type { StateCreator } from 'zustand'
import type { Track, Gate } from '../types'

const MAX_HISTORY = 50

export interface TrackSlice {
  currentTrack: Track | null
  selectedGateId: string | null
  past: Track[]
  future: Track[]
  setTrack: (track: Track | null) => void
  updateGate: (gateId: string, updates: Partial<Gate>) => void
  moveGate: (gateId: string, direction: 'N' | 'S' | 'E' | 'W', distance?: number) => void
  rotateGate: (gateId: string, clockwise: boolean) => void
  selectGate: (gateId: string | null) => void
  undo: () => void
  redo: () => void
}

function pushHistory(state: TrackSlice): { past: Track[]; future: Track[] } {
  if (!state.currentTrack) return { past: state.past, future: [] }
  const newPast = [...state.past, state.currentTrack].slice(-MAX_HISTORY)
  return { past: newPast, future: [] }
}

export const createTrackSlice: StateCreator<TrackSlice, [], [], TrackSlice> = (set, _get, _store) => ({
  currentTrack: null,
  selectedGateId: null,
  past: [],
  future: [],
  setTrack: (track) => set((state) => ({
    currentTrack: track,
    selectedGateId: null,
    ...pushHistory({ ...state, currentTrack: state.currentTrack }),
  })),
  updateGate: (gateId, updates) => set((state) => {
    if (!state.currentTrack) return state
    const history = pushHistory(state)
    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId ? { ...g, ...updates } : g
        ),
        updatedAt: new Date().toISOString(),
      },
      ...history,
    }
  }),
  moveGate: (gateId, direction, distance = 1) => set((state) => {
    if (!state.currentTrack) return state
    const history = pushHistory(state)
    const deltas = { N: { y: distance }, S: { y: -distance }, E: { x: distance }, W: { x: -distance } }
    const delta = deltas[direction]
    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId ? { ...g, position: { ...g.position, ...delta } } : g
        ),
        updatedAt: new Date().toISOString(),
      },
      ...history,
    }
  }),
  rotateGate: (gateId, clockwise) => set((state) => {
    if (!state.currentTrack) return state
    const history = pushHistory(state)
    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId
            ? { ...g, rotation: clockwise ? (g.rotation + 30) % 360 : (g.rotation - 30 + 360) % 360 }
            : g
        ),
        updatedAt: new Date().toISOString(),
      },
      ...history,
    }
  }),
  selectGate: (gateId) => set({ selectedGateId: gateId }),
  undo: () => set((state) => {
    if (state.past.length === 0 || !state.currentTrack) return state
    const previous = state.past[state.past.length - 1]
    const newPast = state.past.slice(0, -1)
    return {
      currentTrack: previous,
      past: newPast,
      future: [state.currentTrack, ...state.future],
    }
  }),
  redo: () => set((state) => {
    if (state.future.length === 0 || !state.currentTrack) return state
    const next = state.future[0]
    const newFuture = state.future.slice(1)
    return {
      currentTrack: next,
      past: [...state.past, state.currentTrack],
      future: newFuture,
    }
  }),
})