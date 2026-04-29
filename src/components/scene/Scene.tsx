import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ACESFilmicToneMapping, AdditiveBlending, CanvasTexture, MOUSE } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useAppStore } from '../../store'
import { buildDefaultGateSequenceEntries } from '../../utils/gateSequence'
import { getThemeConfig } from '../../utils/themeColors'
import { Gate } from '../gates/Gate'
import { FlightPath } from '../scene/FlightPath'
import { Grid } from '../scene/Grid'
import { CameraPan } from '../scene/CameraPan'
import { CameraVerticalPan } from '../scene/CameraVerticalPan'
import { SmoothZoom } from '../scene/SmoothZoom'
import { SkyDome } from '../scene/SkyDome'
import type { Config, Track } from '../../types'

interface SceneProps {
  track?: Track | null
  configOverride?: Config | null
  readOnly?: boolean
}

export function Scene({ track, configOverride, readOnly = false }: SceneProps = {}) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const storeTrack = useAppStore((state) => state.currentTrack)
  const storeConfig = useAppStore((state) => state.config)
  const currentTrack = track !== undefined ? track : storeTrack
  const config = configOverride ?? storeConfig
  const theme = useMemo(() => getThemeConfig(config.theme), [config.theme])

  const sunGlowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128

    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64)
      gradient.addColorStop(0, 'rgba(255, 190, 90, 0.65)')
      gradient.addColorStop(0.28, 'rgba(255, 160, 70, 0.28)')
      gradient.addColorStop(1, 'rgba(255, 120, 40, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)
    }

    return new CanvasTexture(canvas)
  }, [])

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

  const trackContent = currentTrack ? (
    <>
      {currentTrack.gates.map((gate) => (
        <Gate
          key={gate.id}
          gate={gate}
          openingLabels={config.showOpeningLabels ? gateLabels.get(gate.id) : undefined}
          showOpeningLabels={config.showOpeningLabels}
          readOnly={readOnly}
        />
      ))}
      {config.showFlightPath && <FlightPath gates={currentTrack.gates} gateSequence={currentTrack.gateSequence} />}
    </>
  ) : null

  const cameraControls = (
    <>
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
    </>
  )

  return (
    <Canvas
      dpr={theme.dpr}
      gl={{
        antialias: theme.antialias,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: theme.toneMappingExposure,
      }}
      shadows={theme.useShadows}
      camera={{ position: [0, 30, 30], fov: 50, near: 0.1, far: 1000 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      {/* ── MINIMAL THEME ───────────────────────────────────────────────────── */}
      {theme.id === 'minimal' && (
        <>
          <SkyDome
            topColor={theme.colors.skyTop}
            midColor={theme.colors.skyMid}
            horizonColor={theme.colors.skyHorizon}
            bottomColor={theme.colors.skyBottom}
            sunColor={theme.colors.skySun}
          />
          <fog attach="fog" args={[theme.colors.fogColor, theme.colors.fogNear, theme.colors.fogFar]} />
          <hemisphereLight args={[theme.colors.hemisphereSky, theme.colors.hemisphereGround, theme.colors.hemisphereIntensity]} />
          <directionalLight
            position={theme.colors.sunPosition}
            intensity={theme.colors.sunIntensity}
            color={theme.colors.sunColor}
          />
          <directionalLight
            position={theme.colors.fillPosition}
            intensity={theme.colors.fillIntensity}
            color={theme.colors.fillColor}
          />
          <ambientLight intensity={theme.colors.ambientIntensity} color={theme.colors.ambientColor} />
          <Grid fieldSize={config.fieldSize} />
          {trackContent}
          {cameraControls}
        </>
      )}

      {/* ── REALISTIC THEME ──────────────────────────────────────────────────── */}
      {theme.id === 'realistic' && (
        <>
          <SkyDome
            topColor="#354B68"
            midColor="#6F7D91"
            horizonColor="#E9A97C"
            bottomColor="#E9A97C"
            sunColor="#FFB347"
            exponent={0.74}
            horizonOffset={0.12}
          />
          <group position={[82, 20, -66]}>
            <sprite scale={[22, 22, 1]} renderOrder={2}>
              <spriteMaterial map={sunGlowTexture} transparent opacity={0.75} depthTest={false} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
            </sprite>
            <mesh renderOrder={3}>
              <sphereGeometry args={[4.5, 32, 32]} />
              <meshBasicMaterial color="#FFB347" toneMapped={false} depthTest={false} depthWrite={false} fog={false} />
            </mesh>
          </group>
          <mesh rotation-x={-Math.PI / 2} position={[0, -62, 0]}>
            <planeGeometry args={[10000, 10000]} />
            <meshStandardMaterial color="#123F50" emissive="#062A45" emissiveIntensity={0.08} roughness={0.22} metalness={0.18} />
          </mesh>
          <Environment preset={theme.environmentPreset as 'sunset' | 'night'} environmentIntensity={theme.environmentIntensity} />
          <fog attach="fog" args={[theme.colors.fogColor, theme.colors.fogNear, theme.colors.fogFar]} />
          <hemisphereLight args={[theme.colors.hemisphereSky, theme.colors.hemisphereGround, theme.colors.hemisphereIntensity]} />
          <directionalLight
            position={theme.colors.sunPosition}
            intensity={theme.colors.sunIntensity}
            color={theme.colors.sunColor}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={200}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
            shadow-bias={-0.00015}
            shadow-normalBias={0.02}
          />
          <directionalLight
            position={theme.colors.fillPosition}
            intensity={theme.colors.fillIntensity}
            color={theme.colors.fillColor}
          />
          <ambientLight intensity={theme.colors.ambientIntensity} color={theme.colors.ambientColor} />
          <Grid fieldSize={config.fieldSize} />
          {trackContent}
          {cameraControls}
        </>
      )}

      {/* ── NIGHT THEME ─────────────────────────────────────────────────────── */}
      {theme.id === 'night' && (
        <>
          <color attach="background" args={[theme.colors.skyTop]} />
          <Stars radius={100} depth={60} count={4000} factor={3} saturation={0} fade speed={0.5} />
          <Environment preset={theme.environmentPreset as 'sunset' | 'night'} environmentIntensity={theme.environmentIntensity} />
          <fog attach="fog" args={[theme.colors.fogColor, theme.colors.fogNear, theme.colors.fogFar]} />
          <hemisphereLight args={[theme.colors.hemisphereSky, theme.colors.hemisphereGround, theme.colors.hemisphereIntensity]} />
          <directionalLight
            position={theme.colors.sunPosition}
            intensity={theme.colors.sunIntensity}
            color={theme.colors.sunColor}
          />
          <directionalLight
            position={theme.colors.fillPosition}
            intensity={theme.colors.fillIntensity}
            color={theme.colors.fillColor}
          />
          <ambientLight intensity={theme.colors.ambientIntensity} color={theme.colors.ambientColor} />
          <Grid fieldSize={config.fieldSize} />
          {currentTrack && (
            <EffectComposer>
              <Bloom mipmapBlur intensity={1.6} luminanceThreshold={1} luminanceSmoothing={0.2} />
            </EffectComposer>
          )}
          {trackContent}
          {cameraControls}
        </>
      )}
    </Canvas>
  )
}
