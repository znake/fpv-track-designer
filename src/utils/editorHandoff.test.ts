import { afterEach, describe, expect, it } from 'vitest'
import { defaultConfig } from '@/store/configSlice'
import type { Track } from '@/types'
import { createDefaultGateOpenings } from '@/utils/gateOpenings'
import { encodeTrackSharePayload } from './shareTrack'
import { clearEditorHandoffHash, readEditorHandoff } from './editorHandoff'

const createTestTrack = (): Track => ({
  id: 'editor-handoff-track',
  name: 'Editor Handoff Track',
  gates: [
    {
      id: 'gate-1',
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('standard'),
    },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

const initialUrl = window.location.href

describe('editor handoff helpers', () => {
  afterEach(() => {
    window.history.replaceState(null, '', initialUrl)
  })

  it.each(['', '#other=abc'])('returns null when hash %s is not an editor handoff', (hash) => {
    expect(readEditorHandoff(hash)).toBeNull()
  })

  it.each(['#track=', '#track=not-a-real-payload'])('returns an error for invalid handoff hash %s', (hash) => {
    expect(readEditorHandoff(hash)).toHaveProperty('error')
  })

  it('returns the decoded track and config for a valid handoff hash', () => {
    const track = createTestTrack()
    const hash = `#track=${encodeTrackSharePayload(track, defaultConfig)}`

    const handoff = readEditorHandoff(hash)

    expect(handoff).not.toBeNull()
    expect(handoff && 'error' in handoff).toBe(false)
    if (!handoff || 'error' in handoff) return
    expect(handoff.track.id).toBe('editor-handoff-track')
    expect(handoff.config.fieldSize).toEqual(defaultConfig.fieldSize)
  })

  it('clears only the hash while preserving pathname and search', () => {
    window.history.replaceState(null, '', '/designer?from=viewer#track=z.payload')

    clearEditorHandoffHash()

    expect(window.location.pathname).toBe('/designer')
    expect(window.location.search).toBe('?from=viewer')
    expect(window.location.hash).toBe('')
  })
})
