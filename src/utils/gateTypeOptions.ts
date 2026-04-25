import type { GateType } from '@/types'

export const gateTypeOptions: { type: GateType; label: string }[] = [
  { type: 'start-finish', label: 'Start/Ziel-Tor' },
  { type: 'standard', label: 'Standard-Tor' },
  { type: 'h-gate', label: 'H-Tor' },
  { type: 'double-h', label: 'Doppel-H-Tor' },
  { type: 'dive', label: 'Dive-Tor' },
  { type: 'double', label: 'Doppeltor' },
  { type: 'ladder', label: 'Leitertor' },
  { type: 'flag', label: 'Flaggen-Tor' },
]
