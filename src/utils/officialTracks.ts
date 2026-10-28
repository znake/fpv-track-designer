import { deserializeTrack } from '../schemas/track.schema'
import type { Config, Track } from '../types'

const TRACK_MODULES = import.meta.glob<string>('/tracks/**/*.json', { query: '?raw', import: 'default', eager: true })

export interface OfficialTrackEntry {
  sourceFile: string
  name: string
  gateCount: number
  fieldSize: { width: number; height: number }
}

export interface OfficialTracksResult {
  tracks: OfficialTrackEntry[]
  invalidFiles: Array<{ sourceFile: string; message: string }>
}

interface ParsedTrackFile {
  track: Track
  config: Config
}

interface ParsedTrackFiles {
  result: OfficialTracksResult
  tracksBySourceFile: Map<string, ParsedTrackFile>
}

function fileNameOf(sourceFile: string): string {
  const segments = sourceFile.split('/')
  return segments[segments.length - 1] ?? sourceFile
}

// The file name is the only label the folder owner controls: exports keep the
// name of whichever track they were copied from, so many files share one name.
function displayNameOf(sourceFile: string): string {
  return fileNameOf(sourceFile).replace(/\.json$/i, '')
}

// Every re-save of one working track carries the same exported `track.id`, so the
// repository file is the only identity that stays unique across the folder.
function officialTrackId(sourceFile: string): string {
  return `official:${sourceFile}`
}

function parseTrackFile(content: string): ParsedTrackFile | { message: string } {
  let parsed: ReturnType<typeof deserializeTrack>

  try {
    parsed = deserializeTrack(content)
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'Unknown parse error' }
  }

  if ('error' in parsed) {
    const details = parsed.errors.map((entry) => `${entry.field}: ${entry.message}`).join('; ')
    return { message: details ? `${parsed.error} (${details})` : parsed.error }
  }

  return { track: parsed.track, config: parsed.config }
}

function parseAllFiles(files: Record<string, string>): ParsedTrackFiles {
  const invalidFiles: OfficialTracksResult['invalidFiles'] = []
  const tracksBySourceFile = new Map<string, ParsedTrackFile>()
  const entries: OfficialTrackEntry[] = []

  const sourceFiles = Object.keys(files).sort((a, b) => a.localeCompare(b))

  for (const sourceFile of sourceFiles) {
    const parsed = parseTrackFile(files[sourceFile])

    if ('message' in parsed) {
      invalidFiles.push({ sourceFile, message: parsed.message })
      continue
    }

    tracksBySourceFile.set(sourceFile, parsed)
    entries.push({
      sourceFile,
      name: displayNameOf(sourceFile),
      gateCount: parsed.track.gates.length,
      fieldSize: { width: parsed.track.fieldSize.width, height: parsed.track.fieldSize.height },
    })
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, 'de') || a.sourceFile.localeCompare(b.sourceFile))

  return { result: { tracks: entries, invalidFiles }, tracksBySourceFile }
}

export function parseOfficialTrackFiles(files: Record<string, string>): OfficialTracksResult {
  return parseAllFiles(files).result
}

export function listOfficialTracks(): OfficialTracksResult {
  return parseAllFiles(TRACK_MODULES).result
}

export function loadOfficialTrack(sourceFile: string): { track: Track; config: Config } | null {
  const parsed = parseAllFiles(TRACK_MODULES).tracksBySourceFile.get(sourceFile)
  if (!parsed) return null

  return {
    track: { ...parsed.track, id: officialTrackId(sourceFile), name: displayNameOf(sourceFile) },
    config: parsed.config,
  }
}
