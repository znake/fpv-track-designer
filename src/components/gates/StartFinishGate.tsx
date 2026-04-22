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

const POST_THICKNESS = 0.06
const BASE_WIDTH = 1.2
const BASE_HEIGHT = 1.2

export function StartFinishGate({ position, rotation, size, isSelected, onClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const scale = size
  const width = BASE_WIDTH * scale
  const height = BASE_HEIGHT * scale
  const accentColor = '#111827'
  const emissiveColor = isSelected ? '#22d3ee' : '#000000'
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
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Right post */}
      <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Top crossbar */}
      <mesh position={[0, height, 0]} onClick={onClick}>
        <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Bottom crossbar */}
      <mesh position={[0, 0, 0]} onClick={onClick}>
        <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Checkered panel on top */}
      <mesh position={[0, height + 0.25 * scale, 0]} onClick={onClick}>
        <boxGeometry args={[0.6 * scale, 0.25 * scale, 0.02]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>
    </group>
  )
}