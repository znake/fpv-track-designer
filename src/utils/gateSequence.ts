import type { Gate, GateSequenceItem } from '../types'
import { getPrimaryOpeningId, normalizeGates } from './gateOpenings'

type RawGateSequenceItem = string | GateSequenceItem

const LADDER_OPENING_ORDER = ['lower', 'middle', 'upper'] as const
const DOUBLE_H_OPENING_ORDER = ['lower', 'middle', 'upper'] as const

function buildOpeningsSequence(gate: Gate, openingIds: readonly string[]): GateSequenceItem[] {
  const entries: GateSequenceItem[] = []

  for (const openingId of openingIds) {
    const opening = gate.openings.find((candidate) => candidate.id === openingId)
    if (!opening) return []

    entries.push({ gateId: gate.id, openingId: opening.id, reverse: Boolean(opening.reverse) })
  }

  return entries
}

function getOpeningReverse(gate: Gate, openingId: string): boolean {
  return Boolean(gate.openings.find((opening) => opening.id === openingId)?.reverse)
}

function isSameSequenceItem(a: GateSequenceItem, b: GateSequenceItem): boolean {
  return a.gateId === b.gateId && a.openingId === b.openingId && Boolean(a.reverse) === Boolean(b.reverse)
}

function shouldInsertDoubleHMiddlePass(previous: GateSequenceItem | undefined, current: GateSequenceItem, gate: Gate | undefined): boolean {
  if (!previous || !gate || gate.type !== 'double-h' || previous.gateId !== current.gateId) {
    return false
  }

  const openingIds = new Set([previous.openingId, current.openingId])
  return openingIds.has('lower') && openingIds.has('upper')
}

function insertMissingDoubleHMiddlePasses(sequence: GateSequenceItem[], gateMap: Map<string, Gate>): GateSequenceItem[] {
  const expanded: GateSequenceItem[] = []
  const gatesWithExistingMiddlePass = new Set(
    sequence
      .filter((entry) => entry.openingId === 'middle')
      .map((entry) => entry.gateId),
  )

  for (const item of sequence) {
    const previous = expanded[expanded.length - 1]
    const gate = gateMap.get(item.gateId)

    if (shouldInsertDoubleHMiddlePass(previous, item, gate) && !gatesWithExistingMiddlePass.has(item.gateId)) {
      const middleOpening = gate?.openings.find((opening) => opening.id === 'middle')
      if (middleOpening) {
        expanded.push({ gateId: item.gateId, openingId: middleOpening.id, reverse: Boolean(middleOpening.reverse) })
      }
    }

    expanded.push(item)
  }

  return expanded
}

function normalizeSequenceItem(item: RawGateSequenceItem, gateMap: Map<string, Gate>): GateSequenceItem[] {
  if (typeof item === 'string') {
    const gate = gateMap.get(item)
    if (!gate) return []

    return buildDefaultGateSequenceEntries(gate)
  }

  const gate = gateMap.get(item.gateId)
  if (!gate) return []

  const openingId = gate.openings.some((opening) => opening.id === item.openingId)
    ? item.openingId
    : getPrimaryOpeningId(gate)

  return [{
    gateId: item.gateId,
    openingId,
    reverse: Boolean(item.reverse),
  }]
}

export function buildFallbackGateSequence(gates: Gate[]): GateSequenceItem[] {
  return gates.flatMap(buildDefaultGateSequenceEntries)
}

export function buildDefaultGateSequenceEntries(gate: Gate): GateSequenceItem[] {
  if (gate.type === 'h-gate') {
    const lowerOpening = gate.openings.find((opening) => opening.id === 'lower')
    const backrestPassOpening = gate.openings.find((opening) => opening.id === 'backrest-pass')

    if (lowerOpening && backrestPassOpening) {
      return [
        { gateId: gate.id, openingId: lowerOpening.id, reverse: Boolean(lowerOpening.reverse) },
        { gateId: gate.id, openingId: backrestPassOpening.id, reverse: Boolean(backrestPassOpening.reverse) },
      ]
    }
  }

  if (gate.type === 'double') {
    const lowerOpening = gate.openings.find((opening) => opening.id === 'lower')
    const upperOpening = gate.openings.find((opening) => opening.id === 'upper')

    if (lowerOpening && upperOpening) {
      return [
        { gateId: gate.id, openingId: lowerOpening.id, reverse: Boolean(lowerOpening.reverse) },
        { gateId: gate.id, openingId: upperOpening.id, reverse: Boolean(upperOpening.reverse) },
      ]
    }
  }

  if (gate.type === 'dive') {
    const entryOpening = gate.openings.find((opening) => opening.id === 'entry-top') ?? gate.openings[0]
    const exitOpening = gate.openings.find((opening) => opening.id.startsWith('exit-') && opening.id !== entryOpening?.id) ?? gate.openings[1]

    if (entryOpening && exitOpening) {
      return [
        { gateId: gate.id, openingId: entryOpening.id, reverse: Boolean(entryOpening.reverse) },
        { gateId: gate.id, openingId: exitOpening.id, reverse: Boolean(exitOpening.reverse) },
      ]
    }
  }

  if (gate.type === 'ladder') {
    const ladderEntries = buildOpeningsSequence(gate, LADDER_OPENING_ORDER)

    if (ladderEntries.length > 0) {
      return ladderEntries
    }
  }

  if (gate.type === 'double-h') {
    const doubleHEntries = buildOpeningsSequence(gate, DOUBLE_H_OPENING_ORDER)

    if (doubleHEntries.length > 0) {
      return doubleHEntries
    }
  }

  return [{
    gateId: gate.id,
    openingId: getPrimaryOpeningId(gate),
    reverse: getOpeningReverse(gate, getPrimaryOpeningId(gate)),
  }]
}

export function normalizeGateSequence(sequence: RawGateSequenceItem[] | undefined, gates: Gate[]): GateSequenceItem[] {
  const normalizedGates = normalizeGates(gates)
  const gateMap = new Map(normalizedGates.map((gate) => [gate.id, gate]))
  const source = Array.isArray(sequence) && sequence.length > 0 ? sequence : buildFallbackGateSequence(normalizedGates)
  const normalized: GateSequenceItem[] = []

  for (const item of source) {
    const normalizedItems = normalizeSequenceItem(item, gateMap)

    for (const normalizedItem of normalizedItems) {
      const previous = normalized[normalized.length - 1]
      if (previous && isSameSequenceItem(previous, normalizedItem)) continue

      normalized.push(normalizedItem)
    }
  }

  const expanded = insertMissingDoubleHMiddlePasses(normalized, gateMap)

  if (expanded.length > 1 && isSameSequenceItem(expanded[0], expanded[expanded.length - 1])) {
    expanded.pop()
  }

  return expanded.length > 0 ? expanded : buildFallbackGateSequence(normalizedGates)
}
