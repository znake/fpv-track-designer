import type { ThreeEvent } from '@react-three/fiber'
import { Grid as DreiGrid, Text } from '@react-three/drei'
import { useAppStore } from '../../store'

interface GridProps {
  fieldSize?: { width: number; height: number }
}

export function Grid({ fieldSize = { width: 100, height: 100 } }: GridProps) {
  const halfW = fieldSize.width / 2
  const halfH = fieldSize.height / 2
  const watermarkSize = Math.max(6, Math.min(fieldSize.width / 5.2, fieldSize.height * 0.32))
  const selectGate = useAppStore((state) => state.selectGate)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)

  const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate) return
    selectGate(null)
  }

  return (
    <group>
      {/* Ground plane - grass */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, 0]}
        receiveShadow
        onClick={handleGroundClick}
      >
        <planeGeometry args={[fieldSize.width, fieldSize.height]} />
        <meshStandardMaterial color="#3d5c28" />
      </mesh>

      {/* Field boundary - white line */}
      <lineSegments position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              -halfW, 0, -halfH,
              halfW, 0, -halfH,
              halfW, 0, -halfH,
              halfW, 0, halfH,
              halfW, 0, halfH,
              -halfW, 0, halfH,
              -halfW, 0, halfH,
              -halfW, 0, -halfH,
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </lineSegments>

      {/* Grid lines using drei Grid helper */}
      <DreiGrid
        position={[0, 0.01, 0]}
        args={[fieldSize.width, fieldSize.height]}
        cellSize={3}
        cellThickness={0.5}
        cellColor="#5a7a4a"
        sectionSize={15}
        sectionThickness={1}
        sectionColor="#7a9a6a"
        fadeDistance={200}
        fadeStrength={1}
      />

      {/* Subtle field branding */}
      <Text
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={watermarkSize}
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
      >
        #FPVOOE
        <meshBasicMaterial
          color="#d9ead0"
          transparent
          opacity={0.07}
          depthWrite={false}
          toneMapped={false}
        />
      </Text>

    </group>
  )
}
