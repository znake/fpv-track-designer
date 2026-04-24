import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'

interface GateEntryIndicatorProps {
  width: number
  height: number
  position?: [number, number, number]
  rotationX?: number
  rotationY?: number
  reverse?: boolean
  label?: string
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

/**
 * Transparent entry/exit indicator planes filling the gate opening.
 * Green on the entry side (front, -Z), red on the back side (+Z).
 * Makes it immediately clear which side to approach the gate from.
 */
export function GateEntryIndicator({ width, height, position = [0, height / 2, 0], rotationX = 0, rotationY = 0, reverse = false, label, onClick }: GateEntryIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null)
  const entryLabelRef = useRef<THREE.Group>(null)
  const exitLabelRef = useRef<THREE.Group>(null)
  const lines = label?.split('\n') ?? []
  const lineCount = Math.max(lines.length, 1)
  const widestLineLength = Math.max(...lines.map((line) => line.length), 1)
  const fontSize = Math.min((width * 0.58) / widestLineLength, (height * 0.56) / lineCount)
  const entryLabelColor = '#86efac'
  const exitLabelColor = '#fca5a5'
  const entryOutlineColor = '#4ade80'
  const exitOutlineColor = '#f87171'
  const entryZ = reverse ? 0.02 : -0.02
  const exitZ = reverse ? -0.02 : 0.02
  const entryLabelZ = reverse ? 0.03 : -0.03
  const exitLabelZ = reverse ? -0.03 : 0.03
  const entryLabelRotationY = reverse ? 0 : Math.PI
  const exitLabelRotationY = reverse ? Math.PI : 0

  useFrame(({ camera }) => {
    if (!groupRef.current) return

    const localCameraPosition = groupRef.current.worldToLocal(camera.position.clone())
    const isEntrySideVisible = reverse ? localCameraPosition.z >= 0 : localCameraPosition.z <= 0

    if (entryLabelRef.current) {
      entryLabelRef.current.visible = isEntrySideVisible
    }

    if (exitLabelRef.current) {
      exitLabelRef.current.visible = !isEntrySideVisible
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={[(rotationX * Math.PI) / 180, (rotationY * Math.PI) / 180, 0]}>
      {/* Entry side — green (approach from here) */}
      <mesh position={[0, 0, entryZ]} onClick={onClick}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#16a34a"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Exit side — red (do not approach from here) */}
      <mesh position={[0, 0, exitZ]} onClick={onClick}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#ef4444"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {label && (
        <>
          <group ref={entryLabelRef} position={[0, 0, entryLabelZ]} rotation={[0, entryLabelRotationY, 0]}>
            <Text
              color={entryLabelColor}
              fontSize={fontSize}
              maxWidth={width * 0.78}
              lineHeight={0.9}
              anchorX="center"
              anchorY="middle"
              outlineWidth={fontSize * 0.006}
              outlineColor={entryOutlineColor}
              fillOpacity={0.12}
              material-side={THREE.FrontSide}
              renderOrder={2}
              onClick={onClick}
            >
              {label}
            </Text>
          </group>

          <group ref={exitLabelRef} position={[0, 0, exitLabelZ]} rotation={[0, exitLabelRotationY, 0]}>
            <Text
              color={exitLabelColor}
              fontSize={fontSize}
              maxWidth={width * 0.78}
              lineHeight={0.9}
              anchorX="center"
              anchorY="middle"
              outlineWidth={fontSize * 0.006}
              outlineColor={exitOutlineColor}
              fillOpacity={0.12}
              material-side={THREE.FrontSide}
              renderOrder={2}
              onClick={onClick}
            >
              {label}
            </Text>
          </group>
        </>
      )}
    </group>
  )
}
