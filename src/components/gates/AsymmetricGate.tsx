import { useRef } from 'react'
import type { Mesh } from 'three'
import { GateEntryIndicator } from './GateEntryIndicator'
import type { ThreeEvent } from '@react-three/fiber'

interface GateComponentProps {
  position: { x: number; y: number; z: number }
  rotation: number
  size: 0.75 | 1 | 1.5
  gateLabel?: string
  isSelected?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

const POST_THICKNESS = 0.06
const BASE_WIDTH = 1.2
const BASE_HEIGHT = 1.2
const STACK_DISTANCE = BASE_HEIGHT

export function AsymmetricGate({ position, rotation, size, gateLabel, isSelected, onClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const scale = size
  const width = BASE_WIDTH * scale
  const height = BASE_HEIGHT * scale
  const color = isSelected ? '#a78bfa' : '#8b5cf6'
  const emissiveColor = isSelected ? '#22d3ee' : '#000000'
  const emissiveIntensity = isSelected ? 0.8 : 0
  const stackOffset = STACK_DISTANCE * scale

  // The top H-gate is offset to the right by half the gate width,
  // so its left post sits on the top crossbar of the bottom gate.
  const hGateOffsetX = 0

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Bottom standard gate */}
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
      </group>

      {/* Top H-gate — offset to the right so left post sits on bottom gate's top bar */}
      <group position={[hGateOffsetX, stackOffset, 0]}>
        {/* Left post — tall stroke of the 'h' */}
        <mesh position={[-width / 2, height, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height * 2, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        {/* Right post — normal height */}
        <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        {/* Top crossbar at normal gate height */}
        <mesh position={[0, height, 0]} onClick={onClick}>
          <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        {/* Bottom crossbar */}
      </group>

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateEntryIndicator width={width} height={height} label={gateLabel} onClick={onClick} />
      <GateEntryIndicator width={width} height={height} baseY={stackOffset} label={gateLabel} onClick={onClick} />
    </group>
  )
}
