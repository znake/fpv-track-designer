import { useMemo } from 'react'
import type { Gate } from '../../types'
import { calculateFlightPath } from '../../utils/flightPath'

interface FlightPathProps {
  gates: Gate[]
}

export function FlightPath({ gates }: FlightPathProps) {
  const path = useMemo(() => calculateFlightPath(gates), [gates])

  if (path.segments.length === 0) return null

  // Create line points (including closing segment)
  const uniquePoints = [path.segments[0].from, ...path.segments.map((s) => s.to)]

  return (
    <group>
      {/* Flight path line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(uniquePoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
            count={uniquePoints.length}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ffff" linewidth={2} />
      </line>

      {/* Direction arrows */}
      {path.arrows.map((arrow, i) => (
        <mesh
          key={i}
          position={[arrow.position.x, arrow.position.y, arrow.position.z]}
          rotation={[0, Math.atan2(arrow.direction.x, arrow.direction.z), 0]}
        >
          <coneGeometry args={[0.3, 0.8, 8]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}