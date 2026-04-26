import type { Gate, GateType } from '../types'
import { gateTypeOptions } from './gateTypeOptions'

/**
 * Anzahl der Stangen, aus denen ein Gate physisch zusammengebaut wird.
 *
 * Die Werte spiegeln den realen Aufbau der Gates auf einem FPV-Rennplatz wider
 * (zwei Pfosten + Querbalken = 3 Stangen für ein Standardgate, etc.).
 *
 * Dive-Gates und Tunnel-Gates lassen sich nicht aus einzelnen Stangen
 * bauen und werden daher mit 0 Stangen geführt.
 */
export const POLES_PER_GATE: Record<GateType, number> = {
  'standard': 3,
  'start-finish': 3,
  'h-gate': 4,
  'double-h': 7,
  'double': 6,
  'ladder': 9,
  'flag': 2,
  'dive': 0,
  'octagonal-tunnel': 0,
}

/**
 * Eintrag im Detail-Breakdown des Stangenzählers.
 *
 * Ein Eintrag pro tatsächlich auf der Strecke vorhandenem Gate-Typ –
 * Typen, von denen kein einziges Gate platziert ist, werden ausgelassen.
 */
export interface PoleBreakdownEntry {
  type: GateType
  /** Lokalisiertes Anzeige-Label (siehe `gateTypeOptions`). */
  label: string
  /** Anzahl Gates dieses Typs auf der Strecke. */
  count: number
  /** Stangen pro einzelnem Gate dieses Typs (`POLES_PER_GATE`). */
  polesPerGate: number
  /** count × polesPerGate. */
  subtotal: number
  /** True für Dive/Tunnel – wird im UI als "nicht aus Stangen baubar" markiert. */
  notBuildable: boolean
}

export interface PoleBreakdown {
  /** Summe aller `subtotal`-Werte – die kompakte Zahl im Badge. */
  total: number
  /** Detailaufstellung pro Gate-Typ, sortiert wie in `gateTypeOptions`. */
  entries: PoleBreakdownEntry[]
}

const GATE_TYPE_ORDER: GateType[] = gateTypeOptions.map((option) => option.type)
const GATE_TYPE_LABELS: Record<GateType, string> = gateTypeOptions.reduce(
  (acc, option) => {
    acc[option.type] = option.label
    return acc
  },
  {} as Record<GateType, string>,
)

/**
 * Berechnet die Stangenkalkulation für eine Liste von Gates.
 *
 * Die Reihenfolge der Einträge folgt `gateTypeOptions`, damit die Anzeige
 * deterministisch und konsistent zum restlichen UI ist.
 */
export function calculatePoleBreakdown(gates: Gate[]): PoleBreakdown {
  const counts = new Map<GateType, number>()

  for (const gate of gates) {
    counts.set(gate.type, (counts.get(gate.type) ?? 0) + 1)
  }

  const entries: PoleBreakdownEntry[] = []
  let total = 0

  for (const type of GATE_TYPE_ORDER) {
    const count = counts.get(type) ?? 0
    if (count === 0) continue

    const polesPerGate = POLES_PER_GATE[type]
    const subtotal = count * polesPerGate
    total += subtotal

    entries.push({
      type,
      label: GATE_TYPE_LABELS[type],
      count,
      polesPerGate,
      subtotal,
      notBuildable: polesPerGate === 0,
    })
  }

  return { total, entries }
}
