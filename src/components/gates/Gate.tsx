import { useEffect, useRef, type ReactNode } from 'react'
import type { Group, Mesh, Object3D } from 'three'
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
import { OctagonalTunnelGate } from './OctagonalTunnelGate'
import { GateHandles } from './GateHandles'

interface GateProps {
  gate: GateType
  openingLabels?: Record<string, string>
  showOpeningLabels?: boolean
}

export function Gate({ gate, openingLabels, showOpeningLabels = true }: GateProps) {
  const shadowGroupRef = useRef<Group>(null)
  const { isSelected, handleClick } = useGateSelection(gate.id)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const toggleGateDirection = useAppStore((state) => state.toggleGateDirection)
  const selectGate = useAppStore((state) => state.selectGate)
  const openSequenceEditor = useAppStore((state) => state.openSequenceEditor)

  const handleOpeningClick = (openingId: string, e: ThreeEvent<globalThis.MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate) return

    if (!isSelected) {
      selectGate(gate.id)
    }

    toggleGateDirection(gate.id, openingId)
  }

  const handleOpeningLabelClick = (openingId: string, sequenceNumber: number, e: ThreeEvent<globalThis.MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate) return

    if (!isSelected) {
      selectGate(gate.id)
    }

    const sequenceLength = currentTrack?.gateSequence.length ?? 0
    if (sequenceLength === 0) return

    openSequenceEditor({
      gateId: gate.id,
      openingId,
      sourceSequenceNumber: sequenceNumber,
    })
  }

  const commonProps = {
    position: gate.position,
    rotation: gate.rotation,
    openings: showOpeningLabels ? gate.openings : [],
    openingLabels: showOpeningLabels ? openingLabels : undefined,
    isSelected,
    onClick: handleClick,
    onOpeningClick: showOpeningLabels ? handleOpeningClick : undefined,
    onOpeningLabelClick: showOpeningLabels ? handleOpeningLabelClick : undefined,
  }

  let gateComponent: ReactNode
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
    case 'octagonal-tunnel':
      gateComponent = <OctagonalTunnelGate {...commonProps} />
      break
    case 'standard':
    default:
      gateComponent = <StandardGate {...commonProps} />
      break
  }

  // Mark every mesh inside the gate as a shadow caster on mount/update.
  // Cheaper than threading castShadow through 8 gate components by hand.
  useEffect(() => {
    const root = shadowGroupRef.current
    if (!root) return

    const hasNoShadowCast = (object: Object3D) => {
      let current: Object3D | null = object

      while (current) {
        if (current.userData.noShadowCast === true) {
          return true
        }
        current = current.parent
      }

      return false
    }

    root.traverse((obj) => {
      const mesh = obj as Mesh
      if (mesh.isMesh) {
        mesh.castShadow = !hasNoShadowCast(mesh)
      }
    })
  })

  return (
    <group ref={shadowGroupRef}>
      {gateComponent}
      {isSelected && (
        <GateHandles
          gateId={gate.id}
          gateType={gate.type}
          position={gate.position}
          rotation={gate.rotation}
        />
      )}
    </group>
  )
}
