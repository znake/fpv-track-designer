import { describe, expect, it } from 'vitest'
import { defaultConfig } from '@/store/configSlice'
import type { Track } from '@/types'
import { createDefaultGateOpenings } from '@/utils/gateOpenings'
import { createTrackShareUrl, decodeTrackSharePayload, encodeTrackSharePayload } from './shareTrack'

const createTestTrack = (): Track => ({
  id: 'share-track',
  name: 'Share Track',
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

describe('shareTrack helpers', () => {
  it('round-trips a track through a share URL hash payload', () => {
    const track = createTestTrack()
    const shareUrl = createTrackShareUrl(track, defaultConfig, 'https://sharedtrack.fpvooe.com/')
    const payload = shareUrl.split('#')[1]

    expect(shareUrl.startsWith('https://sharedtrack.fpvooe.com/#')).toBe(true)
    expect(payload).toBe(encodeTrackSharePayload(track, defaultConfig))

    const decoded = decodeTrackSharePayload(payload)
    expect('error' in decoded).toBe(false)
    if ('error' in decoded) return
    expect(decoded.track.id).toBe('share-track')
    expect(decoded.config.fieldSize).toEqual(defaultConfig.fieldSize)
  })

  it('returns a validation error for invalid payloads', () => {
    const decoded = decodeTrackSharePayload('invalid-payload')

    expect('error' in decoded).toBe(true)
    if (!('error' in decoded)) return
    expect(decoded.errors[0]?.field).toBe('root')
  })
})
