import { useRef } from 'react'
import type { Mesh } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { DirectionIndicator } from './DirectionIndicator'

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
const STACK_DISTANCE = 2
export function Doppelgate({ position, rotation, size, isSelected, onClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const scale = size
  const width = BASE_WIDTH * scale
  const height = BASE_HEIGHT * scale
  const color = isSelected ? '#4ade80' : '#22c55e'
  const emissiveColor = isSelected ? '#22d3ee' : '#000000'
  const emissiveIntensity = isSelected ? 0.8 : 0
  const stackOffset = STACK_DISTANCE * scale

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Bottom gate */}
      <group position={[0, 0, 0]}>
        <mesh position={[-width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[0, height, 0]} onClick={onClick}>
          <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[0, 0, 0]} onClick={onClick}>
          <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
      </group>

      {/* Top gate */}
      <group position={[0, stackOffset, 0]}>
        <mesh position={[-width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[0, height, 0]} onClick={onClick}>
          <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[0, 0, 0]} onClick={onClick}>
          <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
      </group>

      {/* Direction indicator — arrow on entry side */}
      <DirectionIndicator size={size} yPosition={height / 2} onClick={onClick} />
    </group>
  )
}