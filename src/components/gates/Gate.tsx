import type { ThreeEvent } from '@react-three/fiber'
import type { Gate as GateType } from '../../types'
import { useGateSelection } from '../../hooks/useGateSelection'
import { useAppStore } from '../../store'
import { StandardGate } from './StandardGate'
import { HGate } from './HGate'
import { DoubleHGate } from './DoubleHGate'
import { DiveGate } from './DiveGate'
import { DoubleGate } from './DoubleGate'
import { LadderGate } from './LadderGate'
import { StartFinishGate } from './StartFinishGate'
import { Flag } from './Flag'
import { GateHandles } from './GateHandles'

interface GateProps {
  gate: GateType
  openingLabels?: Record<string, string>
  showOpeningLabels?: boolean
}

export function Gate({ gate, openingLabels, showOpeningLabels = true }: GateProps) {
  const { isSelected, handleClick } = useGateSelection(gate.id)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)
  const toggleGateDirection = useAppStore((state) => state.toggleGateDirection)
  const selectGate = useAppStore((state) => state.selectGate)

  const handleOpeningClick = (openingId: string, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate) return

    if (!isSelected) {
      selectGate(gate.id)
      return
    }

    toggleGateDirection(gate.id, openingId)
  }

  const commonProps = {
    position: gate.position,
    rotation: gate.rotation,
    size: gate.size,
    openings: showOpeningLabels ? gate.openings : [],
    openingLabels: showOpeningLabels ? openingLabels : undefined,
    isSelected,
    onClick: handleClick,
    onOpeningClick: showOpeningLabels ? handleOpeningClick : undefined,
  }

  let gateComponent: React.ReactNode
  switch (gate.type) {
    case 'h-gate':
      gateComponent = <HGate {...commonProps} gateId={gate.id} />
      break
    case 'double-h':
      gateComponent = <DoubleHGate {...commonProps} gateId={gate.id} />
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
