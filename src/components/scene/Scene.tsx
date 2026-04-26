import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky, OrbitControls } from '@react-three/drei'
import { MOUSE } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useAppStore } from '../../store'
import { buildDefaultGateSequenceEntries } from '../../utils/gateSequence'
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
    if (!currentTrack) return new Map<string, Record<string, string>>()

    const labelsByGate = new Map<string, Record<string, string>>()
    const sequence = currentTrack.gateSequence.length > 0
      ? currentTrack.gateSequence
      : currentTrack.gates.flatMap(buildDefaultGateSequenceEntries)

    for (const [index, entry] of sequence.entries()) {
      const gateLabelMap = labelsByGate.get(entry.gateId) ?? {}
      gateLabelMap[entry.openingId] = String(index + 1)
      labelsByGate.set(entry.gateId, gateLabelMap)
    }

    currentTrack.gates.forEach((gate, index) => {
      if (labelsByGate.has(gate.id)) return

      const openingId = gate.openings[0]?.id
      if (!openingId) return

      labelsByGate.set(gate.id, { [openingId]: String(index + 1) })
    })

    return labelsByGate
  }, [currentTrack])

  return (
    <Canvas
      camera={{ position: [0, 30, 30], fov: 50, near: 0.1, far: 1000 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <Sky
        distance={450000}
        sunPosition={[100, 80, 50]}
        turbidity={3}
        rayleigh={1}
        mieCoefficient={0.005}
        mieDirectionalG={0.7}
      />
      <fog attach="fog" args={['#CFE7F5', 80, 240]} />

      <hemisphereLight args={['#BFE2F5', '#7BB369', 0.4]} />
      <directionalLight
        position={[100, 80, 50]}
        intensity={1.0}
        color="#FFFFFF"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={300}
      />
      <ambientLight intensity={0.45} color="#FFFFFF" />

      <Grid fieldSize={config.fieldSize} />

      {currentTrack && (
        <>
          {currentTrack.gates.map((gate) => (
            <Gate
              key={gate.id}
              gate={gate}
              openingLabels={config.showOpeningLabels ? gateLabels.get(gate.id) : undefined}
              showOpeningLabels={config.showOpeningLabels}
            />
          ))}
          {config.showFlightPath && <FlightPath gates={currentTrack.gates} gateSequence={currentTrack.gateSequence} />}
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
