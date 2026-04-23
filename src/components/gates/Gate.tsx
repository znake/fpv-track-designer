import type { Gate as GateType } from '../../types'
import { useGateSelection } from '../../hooks/useGateSelection'
import { StandardGate } from './StandardGate'
import { HGate } from './HGate'
import { AsymmetricGate } from './AsymmetricGate'
import { DiveGate } from './DiveGate'
import { DoubleGate } from './DoubleGate'
import { LadderGate } from './LadderGate'
import { StartFinishGate } from './StartFinishGate'
import { Flag } from './Flag'
import { GateHandles } from './GateHandles'

interface GateProps {
  gate: GateType
  label?: string
}

export function Gate({ gate, label }: GateProps) {
  const { isSelected, handleClick } = useGateSelection(gate.id)

  const commonProps = {
    position: gate.position,
    rotation: gate.rotation,
    size: gate.size,
    gateLabel: label,
    isSelected,
    onClick: handleClick,
  }

  let gateComponent: React.ReactNode
  switch (gate.type) {
    case 'h-gate':
      gateComponent = <HGate {...commonProps} />
      break
    case 'asymmetric':
      gateComponent = <AsymmetricGate {...commonProps} />
      break
    case 'dive':
      gateComponent = <DiveGate {...commonProps} />
      break
    case 'double':
      gateComponent = <DoubleGate {...commonProps} />
      break
    case 'ladder':
      gateComponent = <LadderGate {...commonProps} />
      break
    case 'start-finish':
      gateComponent = <StartFinishGate {...commonProps} />
      break
    case 'flag':
      gateComponent = <Flag {...commonProps} />
      break
    case 'standard':
    default:
      gateComponent = <StandardGate {...commonProps} />
      break
  }

  return (
    <group>
      {gateComponent}
      {isSelected && (
        <GateHandles
          gateId={gate.id}
          position={gate.position}
          rotation={gate.rotation}
        />
      )}
    </group>
  )
}
