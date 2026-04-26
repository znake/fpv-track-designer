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

const POST_THICKNESS = 0.06
const BASE_WIDTH = 1.2
const BASE_HEIGHT = 1.2

export function StandardGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const width = BASE_WIDTH
  const height = BASE_HEIGHT
  const color = isSelected ? '#9DD9C5' : '#7EC8B0'
  const emissiveColor = isSelected ? '#FFD27A' : '#000000'
  const emissiveIntensity = isSelected ? 0.8 : 0

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Left post */}
      <mesh position={[-width / 2, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Right post */}
      <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Top crossbar */}
      <mesh position={[0, height, 0]} onClick={onClick}>
        <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>


      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
