import { useMemo } from 'react'
import * as THREE from 'three'
import type { Gate } from '../../types'
import { calculateFlightPath } from '../../utils/flightPath'
import { Line } from '@react-three/drei'

interface FlightPathProps {
  gates: Gate[]
  gateSequence?: string[]
}

export function FlightPath({ gates, gateSequence }: FlightPathProps) {
  const path = useMemo(() => calculateFlightPath(gates, gateSequence), [gates, gateSequence])

  // Build native THREE.Line for smooth bezier rendering
  const lineObj = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(path.sampledPoints.length * 3)
    for (let i = 0; i < path.sampledPoints.length; i++) {
      const p = path.sampledPoints[i]
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({ color: '#ffff00', linewidth: 2 })
    return new THREE.Line(geometry, material)
  }, [path.sampledPoints])

  if (path.segments.length === 0) return null

  return (
    <group>
      {/* Flight path curve — native THREE.Line for accurate bezier rendering */}
      <primitive object={lineObj} />

      {/* Direction arrows — simple 2-line chevrons */}
      {path.arrows.map((arrow, i) => (
        <group
          key={i}
          position={[arrow.position.x, arrow.position.y, arrow.position.z]}
          quaternion={[
            arrow.quaternion.x,
            arrow.quaternion.y,
            arrow.quaternion.z,
            arrow.quaternion.w,
          ]}
        >
          <Line
            points={[
              [-0.12, 0, 0.12],
              [0, 0, -0.2],
            ]}
            color="#ffff00"
            lineWidth={2}
          />
          <Line
            points={[
              [0.12, 0, 0.12],
              [0, 0, -0.2],
            ]}
            color="#ffff00"
            lineWidth={2}
          />
        </group>
      ))}
    </group>
  )
}
