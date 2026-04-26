import { useRef } from 'react'
import type { Mesh } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { GateOpening } from '../../types'
import { GATE_BASE_HEIGHT, GATE_BASE_WIDTH, GATE_POST_THICKNESS } from '../../constants/gateDimensions'
import { getHGateBackrestSide } from '../../utils/gateOpenings'
import { GateOpeningIndicators } from './GateOpeningIndicators'

interface GateComponentProps {
  gateId: string
  position: { x: number; y: number; z: number }
  rotation: number
  openings: GateOpening[]
  openingLabels?: Record<string, string>
  isSelected?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onOpeningClick?: (openingId: string, e: ThreeEvent<MouseEvent>) => void
  onOpeningLabelClick?: (openingId: string, sequenceNumber: number, e: ThreeEvent<MouseEvent>) => void
}

const POST_THICKNESS = GATE_POST_THICKNESS
const BASE_WIDTH = GATE_BASE_WIDTH
const BASE_HEIGHT = GATE_BASE_HEIGHT
const STACK_DISTANCE = BASE_HEIGHT
const BACKREST_HEIGHT_MULTIPLIER = 1.85

export function DoubleHGate({ gateId, position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const width = BASE_WIDTH
  const height = BASE_HEIGHT
  const backrestHeight = height * BACKREST_HEIGHT_MULTIPLIER
  const backrestSide = getHGateBackrestSide(gateId)
  const backrestX = backrestSide * width / 2
  const color = isSelected ? '#B560F5' : '#9333EA'
  const emissiveColor = isSelected ? '#FFD27A' : '#000000'
  const emissiveIntensity = isSelected ? 0.8 : 0
  const stackOffset = STACK_DISTANCE

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Bottom standard gate: first fly-through opening */}
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

      {/* Top H-gate: middle fly-through plus side-defining upper backrest pass */}
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

        <mesh position={[backrestX, height + (backrestHeight - height) / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, backrestHeight - height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
      </group>

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
