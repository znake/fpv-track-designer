import { useMemo } from 'react'
import { Color } from 'three'
import type { VenueObstacle } from '../../types/venue'

interface VenueObstaclesProps {
  obstacles: VenueObstacle[]
  color: string
}

const CAP_OVERHANG = 0.08
const CAP_HEIGHT = 0.08
const CAP_DARKEN_FACTOR = 0.78

/**
 * Renders the fixed obstacles (e.g. hall pillars) of the active venue preset.
 * Props-only and store-free so the read-only share viewer can render it too.
 * Every mesh is raycast-inert so clicks pass through to the ground and gates.
 */
export function VenueObstacles({ obstacles, color }: VenueObstaclesProps) {
  const capColor = useMemo(() => new Color(color).multiplyScalar(CAP_DARKEN_FACTOR), [color])

  if (obstacles.length === 0) return null

  return (
    <group>
      {obstacles.map((obstacle, index) => (
        <group key={`${obstacle.x}-${obstacle.z}-${index}`} position={[obstacle.x, 0, obstacle.z]}>
          <mesh
            position={[0, obstacle.height / 2, 0]}
            castShadow
            receiveShadow
            raycast={() => null}
          >
            <boxGeometry args={[obstacle.width, obstacle.height, obstacle.depth]} />
            <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
          </mesh>
          <mesh
            position={[0, obstacle.height - CAP_HEIGHT / 2, 0]}
            castShadow
            receiveShadow
            raycast={() => null}
          >
            <boxGeometry args={[obstacle.width + CAP_OVERHANG, CAP_HEIGHT, obstacle.depth + CAP_OVERHANG]} />
            <meshStandardMaterial color={capColor} roughness={0.85} metalness={0} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
