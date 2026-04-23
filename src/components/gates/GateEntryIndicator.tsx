import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

interface GateEntryIndicatorProps {
  width: number
  height: number
  baseY?: number
  zPosition?: number
  label?: string
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

/**
 * Transparent entry/exit indicator planes filling the gate opening.
 * Green on the entry side (front, -Z), red on the back side (+Z).
 * Makes it immediately clear which side to approach the gate from.
 */
export function GateEntryIndicator({ width, height, baseY = 0, zPosition = 0, label, onClick }: GateEntryIndicatorProps) {
  const y = baseY + height / 2
  const lines = label?.split('\n') ?? []
  const lineCount = Math.max(lines.length, 1)
  const widestLineLength = Math.max(...lines.map((line) => line.length), 1)
  const fontSize = Math.min((width * 0.7) / widestLineLength, (height * 0.72) / lineCount)
  const entryLabelColor = '#bbf7d0'
  const exitLabelColor = '#fecaca'
  const entryOutlineColor = '#4ade80'
  const exitOutlineColor = '#f87171'

  return (
    <group>
      {/* Entry side — green (approach from here) */}
      <mesh position={[0, y, zPosition - 0.02]} onClick={onClick}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#16a34a"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Exit side — red (do not approach from here) */}
      <mesh position={[0, y, zPosition + 0.02]} onClick={onClick}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#ef4444"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {label && (
        <>
          <group position={[0, y, zPosition - 0.03]} rotation={[0, Math.PI, 0]}>
            <Text
              color={entryLabelColor}
              fontSize={fontSize}
              maxWidth={width * 0.78}
              lineHeight={0.9}
              anchorX="center"
              anchorY="middle"
              outlineWidth={fontSize * 0.025}
              outlineColor={entryOutlineColor}
              fillOpacity={0.72}
              material-side={THREE.FrontSide}
              renderOrder={2}
              onClick={onClick}
            >
              {label}
            </Text>
          </group>

          <group position={[0, y, zPosition + 0.03]}>
            <Text
              color={exitLabelColor}
              fontSize={fontSize}
              maxWidth={width * 0.78}
              lineHeight={0.9}
              anchorX="center"
              anchorY="middle"
              outlineWidth={fontSize * 0.025}
              outlineColor={exitOutlineColor}
              fillOpacity={0.72}
              material-side={THREE.FrontSide}
              renderOrder={2}
              onClick={onClick}
            >
              {label}
            </Text>
          </group>
        </>
      )}
    </group>
  )
}
