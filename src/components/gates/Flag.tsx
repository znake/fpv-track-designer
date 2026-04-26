import { useRef } from 'react'
import type { Mesh } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { GateOpening } from '../../types'
import { GateOpeningIndicators } from './GateOpeningIndicators'

interface GateComponentProps {
  position: { x: number; y: number; z: number }
  rotation: number
  openings: GateOpening[]
  openingLabels?: Record<string, string>
  isSelected?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onOpeningClick?: (openingId: string, e: ThreeEvent<MouseEvent>) => void
  onOpeningLabelClick?: (openingId: string, sequenceNumber: number, e: ThreeEvent<MouseEvent>) => void
}

const POLE_THICKNESS = 0.06
const BASE_HEIGHT = 2

export function Flag({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const height = BASE_HEIGHT
  const color = isSelected ? '#FFA8A8' : '#FF8B8B'
  const emissiveColor = isSelected ? '#FFD27A' : '#000000'
  const emissiveIntensity = isSelected ? 0.8 : 0

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Vertical pole */}
      <mesh position={[0, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POLE_THICKNESS, height, POLE_THICKNESS]} />
        <meshStandardMaterial color="#A38B6F" emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Triangular flag */}
      <mesh position={[0.15, height - 0.15, 0]} onClick={onClick}>
        <boxGeometry args={[0.3, 0.2, 0.02]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />

    </group>
  )
}
