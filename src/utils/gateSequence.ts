import type { Gate, GateSequenceItem } from '../types'
import { getPrimaryOpeningId } from './gateOpenings'

type RawGateSequenceItem = string | GateSequenceItem

function isSameSequenceItem(a: GateSequenceItem, b: GateSequenceItem): boolean {
  return a.gateId === b.gateId && a.openingId === b.openingId && Boolean(a.reverse) === Boolean(b.reverse)
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
        { gateId: gate.id, openingId: lowerOpening.id, reverse: false },
        { gateId: gate.id, openingId: backrestPassOpening.id, reverse: false },
      ]
    }
  }

  if (gate.type === 'double') {
    const lowerOpening = gate.openings.find((opening) => opening.id === 'lower')
    const upperOpening = gate.openings.find((opening) => opening.id === 'upper')

    if (lowerOpening && upperOpening) {
      return [
        { gateId: gate.id, openingId: lowerOpening.id, reverse: false },
        { gateId: gate.id, openingId: upperOpening.id, reverse: false },
      ]
    }
  }

  return [{
    gateId: gate.id,
    openingId: getPrimaryOpeningId(gate),
    reverse: false,
  }]
}

export function normalizeGateSequence(sequence: RawGateSequenceItem[] | undefined, gates: Gate[]): GateSequenceItem[] {
  const gateMap = new Map(gates.map((gate) => [gate.id, gate]))
  const source = Array.isArray(sequence) && sequence.length > 0 ? sequence : buildFallbackGateSequence(gates)
  const normalized: GateSequenceItem[] = []

  for (const item of source) {
    const normalizedItems = normalizeSequenceItem(item, gateMap)

    for (const normalizedItem of normalizedItems) {
      const previous = normalized[normalized.length - 1]
      if (previous && isSameSequenceItem(previous, normalizedItem)) continue

      normalized.push(normalizedItem)
    }
  }

  if (normalized.length > 1 && isSameSequenceItem(normalized[0], normalized[normalized.length - 1])) {
    normalized.pop()
  }

  return normalized.length > 0 ? normalized : buildFallbackGateSequence(gates)
}
