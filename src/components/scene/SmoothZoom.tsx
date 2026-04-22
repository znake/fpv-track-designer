import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3, MathUtils } from 'three'
import type { OrbitControls } from 'three-stdlib'

interface SmoothZoomProps {
  controlsRef: React.RefObject<OrbitControls | null>
  minDistance?: number
  maxDistance?: number
  lerpSpeed?: number
}

/**
 * Stepless smooth zoom via mouse wheel.
 *
 * Disables OrbitControls' built-in zoom and instead interpolates
 * the camera distance frame-by-frame for a fluid, continuous feel.
 */
export function SmoothZoom({
  controlsRef,
  minDistance = 2,
  maxDistance = 200,
  lerpSpeed = 5,
}: SmoothZoomProps) {
  const { camera, gl } = useThree()
  const targetDistRef = useRef<number | null>(null)

  // Initialise target distance once controls are available
  useEffect(() => {
    const controls = controlsRef.current
    if (controls) {
      targetDistRef.current = camera.position.distanceTo(controls.target)
    }
  }, [camera, controlsRef])

  // Capture wheel events for smooth zoom
  useEffect(() => {
    const canvas = gl.domElement

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const controls = controlsRef.current
      if (!controls) return

      const currentDist = camera.position.distanceTo(controls.target)

      // Clamp deltaY to prevent huge jumps from trackpad momentum
      const clampedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 150)

      // Proportional zoom – percentage-based so it feels consistent at any distance
      const factor = currentDist * (1 + clampedDelta * 0.001)

      targetDistRef.current = MathUtils.clamp(factor, minDistance, maxDistance)
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [camera, gl, controlsRef, minDistance, maxDistance])

  // Smoothly interpolate camera distance every frame
  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || targetDistRef.current === null) return

    const target = controls.target
    const currentDist = camera.position.distanceTo(target)
    const targetDist = targetDistRef.current

    // Snap when close enough
    if (Math.abs(currentDist - targetDist) < 0.01) {
      if (Math.abs(currentDist - targetDist) > 0.001) {
        const dir = new Vector3().subVectors(camera.position, target).normalize()
        camera.position.copy(target).add(dir.multiplyScalar(targetDist))
      }
      return
    }

    // Frame-rate independent exponential lerp
    const t = 1 - Math.exp(-lerpSpeed * delta)
    const newDist = MathUtils.lerp(currentDist, targetDist, t)

    // Move camera along the direction from target to camera
    const direction = new Vector3().subVectors(camera.position, target).normalize()
    camera.position.copy(target).add(direction.multiplyScalar(newDist))
  })

  return null
}