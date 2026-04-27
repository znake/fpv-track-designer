import type { ThreeEvent } from '@react-three/fiber'
import { Grid as DreiGrid, Text } from '@react-three/drei'
import { useAppStore } from '../../store'
import { GATE_BASE_WIDTH } from '../../constants/gateDimensions'

function isCameraTouchGesture(e: ThreeEvent<MouseEvent>) {
  const target = e.nativeEvent.target
  if (!(target instanceof HTMLElement)) return false

  const canvas = target.closest('canvas')
  return canvas?.dataset.cameraTouchGesturing === 'true'
}

interface GridProps {
  fieldSize?: { width: number; height: number }
}

export function Grid({ fieldSize = { width: 100, height: 100 } }: GridProps) {
  const halfW = fieldSize.width / 2
  const halfH = fieldSize.height / 2
  const watermarkSize = Math.max(6, Math.min(fieldSize.width / 5.2, fieldSize.height * 0.32))
  const selectGate = useAppStore((state) => state.selectGate)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)
  const showGrid = useAppStore((state) => state.config.showGrid)
  const cellSize = GATE_BASE_WIDTH

  const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate || isCameraTouchGesture(e)) return
    selectGate(null)
  }

  return (
    <group>
      {/* Earth-toned underside makes the floating field read like soil from the side. */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[fieldSize.width, 0.1, fieldSize.height]} />
        <meshStandardMaterial color="#5A3A22" roughness={0.94} metalness={0} />
      </mesh>

      {/* Ground plane - grass */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, 0]}
        onClick={handleGroundClick}
      >
        <planeGeometry args={[fieldSize.width, fieldSize.height]} />
        <meshStandardMaterial color="#3B7A28" roughness={0.95} metalness={0} />
      </mesh>

      {showGrid && (
        <>
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
            <lineBasicMaterial color="#FFFEF0" linewidth={2} />
          </lineSegments>

          {/* Grid lines using drei Grid helper */}
          <DreiGrid
            position={[0, 0.01, 0]}
            args={[fieldSize.width, fieldSize.height]}
            cellSize={cellSize}
            cellThickness={0.5}
            cellColor="#5A8F44"
            sectionSize={5}
            sectionThickness={0}
            sectionColor="#5A8F44"
            fadeDistance={200}
            fadeStrength={1}
          />
        </>
      )}

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
          opacity={0.035}
          depthWrite={false}
          toneMapped={false}
        />
      </Text>

    </group>
  )
}
