import { Grid as DreiGrid } from '@react-three/drei'

interface GridProps {
  fieldSize?: { width: number; height: number }
}

export function Grid({ fieldSize = { width: 100, height: 100 } }: GridProps) {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[fieldSize.width, fieldSize.height]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Grid lines using drei Grid helper */}
      <DreiGrid
        position={[0, 0.01, 0]}
        args={[fieldSize.width, fieldSize.height]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#4a4a6a"
        sectionSize={25}
        sectionThickness={1}
        sectionColor="#6a6a8a"
        fadeDistance={200}
        fadeStrength={1}
      />

      {/* Axis indicators */}
      {/* X axis - red */}
      <mesh position={[fieldSize.width / 2, 0.05, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
      {/* Z axis - blue */}
      <mesh position={[0, 0.05, fieldSize.height / 2]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#4444ff" />
      </mesh>
    </group>
  )
}