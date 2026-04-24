import type { StateCreator } from 'zustand'
import type { Track, Gate } from '../types'
import { normalizeGates, recreateGateOpenings } from '../utils/gateOpenings'
import { buildDefaultGateSequenceEntries, normalizeGateSequence } from '../utils/gateSequence'

const MAX_HISTORY = 50

interface TrackHistoryEntry {
  track: Track
  selectedGateId: string | null
  selectedGateIds: string[]
}

export interface TrackSlice {
  currentTrack: Track | null
  selectedGateId: string | null
  selectedGateIds: string[]
  past: TrackHistoryEntry[]
  future: TrackHistoryEntry[]
  setTrack: (track: Track | null) => void
  updateGate: (gateId: string, updates: Partial<Gate>) => void
  setGatePosition: (gateId: string, position: { x: number; y: number; z: number }) => void
  commitGateDrag: () => void
  setGateRotation: (gateId: string, rotation: number) => void
  moveGate: (gateId: string, direction: 'N' | 'S' | 'E' | 'W', distance?: number) => void
  moveSelectedGates: (direction: 'N' | 'S' | 'E' | 'W', distance?: number) => void
  rotateGate: (gateId: string, clockwise: boolean) => void
  selectGate: (gateId: string | null, additive?: boolean) => void
  setSelectedGates: (gateIds: string[]) => void
  insertGateAtIndex: (gate: Gate, gateIndex: number, sequenceIndex: number) => void
  deleteSelectedGates: () => void
  toggleGateDirection: (gateId: string, openingId: string) => void
  undo: () => void
  redo: () => void
  setDraggingGate: (isDragging: boolean) => void
  isDraggingGate: boolean
}

function normalizeTrack(track: Track): Track {
  const gates = normalizeGates(track.gates)

  return {
    ...track,
    gates,
    gateSequence: normalizeGateSequence(track.gateSequence, gates),
  }
}

function createHistoryEntry(state: Pick<TrackSlice, 'currentTrack' | 'selectedGateId' | 'selectedGateIds'>): TrackHistoryEntry | null {
  if (!state.currentTrack) return null

  return {
    track: state.currentTrack,
    selectedGateId: state.selectedGateId,
    selectedGateIds: state.selectedGateIds,
  }
}

function getSelectionState(track: Track, selectedGateId: string | null, selectedGateIds: string[]) {
  const existingGateIds = new Set(track.gates.map((gate) => gate.id))
  const nextSelectedGateIds = [...new Set(selectedGateIds)].filter((gateId) => existingGateIds.has(gateId))

  if (selectedGateId && existingGateIds.has(selectedGateId)) {
    return {
      selectedGateId,
      selectedGateIds: nextSelectedGateIds.includes(selectedGateId)
        ? nextSelectedGateIds
        : [selectedGateId, ...nextSelectedGateIds],
    }
  }

  return {
    selectedGateId: nextSelectedGateIds[0] ?? null,
    selectedGateIds: nextSelectedGateIds,
  }
}

function pushHistory(state: TrackSlice): { past: TrackHistoryEntry[]; future: TrackHistoryEntry[] } {
  if (!state.currentTrack) return { past: state.past, future: [] }

  const entry = createHistoryEntry(state)
  if (!entry) return { past: state.past, future: [] }

  const newPast = [...state.past, entry].slice(-MAX_HISTORY)
  return { past: newPast, future: [] }
}

export const createTrackSlice: StateCreator<TrackSlice, [], [], TrackSlice> = (set) => ({
  currentTrack: null,
  selectedGateId: null,
  selectedGateIds: [],
  isDraggingGate: false,
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
        gates: state.currentTrack.gates.map((gate) => {
          if (gate.id !== gateId) return gate

          return {
            ...gate,
            ...updates,
            openings: updates.openings
              ?? (updates.type || updates.size
                ? recreateGateOpenings({ id: gate.id, type: updates.type ?? gate.type, size: updates.size ?? gate.size })
                : gate.openings),
          }
        }),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
    }
  }),
  setGatePosition: (gateId, position) => set((state) => {
    if (!state.currentTrack) return state
    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId ? { ...g, position } : g,
        ),
      },
    }
  }),
  commitGateDrag: () => set((state) => {
    if (!state.currentTrack) return state

    const entry = createHistoryEntry(state)
    if (!entry) return state

    const newPast = [...state.past, entry].slice(-MAX_HISTORY)
    return { past: newPast, future: [] }
  }),
  setGateRotation: (gateId, rotation) => set((state) => {
    if (!state.currentTrack) return state
    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId ? { ...g, rotation: ((rotation % 360) + 360) % 360 } : g,
        ),
      },
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
  insertGateAtIndex: (gate, gateIndex, sequenceIndex) => set((state) => {
    if (!state.currentTrack) return state

    const history = pushHistory(state)
    const normalizedGate = normalizeGates([gate])[0]
    const nextGates = [...state.currentTrack.gates]
    const nextSequence = [...state.currentTrack.gateSequence]
    const clampedGateIndex = Math.max(0, Math.min(gateIndex, nextGates.length))
    const clampedSequenceIndex = Math.max(0, Math.min(sequenceIndex, nextSequence.length))

    nextGates.splice(clampedGateIndex, 0, normalizedGate)
    nextSequence.splice(clampedSequenceIndex, 0, ...buildDefaultGateSequenceEntries(normalizedGate))

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: nextGates,
        gateSequence: nextSequence,
        updatedAt: new Date().toISOString(),
      }),
      selectedGateId: normalizedGate.id,
      selectedGateIds: [normalizedGate.id],
      ...history,
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
        gateSequence: state.currentTrack.gateSequence.filter((entry) => !selectedIds.has(entry.gateId)),
        updatedAt: new Date().toISOString(),
      }),
      selectedGateId: null,
      selectedGateIds: [],
      ...history,
    }
  }),
  toggleGateDirection: (gateId, openingId) => set((state) => {
    if (!state.currentTrack) return state
    const gate = state.currentTrack.gates.find((candidate) => candidate.id === gateId)
    const opening = gate?.openings.find((candidate) => candidate.id === openingId)
    if (!gate || !opening) return state

    const nextReverse = !opening.reverse
    const nextSequence = state.currentTrack.gateSequence.map((entry) => {
      if (entry.gateId !== gateId || entry.openingId !== openingId) return entry

      return {
        ...entry,
        reverse: nextReverse,
      }
    })

    const history = pushHistory(state)
    const nextGates = state.currentTrack.gates.map((candidate) => {
      if (candidate.id !== gateId) return candidate

      return {
        ...candidate,
        openings: candidate.openings.map((candidateOpening) => (
          candidateOpening.id === openingId
            ? { ...candidateOpening, reverse: nextReverse }
            : candidateOpening
        )),
      }
    })

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: nextGates,
        gateSequence: nextSequence,
        updatedAt: new Date().toISOString(),
      }),
      ...history,
    }
  }),
  undo: () => set((state) => {
    if (state.past.length === 0 || !state.currentTrack) return state

    const previousEntry = state.past[state.past.length - 1]
    const previous = normalizeTrack(previousEntry.track)
    const newPast = state.past.slice(0, -1)

    const currentEntry = createHistoryEntry(state)
    if (!currentEntry) return state

    return {
      currentTrack: previous,
      ...getSelectionState(previous, previousEntry.selectedGateId, previousEntry.selectedGateIds),
      past: newPast,
      future: [currentEntry, ...state.future],
    }
  }),
  redo: () => set((state) => {
    if (state.future.length === 0 || !state.currentTrack) return state

    const nextEntry = state.future[0]
    const next = normalizeTrack(nextEntry.track)
    const newFuture = state.future.slice(1)

    const currentEntry = createHistoryEntry(state)
    if (!currentEntry) return state

    return {
      currentTrack: next,
      ...getSelectionState(next, nextEntry.selectedGateId, nextEntry.selectedGateIds),
      past: [...state.past, currentEntry],
      future: newFuture,
    }
  }),
  setDraggingGate: (isDragging) => set({ isDraggingGate: isDragging }),
})
