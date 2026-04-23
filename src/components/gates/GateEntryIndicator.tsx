import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

interface GateEntryIndicatorProps {
  width: number
  height: number
  zPosition?: number
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

/**
 * Transparent entry/exit indicator planes filling the gate opening.
 * Green on the entry side (front, -Z), red on the back side (+Z).
 * Makes it immediately clear which side to approach the gate from.
 */
export function GateEntryIndicator({ width, height, zPosition = 0, onClick }: GateEntryIndicatorProps) {
  const y = height / 2

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
    </group>
  )
}
