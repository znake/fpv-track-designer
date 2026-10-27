import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import type { IdealLineLegRef } from '../../types'
import type { FlightPath as FlightPathData } from '../../utils/flightPath'
import { resolveIdealLineHover } from '../../utils/idealLine'
import type { IdealLineHoverTarget } from '../../utils/idealLine'
import { useTheme } from '../../hooks/useTheme'
import { Line } from '@react-three/drei'

export interface FlightPathControlPointMapping {
  sampledLegIndexes: readonly number[]
  sampledLegUs: readonly (readonly number[])[]
  legRefs: readonly IdealLineLegRef[]
}

export interface FlightPathPointer {
  x: number
  y: number
}

export interface FlightPathInteraction {
  mapping: FlightPathControlPointMapping
  onHover: (target: IdealLineHoverTarget | null, pointer: FlightPathPointer) => void
  onLeave: () => void
  onClick: (target: IdealLineHoverTarget | null, pointer: FlightPathPointer) => void
}

interface FlightPathProps {
  path: FlightPathData
  interaction?: FlightPathInteraction
}

const FLIGHT_PATH_HOVER_THRESHOLD = 0.2
const MAX_CLICK_DELTA = 4

export function FlightPath({ path, interaction }: FlightPathProps) {
  const theme = useTheme()
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  // Build one native THREE.Line per sampled curve to avoid implicit connections between disjoint segments.
  const lineObjects = useMemo(() => path.sampledSegments.map((segment, curveIndex) => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(segment.length * 3)

    for (let i = 0; i < segment.length; i++) {
      const p = segment[i]
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({ color: theme.colors.flightPath, linewidth: 2 })
    const line = new THREE.Line(geometry, material)
    line.userData.curveIndex = curveIndex
    return line
  }), [path.sampledSegments, theme.colors.flightPath])

  useEffect(() => {
    if (!interaction) return

    const raycaster = new THREE.Raycaster()
    raycaster.params.Line.threshold = FLIGHT_PATH_HOVER_THRESHOLD
    const pointerDowns = new Map<number, { x: number; y: number }>()

    const targetAt = (event: PointerEvent | MouseEvent): IdealLineHoverTarget | null => {
      const rect = canvas.getBoundingClientRect()
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(lineObjects, false)[0]
      if (!hit) return null

      const curveIndex = hit.object.userData.curveIndex as number
      const legIndex = interaction.mapping.sampledLegIndexes[curveIndex]
      const leg = interaction.mapping.legRefs[legIndex]
      const samples = path.sampledLegs[legIndex]
      const sampleUs = interaction.mapping.sampledLegUs[legIndex]
      const segmentIndex = hit.index ?? hit.instanceId
      if (!leg || !samples || !sampleUs || segmentIndex === undefined) return null

      let curveSampleOffset = 0
      for (let index = 0; index < curveIndex; index++) {
        if (interaction.mapping.sampledLegIndexes[index] === legIndex) {
          curveSampleOffset += path.sampledSegments[index].length
        }
      }

      return resolveIdealLineHover({
        leg,
        samples,
        sampleUs,
        segmentIndex,
        curveSampleOffset,
        hit: hit.point,
      })
    }

    const onPointerMove = (event: PointerEvent) => interaction.onHover(targetAt(event), { x: event.clientX, y: event.clientY })
    const onPointerLeave = () => {
      interaction.onHover(null, { x: 0, y: 0 })
      interaction.onLeave()
    }
    const onClick = (event: MouseEvent) => {
      const pointerEvent = event as PointerEvent
      const start = pointerDowns.get(pointerEvent.pointerId)
      pointerDowns.delete(pointerEvent.pointerId)
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MAX_CLICK_DELTA) return
      interaction.onClick(targetAt(event), { x: event.clientX, y: event.clientY })
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.isPrimary && event.button === 0) pointerDowns.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('click', onClick)
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('click', onClick)
    }
  }, [camera, canvas, interaction, lineObjects, path.sampledLegs, path.sampledSegments])

  if (path.segments.length === 0) return null

  return (
    <group>
      {/* Flight path curves — rendered separately to preserve gate entry/exit discontinuities */}
      {lineObjects.map((lineObject, index) => <primitive key={index} object={lineObject} />)}

      {/* Direction arrows — two-line chevrons every 1.5m */}
      {path.arrows.map((arrow, i) => (
        <group
          key={i}
          position={[arrow.position.x, arrow.position.y, arrow.position.z]}
          quaternion={[
            arrow.quaternion.x,
            arrow.quaternion.y,
            arrow.quaternion.z,
            arrow.quaternion.w,
          ]}
        >
          <Line
            points={[
              [-0.04, 0, 0.04],
              [0, 0, -0.06],
            ]}
            color={theme.colors.flightPath}
            lineWidth={1.5}
          />
          <Line
            points={[
              [0.04, 0, 0.04],
              [0, 0, -0.06],
            ]}
            color={theme.colors.flightPath}
            lineWidth={1.5}
          />
        </group>
      ))}
    </group>
  )
}
