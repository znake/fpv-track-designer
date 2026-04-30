import type { ThreeEvent } from '@react-three/fiber'
import { Grid as DreiGrid, Text } from '@react-three/drei'
import { useAppStore } from '../../store'
import { GATE_BASE_WIDTH } from '../../constants/gateDimensions'
import type { ThemeColors } from '../../types/theme'

function isCameraTouchGesture(e: ThreeEvent<MouseEvent>) {
  const target = e.nativeEvent.target
  if (!(target instanceof HTMLElement)) return false

  const canvas = target.closest('canvas')
  return canvas?.dataset.cameraTouchGesturing === 'true'
}

interface GridProps {
  fieldSize?: { width: number; height: number }
  colors: ThemeColors
  showGrid: boolean
  // Used by themes whose field color must bypass scene lighting/tone mapping/fog.
  useUnlitGround?: boolean
}

export function Grid({ fieldSize = { width: 100, height: 100 }, colors, showGrid, useUnlitGround = false }: GridProps) {
  const halfW = fieldSize.width / 2
  const halfH = fieldSize.height / 2
  const watermarkSize = Math.max(6, Math.min(fieldSize.width / 5.2, fieldSize.height * 0.32))
  const selectGate = useAppStore((state) => state.selectGate)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)
  const cellSize = GATE_BASE_WIDTH
  const boundaryThickness = 0.035

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
        <meshStandardMaterial color={colors.groundEarth} roughness={0.94} metalness={0} />
      </mesh>

      {/* Ground plane - grass. Theme colors come from Scene; do not read the store here. */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, 0]}
        receiveShadow
        onClick={handleGroundClick}
      >
        <planeGeometry args={[fieldSize.width, fieldSize.height]} />
        {useUnlitGround ? (
          <meshBasicMaterial color={colors.groundGrass} toneMapped={false} fog={false} />
        ) : (
          <meshStandardMaterial color={colors.groundGrass} roughness={0.95} metalness={0} />
        )}
      </mesh>

      {/* Field boundary — always visible, independent from the optional inner grid. */}
      <group position={[0, 0.025, 0]}>
        <mesh position={[0, 0, -halfH]}>
          <boxGeometry args={[fieldSize.width, 0.01, boundaryThickness]} />
          <meshBasicMaterial color={colors.groundBoundary} toneMapped={false} />
        </mesh>
        <mesh position={[halfW, 0, 0]}>
          <boxGeometry args={[boundaryThickness, 0.01, fieldSize.height]} />
          <meshBasicMaterial color={colors.groundBoundary} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, halfH]}>
          <boxGeometry args={[fieldSize.width, 0.01, boundaryThickness]} />
          <meshBasicMaterial color={colors.groundBoundary} toneMapped={false} />
        </mesh>
        <mesh position={[-halfW, 0, 0]}>
          <boxGeometry args={[boundaryThickness, 0.01, fieldSize.height]} />
          <meshBasicMaterial color={colors.groundBoundary} toneMapped={false} />
        </mesh>
      </group>

      {showGrid && (
        <>
          {/* Grid lines using drei Grid helper */}
          <DreiGrid
            position={[0, 0.01, 0]}
            args={[fieldSize.width, fieldSize.height]}
            cellSize={cellSize}
            cellThickness={0.5}
            cellColor={colors.gridColor}
            sectionSize={5}
            sectionThickness={0}
            sectionColor={colors.gridColor}
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
          color={colors.watermarkColor}
          transparent
          opacity={0.035}
          depthWrite={false}
          toneMapped={false}
        />
      </Text>

    </group>
  )
}
