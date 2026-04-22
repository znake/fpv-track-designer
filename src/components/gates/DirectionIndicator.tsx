import type { ThreeEvent } from '@react-three/fiber'

interface DirectionIndicatorProps {
  size: 0.75 | 1 | 1.5
  yPosition: number
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

/**
 * Arrow indicator on the front (entry) side of a gate.
 * Points INTO the gate (+Z local direction) to show the fly-through direction.
 * Positioned on the -Z side (entry side) of the gate frame.
 */
export function DirectionIndicator({ size, yPosition, onClick }: DirectionIndicatorProps) {
  const arrowRadius = 0.12 * size
  const arrowHeight = 0.25 * size

  return (
    <mesh
      position={[0, yPosition, -0.07]}
      rotation={[Math.PI / 2, 0, 0]}
      onClick={onClick}
    >
      <coneGeometry args={[arrowRadius, arrowHeight, 4]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.3}
        transparent
        opacity={0.7}
      />
    </mesh>
  )
}