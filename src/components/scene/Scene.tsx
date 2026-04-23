import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useAppStore } from '../../store'
import { Gate } from '../gates/Gate'
import { FlightPath } from '../scene/FlightPath'
import { Grid } from '../scene/Grid'
import { CameraPan } from '../scene/CameraPan'
import { CameraVerticalPan } from '../scene/CameraVerticalPan'
import { SmoothZoom } from '../scene/SmoothZoom'

export function Scene() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const config = useAppStore((state) => state.config)

  const gateLabels = useMemo(() => {
    if (!currentTrack) return new Map<string, string>()

    const labels = new Map<string, number[]>()
    const sequence = currentTrack.gateSequence.length > 0
      ? currentTrack.gateSequence
      : currentTrack.gates.map((gate) => gate.id)

    sequence.forEach((gateId, index) => {
      const numbers = labels.get(gateId) ?? []
      numbers.push(index + 1)
      labels.set(gateId, numbers)
    })

    currentTrack.gates.forEach((gate, index) => {
      if (!labels.has(gate.id)) {
        labels.set(gate.id, [index + 1])
      }
    })

    return new Map(
      [...labels.entries()].map(([gateId, numbers]) => [gateId, numbers.join('\n')]),
    )
  }, [currentTrack])

  return (
    <Canvas
      camera={{ position: [0, 30, 30], fov: 50, near: 0.1, far: 1000 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

      <Grid fieldSize={config.fieldSize} />

      {currentTrack && (
        <>
          {currentTrack.gates.map((gate) => (
            <Gate key={gate.id} gate={gate} label={gateLabels.get(gate.id)} />
          ))}
          <FlightPath gates={currentTrack.gates} gateSequence={currentTrack.gateSequence} />
        </>
      )}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        enableZoom={false}
        enablePan={false}
        mouseButtons={{
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.DOLLY,
        }}
        maxPolarAngle={Math.PI / 2.1}
      />
      <CameraPan controlsRef={controlsRef} />
      <CameraVerticalPan controlsRef={controlsRef} />
      <SmoothZoom controlsRef={controlsRef} />
    </Canvas>
  )
}
