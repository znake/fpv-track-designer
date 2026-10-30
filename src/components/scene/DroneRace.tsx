import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FlightPath } from '../../utils/flightPath'
import {
  DRONE_RACERS,
  approachAngle,
  buildDroneRoute,
  sampleDronePose,
  sampleDroneTrailRibbon,
  speedFactorAt,
} from '../../utils/droneRace'
import type { DroneRacerSpec, DroneRoute } from '../../utils/droneRace'

const TRAIL_SEGMENTS = 30
const TRAIL_SPACING_METERS = 0.2
const TRAIL_HALF_WIDTH_METERS = 0.022
const TRAIL_BRIGHTNESS = 1.05
const PROP_RADIUS = 0.075
const PROP_ARM = 0.075
const DRONE_SCALE = 1.3
const GROUND_POOL_SIZE_METERS = 1.0
const GROUND_POOL_OPACITY = 0.28
const MAX_FRAME_DELTA_SECONDS = 0.1
const HEADING_RESPONSE_PER_SECOND = 9
const ROLL_RESPONSE_PER_SECOND = 7
const SPEED_RESPONSE_PER_SECOND = 4
const VERTICES_PER_TRAIL_STEP = 2

const PROP_OFFSETS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

function createGlowTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.42)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }

  return new THREE.CanvasTexture(canvas)
}

function createTrailRibbon(spec: DroneRacerSpec, positions: Float32Array): THREE.Mesh {
  const vertexCount = TRAIL_SEGMENTS * VERTICES_PER_TRAIL_STEP
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const colors = new Float32Array(vertexCount * 3)
  const tint = new THREE.Color(spec.color)
  for (let index = 0; index < TRAIL_SEGMENTS; index++) {
    const fade = Math.pow(1 - index / (TRAIL_SEGMENTS - 1), 1.25) * TRAIL_BRIGHTNESS
    for (let vertex = 0; vertex < VERTICES_PER_TRAIL_STEP; vertex++) {
      const offset = (index * VERTICES_PER_TRAIL_STEP + vertex) * 3
      colors[offset] = tint.r * fade
      colors[offset + 1] = tint.g * fade
      colors[offset + 2] = tint.b * fade
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const indices: number[] = []
  for (let index = 0; index < TRAIL_SEGMENTS - 1; index++) {
    const start = index * VERTICES_PER_TRAIL_STEP
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2)
  }
  geometry.setIndex(indices)

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = 1
  return mesh
}

interface RaceDroneProps {
  route: DroneRoute
  spec: DroneRacerSpec
  startDistance: number
  paused: boolean
  glowTexture: THREE.Texture | null
}

function RaceDrone({ route, spec, startDistance, paused, glowTexture }: RaceDroneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const groundPoolRef = useRef<THREE.Mesh>(null)
  const distanceRef = useRef(startDistance)
  const headingRef = useRef(0)
  const rollRef = useRef(0)
  const speedFactorRef = useRef(1)

  const trailPositions = useMemo(() => new Float32Array(TRAIL_SEGMENTS * VERTICES_PER_TRAIL_STEP * 3), [])
  const trailMesh = useMemo(() => createTrailRibbon(spec, trailPositions), [spec, trailPositions])

  const propGeometry = useMemo(() => new THREE.TorusGeometry(PROP_RADIUS, 0.009, 4, 14), [])
  const bodyGeometry = useMemo(() => new THREE.BoxGeometry(0.1, 0.028, 0.14), [])
  const stripGeometry = useMemo(() => new THREE.BoxGeometry(0.13, 0.012, 0.012), [])

  const startPose = useMemo(() => sampleDronePose(route, startDistance, spec), [route, startDistance, spec])

  useEffect(() => {
    headingRef.current = startPose.heading
    rollRef.current = startPose.roll
    speedFactorRef.current = speedFactorAt(route, startDistance)
  }, [route, startDistance, startPose])

  useEffect(() => {
    sampleDroneTrailRibbon(
      route,
      distanceRef.current,
      spec,
      TRAIL_SEGMENTS,
      TRAIL_SPACING_METERS,
      TRAIL_HALF_WIDTH_METERS,
      trailPositions,
    )
    const attribute = trailMesh.geometry.getAttribute('position')
    attribute.needsUpdate = true
  }, [route, spec, trailMesh, trailPositions])

  useEffect(() => {
    return () => {
      trailMesh.geometry.dispose()
      const materials = Array.isArray(trailMesh.material) ? trailMesh.material : [trailMesh.material]
      materials.forEach((material) => material.dispose())
      propGeometry.dispose()
      bodyGeometry.dispose()
      stripGeometry.dispose()
    }
  }, [bodyGeometry, propGeometry, stripGeometry, trailMesh])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group || paused || route.totalLength <= 0) return

    const step = Math.min(delta, MAX_FRAME_DELTA_SECONDS)
    const targetSpeedFactor = speedFactorAt(route, distanceRef.current)
    speedFactorRef.current += (targetSpeedFactor - speedFactorRef.current) * (1 - Math.exp(-SPEED_RESPONSE_PER_SECOND * step))
    distanceRef.current = (distanceRef.current + step * spec.speedMetersPerSecond * speedFactorRef.current) % route.totalLength

    const pose = sampleDronePose(route, distanceRef.current, spec)
    headingRef.current = approachAngle(headingRef.current, pose.heading, HEADING_RESPONSE_PER_SECOND, step)
    rollRef.current = approachAngle(rollRef.current, pose.roll, ROLL_RESPONSE_PER_SECOND, step)

    group.position.set(pose.position.x, pose.position.y, pose.position.z)
    group.rotation.set(0, headingRef.current, rollRef.current)

    const groundPool = groundPoolRef.current
    if (groundPool) groundPool.position.set(pose.position.x, 0.02, pose.position.z)

    sampleDroneTrailRibbon(
      route,
      distanceRef.current,
      spec,
      TRAIL_SEGMENTS,
      TRAIL_SPACING_METERS,
      TRAIL_HALF_WIDTH_METERS,
      trailPositions,
    )
    const attribute = trailMesh.geometry.getAttribute('position')
    attribute.needsUpdate = true
  })

  return (
    <>
      <group
        ref={groupRef}
        visible={!paused}
        scale={DRONE_SCALE}
        position={[startPose.position.x, startPose.position.y, startPose.position.z]}
        rotation={[0, startPose.heading, startPose.roll]}
      >
        {PROP_OFFSETS.map(([signX, signZ]) => (
          <mesh
            key={`${signX}:${signZ}`}
            geometry={propGeometry}
            position={[signX * PROP_ARM, 0.012, signZ * PROP_ARM]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <meshBasicMaterial color={spec.color} transparent opacity={0.8} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh geometry={bodyGeometry}>
          <meshStandardMaterial color="#12141a" roughness={0.4} metalness={0.25} />
        </mesh>
        <mesh geometry={stripGeometry} position={[0, 0.004, -0.078]}>
          <meshBasicMaterial color={spec.color} toneMapped={false} />
        </mesh>
        {glowTexture && (
          <sprite scale={[0.78, 0.78, 1]} position={[0, 0, -0.02]}>
            <spriteMaterial
              map={glowTexture}
              color={spec.color}
              transparent
              opacity={0.46}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        )}
      </group>
      {glowTexture && (
        <mesh
          ref={groundPoolRef}
          visible={!paused}
          frustumCulled={false}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[startPose.position.x, 0.02, startPose.position.z]}
        >
          <planeGeometry args={[GROUND_POOL_SIZE_METERS, GROUND_POOL_SIZE_METERS]} />
          <meshBasicMaterial
            map={glowTexture}
            color={spec.color}
            transparent
            opacity={GROUND_POOL_OPACITY}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <primitive object={trailMesh} visible={!paused} />
    </>
  )
}

export interface DroneRaceProps {
  path: FlightPath
  paused?: boolean
}

export function DroneRace({ path, paused = false }: DroneRaceProps) {
  const route = useMemo(() => buildDroneRoute(path.sampledPoints, { closeLoop: true }), [path.sampledPoints])
  const glowTexture = useMemo(() => (typeof document === 'undefined' ? null : createGlowTexture()), [])

  useEffect(() => {
    return () => glowTexture?.dispose()
  }, [glowTexture])

  if (route.totalLength <= 0) return null

  return (
    <group name="drone-race">
      {DRONE_RACERS.map((spec, index) => (
        <RaceDrone
          key={spec.id}
          route={route}
          spec={spec}
          paused={paused}
          glowTexture={glowTexture}
          startDistance={(route.totalLength * index) / DRONE_RACERS.length}
        />
      ))}
    </group>
  )
}
