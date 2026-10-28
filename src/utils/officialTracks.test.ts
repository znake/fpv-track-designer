import { describe, it, expect } from 'vitest'
import { serializeTrack } from '../schemas/track.schema'
import { listOfficialTracks, loadOfficialTrack, parseOfficialTrackFiles } from './officialTracks'

const listed = listOfficialTracks()
const firstEntry = listed.tracks[0]
const firstLoaded = firstEntry ? loadOfficialTrack(firstEntry.sourceFile) : null
const sampleJson = firstLoaded ? serializeTrack(firstLoaded.track, firstLoaded.config) : ''

describe('officialTracks', () => {
  describe('listOfficialTracks', () => {
    it('lists every valid file in tracks/ with its metadata', () => {
      expect(listed.tracks.length).toBeGreaterThan(0)
      expect(listed.invalidFiles).toHaveLength(0)

      for (const entry of listed.tracks) {
        expect(entry.sourceFile.startsWith('/tracks/')).toBe(true)
        expect(entry.name.length).toBeGreaterThan(0)
        expect(entry.name.endsWith('.json')).toBe(false)
        expect(entry.gateCount).toBeGreaterThan(0)
        expect(entry.fieldSize.width).toBeGreaterThan(0)
        expect(entry.fieldSize.height).toBeGreaterThan(0)
      }
    })

    it('returns a stable sort order across calls', () => {
      const first = listOfficialTracks().tracks.map((track) => track.sourceFile)
      const second = listOfficialTracks().tracks.map((track) => track.sourceFile)

      expect(first).toEqual(second)
    })
  })

  describe('loadOfficialTrack', () => {
    it('loads every listed file under its file name', () => {
      for (const entry of listed.tracks) {
        const loaded = loadOfficialTrack(entry.sourceFile)

        expect(loaded).not.toBeNull()
        expect(loaded?.track.name).toBe(entry.name)
        expect(loaded?.track.name).toBe(entry.sourceFile.split('/').pop()?.replace(/\.json$/i, ''))
        expect(loaded?.track.gates).toHaveLength(entry.gateCount)
        expect(loaded?.config).toBeDefined()
      }
    })

    it('derives the track id from the file, not from the exported id', () => {
      const loaded = loadOfficialTrack(firstEntry.sourceFile)

      expect(loaded?.track.id).toBe(`official:${firstEntry.sourceFile}`)
    })

    it('gives every listed track a unique id, even when files share one embedded id', () => {
      const ids = listed.tracks.map((track) => loadOfficialTrack(track.sourceFile)?.track.id)

      expect(ids.every((id) => typeof id === 'string')).toBe(true)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('returns null for an unknown file', () => {
      expect(loadOfficialTrack('/tracks/gibt-es-nicht.json')).toBeNull()
    })
  })

  describe('parseOfficialTrackFiles', () => {
    it('keeps valid files and reports broken ones without throwing', () => {
      const result = parseOfficialTrackFiles({
        '/tracks/kaputt.json': '{ kein json',
        '/tracks/gut.json': sampleJson,
      })

      expect(result.tracks).toHaveLength(1)
      expect(result.tracks[0].sourceFile).toBe('/tracks/gut.json')
      expect(result.invalidFiles).toHaveLength(1)
      expect(result.invalidFiles[0].sourceFile).toBe('/tracks/kaputt.json')
      expect(result.invalidFiles[0].message.length).toBeGreaterThan(0)
    })

    it('lists every file even when the exports share one embedded track id', () => {
      const result = parseOfficialTrackFiles({
        '/tracks/Last 16.10.26.json': sampleJson,
        '/tracks/Last 21.08.26.json': sampleJson,
      })

      expect(result.invalidFiles).toHaveLength(0)
      // Newest first: 16 October 2026 sits above 21 August 2026.
      expect(result.tracks.map((track) => track.name)).toEqual([
        'Last 16.10.26',
        'Last 21.08.26',
      ])
      expect(result.tracks[0].sourceFile).toBe('/tracks/Last 16.10.26.json')
    })

    it('orders mixed date styles by their date, newest first', () => {
      const result = parseOfficialTrackFiles({
        '/tracks/Last 24.04.26.json': sampleJson,
        '/tracks/2026.10.02.json': sampleJson,
        '/tracks/Last 21.08.26.json': sampleJson,
      })

      expect(result.tracks.map((track) => track.name)).toEqual([
        '2026.10.02',
        'Last 21.08.26',
        'Last 24.04.26',
      ])
    })

    it('puts files without a date after the dated ones, alphabetically', () => {
      const result = parseOfficialTrackFiles({
        '/tracks/zebra.json': sampleJson,
        '/tracks/2026.04.24.json': sampleJson,
        '/tracks/alpha.json': sampleJson,
      })

      expect(result.tracks.map((track) => track.name)).toEqual(['2026.04.24', 'zebra', 'alpha'])
    })

    it('names every track after its file, including spaces and dots', () => {
      const result = parseOfficialTrackFiles({ '/tracks/Last 02.10.26.json': sampleJson })

      expect(result.tracks).toHaveLength(1)
      expect(result.tracks[0].name).toBe('Last 02.10.26')
    })
  })
})
