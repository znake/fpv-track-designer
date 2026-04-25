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
 * Stepless smooth zoom via mouse wheel, middle drag and mobile pinch.
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
      const factor = currentDist * (1 + clampedDelta * 0.005)

      targetDistRef.current = MathUtils.clamp(factor, minDistance, maxDistance)
    }

    let isMiddleZooming = false
    let lastY = 0
    let previousPinchDistance: number | null = null
    let touchGestureResetTimeout: number | null = null
    const touchPointers = new Map<number, { x: number; y: number }>()

    const setTouchGesturing = (isGesturing: boolean) => {
      if (touchGestureResetTimeout !== null) {
        window.clearTimeout(touchGestureResetTimeout)
        touchGestureResetTimeout = null
      }

      canvas.dataset.cameraTouchGesturing = isGesturing ? 'true' : 'false'
      if (!isGesturing) {
        touchGestureResetTimeout = window.setTimeout(() => {
          canvas.dataset.cameraTouchGesturing = 'false'
          touchGestureResetTimeout = null
        }, 250)
      }
    }

    const getPinchDistance = () => {
      const [first, second] = Array.from(touchPointers.values())
      if (!first || !second) return null

      return Math.hypot(second.x - first.x, second.y - first.y)
    }

    const stopTouchZoom = () => {
      previousPinchDistance = null
      if (touchPointers.size === 0) {
        const controls = controlsRef.current
        if (controls) {
          controls.enabled = true
        }
      }
      setTouchGesturing(false)
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

        if (touchPointers.size === 2) {
          e.preventDefault()
          e.stopPropagation()
          previousPinchDistance = getPinchDistance()
          setTouchGesturing(true)

          const controls = controlsRef.current
          if (controls) {
            controls.enabled = false
          }
        }
        return
      }

      if (e.button !== 1) return
      isMiddleZooming = true
      lastY = e.clientY
      canvas.style.cursor = 'ns-resize'
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        if (!touchPointers.has(e.pointerId)) return

        touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (touchPointers.size !== 2 || previousPinchDistance === null) return

        e.preventDefault()
        e.stopPropagation()

        const nextPinchDistance = getPinchDistance()
        const controls = controlsRef.current
        if (!controls || nextPinchDistance === null || nextPinchDistance <= 0) return

        const currentDist = camera.position.distanceTo(controls.target)
        const factor = currentDist * (previousPinchDistance / nextPinchDistance)
        previousPinchDistance = nextPinchDistance
        targetDistRef.current = MathUtils.clamp(factor, minDistance, maxDistance)
        return
      }

      if (!isMiddleZooming) return

      const controls = controlsRef.current
      if (!controls) return

      const currentDist = camera.position.distanceTo(controls.target)
      const deltaY = lastY - e.clientY
      lastY = e.clientY

      // Scale factor: much faster than wheel for quick zooming
      const factor = currentDist * (1 + deltaY * 0.2)
      targetDistRef.current = MathUtils.clamp(factor, minDistance, maxDistance)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        touchPointers.delete(e.pointerId)
        if (touchPointers.size < 2) {
          stopTouchZoom()
        } else {
          previousPinchDistance = getPinchDistance()
        }
        return
      }

      if (!isMiddleZooming) return
      isMiddleZooming = false
      canvas.style.cursor = ''
    }

    const handlePointerCancel = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return

      touchPointers.delete(e.pointerId)
      stopTouchZoom()
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      if (touchGestureResetTimeout !== null) {
        window.clearTimeout(touchGestureResetTimeout)
      }
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
