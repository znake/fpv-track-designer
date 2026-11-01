import type { Config, Track } from '@/types'
import { decodeTrackSharePayload } from './shareTrack'

export const EDITOR_HANDOFF_HASH_PREFIX = '#track='

export type EditorHandoff = { track: Track; config: Config } | { error: string }

export function readEditorHandoff(hash: string = window.location.hash): EditorHandoff | null {
  if (!hash.startsWith(EDITOR_HANDOFF_HASH_PREFIX)) return null

  return decodeTrackSharePayload(hash.slice(EDITOR_HANDOFF_HASH_PREFIX.length))
}

export function clearEditorHandoffHash(): void {
  if (typeof window === 'undefined') return

  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}
