import { useRef } from 'react'
import type { Mesh } from 'three'
import { GateEntryIndicator } from './GateEntryIndicator'
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
const STACK_DISTANCE = BASE_HEIGHT
function GateFrame({ y, width, height, color, emissiveColor, emissiveIntensity, onClick }: {
  y: number; width: number; height: number; color: string; emissiveColor: string; emissiveIntensity: number; onClick?: (e: ThreeEvent<MouseEvent>) => void
}) {
  return (
    <group position={[0, y, 0]}>
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
    </group>
  )
}

export function LadderGate({ position, rotation, size, isSelected, onClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const scale = size
  const width = BASE_WIDTH * scale
  const height = BASE_HEIGHT * scale
  const color = isSelected ? '#fb923c' : '#f97316'
  const emissiveColor = isSelected ? '#22d3ee' : '#000000'
  const emissiveIntensity = isSelected ? 0.8 : 0
  const stackOffset = STACK_DISTANCE * scale

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      <GateFrame y={0} width={width} height={height} color={color} emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} onClick={onClick} />
      <GateFrame y={stackOffset} width={width} height={height} color={color} emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} onClick={onClick} />
      <GateFrame y={stackOffset * 2} width={width} height={height} color={color} emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} onClick={onClick} />

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateEntryIndicator width={width} height={height} onClick={onClick} />
    </group>
  )
}