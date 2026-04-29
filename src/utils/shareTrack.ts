import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Config, Track } from '@/types'
import { serializeTrack, deserializeTrack } from '@/schemas/track.schema'

const DEFAULT_VIEWER_DOMAIN = 'https://sharedtrack.fpvooe.com'
const COMPRESSED_PAYLOAD_PREFIX = 'z.'

function decodeBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const decoded = atob(normalized)
  const escaped = Array.from(decoded, (char) => (
    `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`
  )).join('')

  return decodeURIComponent(escaped)
}

export function encodeTrackSharePayload(track: Track, config: Config): string {
  return `${COMPRESSED_PAYLOAD_PREFIX}${compressToEncodedURIComponent(serializeTrack(track, config))}`
}

export function decodeTrackSharePayload(payload: string): ReturnType<typeof deserializeTrack> {
  try {
    if (payload.startsWith(COMPRESSED_PAYLOAD_PREFIX)) {
      const decompressed = decompressFromEncodedURIComponent(payload.slice(COMPRESSED_PAYLOAD_PREFIX.length))
      if (!decompressed) throw new Error('Failed to decompress shared track data')

      return deserializeTrack(decompressed)
    }

    return deserializeTrack(decodeBase64Url(payload))
  } catch {
    return {
      error: 'Invalid share payload',
      errors: [{ field: 'root', message: 'Failed to decode shared track data' }],
    }
  }
}

export function createTrackShareUrl(track: Track, config: Config, viewerDomain?: string): string {
  const domain = (viewerDomain || DEFAULT_VIEWER_DOMAIN).replace(/\/$/, '')
  return `${domain}/#${encodeTrackSharePayload(track, config)}`
}
