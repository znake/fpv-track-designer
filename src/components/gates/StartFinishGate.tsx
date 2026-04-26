import { useRef } from 'react'
import { Text } from '@react-three/drei'
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
const PANEL_WIDTH = 0.6
const PANEL_HEIGHT = 0.25
const PANEL_DEPTH = 0.02
const PANEL_TEXT = 'Start'

export function StartFinishGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const width = BASE_WIDTH
  const height = BASE_HEIGHT
  const accentColor = '#F5F5F5'
  const textColor = '#111827'
  const emissiveColor = isSelected ? '#FFD27A' : '#000000'
  const emissiveIntensity = isSelected ? 0.8 : 0
  const panelY = height + 0.25
  const panelTextZ = PANEL_DEPTH / 2 + 0.006

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


      {/* Start panel on top */}
      <mesh position={[0, panelY, 0]} onClick={onClick}>
        <boxGeometry args={[PANEL_WIDTH, PANEL_HEIGHT, PANEL_DEPTH]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      <Text
        position={[0, panelY, panelTextZ]}
        color={textColor}
        fontSize={0.13}
        maxWidth={PANEL_WIDTH * 0.86}
        anchorX="center"
        anchorY="middle"
        onClick={onClick}
      >
        {PANEL_TEXT}
      </Text>

      <Text
        position={[0, panelY, -panelTextZ]}
        rotation-y={Math.PI}
        color={textColor}
        fontSize={0.13}
        maxWidth={PANEL_WIDTH * 0.86}
        anchorX="center"
        anchorY="middle"
        onClick={onClick}
      >
        {PANEL_TEXT}
      </Text>

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
