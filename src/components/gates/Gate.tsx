import type { Gate as GateType } from '../../types'
import { useGateSelection } from '../../hooks/useGateSelection'
import { StandardGate } from './StandardGate'
import { HGate } from './HGate'
import { HuerdelGate } from './HuerdelGate'
import { Doppelgate } from './Doppelgate'
import { LadderGate } from './LadderGate'
import { StartFinishGate } from './StartFinishGate'
import { Flag } from './Flag'

interface GateProps {
  gate: GateType
}

export function Gate({ gate }: GateProps) {
  const { isSelected, handleClick } = useGateSelection(gate.id)

  const commonProps = {
    position: gate.position,
    rotation: gate.rotation,
    size: gate.size,
    isSelected,
    onClick: handleClick,
  }

  switch (gate.type) {
    case 'h-gate':
      return <HGate {...commonProps} />
    case 'huerdel':
      return <HuerdelGate {...commonProps} />
    case 'doppelgate':
      return <Doppelgate {...commonProps} />
    case 'ladder':
      return <LadderGate {...commonProps} />
    case 'start-finish':
      return <StartFinishGate {...commonProps} />
    case 'flag':
      return <Flag {...commonProps} />
    case 'standard':
    default:
      return <StandardGate {...commonProps} />
  }
}