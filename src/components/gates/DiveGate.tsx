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
const BASE_SIZE = 1.2

export function DiveGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const s = BASE_SIZE
  const half = s / 2
  const color = isSelected ? '#f472b6' : '#ec4899'
  const emissiveColor = isSelected ? '#22d3ee' : '#000000'
  const emissiveIntensity = isSelected ? 0.8 : 0

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >


      {/* Four vertical edges */}
      {/* Front-left */}
      <mesh position={[-half, half, half]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, s, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Front-right */}
      <mesh position={[half, half, half]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, s, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Back-left */}
      <mesh position={[-half, half, -half]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, s, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Back-right */}
      <mesh position={[half, half, -half]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, s, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Top connecting edges — open at bottom */}
      {/* Front */}
      <mesh position={[0, s, half]} onClick={onClick}>
        <boxGeometry args={[s + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Back */}
      <mesh position={[0, s, -half]} onClick={onClick}>
        <boxGeometry args={[s + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Left */}
      <mesh position={[-half, s, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, POST_THICKNESS, s + POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Right */}
      <mesh position={[half, s, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, POST_THICKNESS, s + POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
