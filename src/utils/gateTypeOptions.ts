import type { GateType } from '@/types'

export const gateTypeOptions: { type: GateType; label: string }[] = [
  { type: 'start-finish', label: 'Start/Ziel-Gate' },
  { type: 'standard', label: 'Standard-Gate' },
  { type: 'h-gate', label: 'h-Gate' },
  { type: 'double-h', label: 'Doppel-h-Gate' },
  { type: 'dive', label: 'Dive-Gate' },
  { type: 'double', label: 'Doppel-Gate' },
  { type: 'ladder', label: 'Leiter-Gate' },
  { type: 'flag', label: 'Flaggen-Gate' },
  { type: 'octagonal-tunnel', label: 'Tunnel' },
]
