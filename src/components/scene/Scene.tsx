import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ACESFilmicToneMapping, MOUSE } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useAppStore } from '../../store'
import { buildDefaultGateSequenceEntries } from '../../utils/gateSequence'
import { Gate } from '../gates/Gate'
import { FlightPath } from '../scene/FlightPath'
import { Grid } from '../scene/Grid'
import { CameraPan } from '../scene/CameraPan'
import { CameraVerticalPan } from '../scene/CameraVerticalPan'
import { SmoothZoom } from '../scene/SmoothZoom'
import { SkyDome } from '../scene/SkyDome'

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
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 30, 30], fov: 50, near: 0.1, far: 1000 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      >
      <SkyDome />
      {/* Fog stays saturated so the view under the floating field never washes out. */}
      <fog attach="fog" args={['#5AAEF0', 160, 380]} />

      {/* Soft sky / fresh green bounce hemisphere keeps the scene warm and friendly. */}
      <hemisphereLight args={['#D8F1FF', '#4C8B38', 0.72]} />
      {/* Warm directional sun, slightly off-zenith. */}
      <directionalLight
        position={[80, 110, 60]}
        intensity={1.4}
        color="#FFF1D6"
      />
      {/* Cool fill light softens the sun direction. */}
      <directionalLight position={[-60, 40, -40]} intensity={0.4} color="#A8C8E6" />
      <ambientLight intensity={0.28} color="#FFFFFF" />

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
