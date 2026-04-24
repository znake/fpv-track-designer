import type { Track, Config } from '../types'
import { serializeTrack, deserializeTrack } from '../schemas/track.schema'
import { normalizeGates } from './gateOpenings'
import { normalizeGateSequence } from './gateSequence'

const STORAGE_KEY_PREFIX = 'fpv-track-'
const TRACK_LIST_KEY = 'fpv-track-list'

function normalizeTrackData(track: Track): Track {
  const gates = normalizeGates(track.gates)

  return {
    ...track,
    gates,
    gateSequence: normalizeGateSequence(track.gateSequence, gates),
  }
}

export interface SavedTrackInfo {
  id: string
  name: string
  updatedAt: string
}

export function saveTrack(track: Track, config: Config): void {
  try {
    const normalizedTrack = normalizeTrackData(track)
    const json = serializeTrack(normalizedTrack, config)
    localStorage.setItem(STORAGE_KEY_PREFIX + normalizedTrack.id, json)

    const list = listTracks()
    const existing = list.findIndex(t => t.id === normalizedTrack.id)
    const info: SavedTrackInfo = { id: normalizedTrack.id, name: normalizedTrack.name, updatedAt: normalizedTrack.updatedAt }
    if (existing >= 0) {
      list[existing] = info
    } else {
      list.push(info)
    }
    localStorage.setItem(TRACK_LIST_KEY, JSON.stringify(list))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded')
    }
    throw e
  }
}

export function loadTrack(id: string): { track: Track; config: Config } | null {
  const json = localStorage.getItem(STORAGE_KEY_PREFIX + id)
  if (!json) return null

  const result = deserializeTrack(json)
  if ('error' in result) return null
  return {
    ...result,
    track: normalizeTrackData(result.track),
  }
}

export function listTracks(): SavedTrackInfo[] {
  const json = localStorage.getItem(TRACK_LIST_KEY)
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

export function deleteTrack(id: string): void {
  localStorage.removeItem(STORAGE_KEY_PREFIX + id)
  const list = listTracks().filter(t => t.id !== id)
  localStorage.setItem(TRACK_LIST_KEY, JSON.stringify(list))
}

export function autoSave(track: Track, config: Config): void {
  try {
    saveTrack({ ...track, updatedAt: new Date().toISOString() }, config)
  } catch (e) {
    console.error('Auto-save failed:', e)
  }
}
