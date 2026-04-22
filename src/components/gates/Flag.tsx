import { useRef } from 'react'
import type { Mesh } from 'three'
import type { ThreeEvent } from '@react-three/fiber'

interface GateComponentProps {
  position: { x: number; y: number; z: number }
  rotation: number
  size: 0.75 | 1 | 1.5
  isSelected?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

const POLE_THICKNESS = 0.06
const BASE_HEIGHT = 2

export function Flag({ position, rotation, size, isSelected, onClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const scale = size
  const height = BASE_HEIGHT * scale
  const color = isSelected ? '#f87171' : '#ef4444'
  const emissiveColor = isSelected ? '#22d3ee' : '#000000'
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
        <meshStandardMaterial color="#6b7280" emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Triangular flag */}
      <mesh position={[0.15 * scale, height - 0.15 * scale, 0]} onClick={onClick}>
        <boxGeometry args={[0.3 * scale, 0.2 * scale, 0.02]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
    </group>
  )
}