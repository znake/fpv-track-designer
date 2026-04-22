import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3, PerspectiveCamera } from 'three'
import type { OrbitControls } from 'three-stdlib'

interface CameraPanProps {
  controlsRef: React.RefObject<OrbitControls | null>
}

export function CameraPan({ controlsRef }: CameraPanProps) {
  const { camera, gl } = useThree()

  const isSpaceHeld = useRef(false)
  const isPanning = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = gl.domElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        isSpaceHeld.current = true
        canvas.style.cursor = 'grab'
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeld.current = false
        if (isPanning.current) {
          isPanning.current = false
          const controls = controlsRef.current
          if (controls) {
            controls.enabled = true
          }
        }
        canvas.style.cursor = ''
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (!isSpaceHeld.current || e.button !== 0) return

      isPanning.current = true
      canvas.dataset.cameraPanning = 'true'
      prevMouse.current = { x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'grabbing'

      const controls = controlsRef.current
      if (controls) {
        controls.enabled = false
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPanning.current) return

      const dx = e.clientX - prevMouse.current.x
      const dy = e.clientY - prevMouse.current.y
      prevMouse.current = { x: e.clientX, y: e.clientY }

      // Convert screen delta to world-space delta on the XZ plane
      // Extract camera right and up from its world matrix
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
      const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)

      // Zero out Y components for horizontal-only movement
      right.y = 0
      up.y = 0

      right.normalize()
      up.normalize()

      // Scale factor: approximate world units per pixel based on distance to target
      const controls = controlsRef.current
      const distance = controls
        ? camera.position.distanceTo(controls.target)
        : camera.position.length()

      const fov = camera instanceof PerspectiveCamera ? camera.fov : 50
      const scale = (distance * Math.tan(((fov / 2) * Math.PI) / 180)) / (canvas.clientHeight / 2)

      const panDelta = right.multiplyScalar(-dx * scale).add(up.multiplyScalar(dy * scale))

      // Apply to camera and OrbitControls target
      camera.position.add(panDelta)
      if (controls) {
        controls.target.add(panDelta)
      }
    }

    const handlePointerUp = () => {
      if (!isPanning.current) return

      isPanning.current = false
      canvas.dataset.cameraPanning = 'false'
      const controls = controlsRef.current
      if (controls) {
        controls.enabled = true
      }
      canvas.style.cursor = isSpaceHeld.current ? 'grab' : ''
    }

    // Also stop panning if window loses focus
    const handleBlur = () => {
      isSpaceHeld.current = false
      if (isPanning.current) {
        isPanning.current = false
        canvas.dataset.cameraPanning = 'false'
        const controls = controlsRef.current
        if (controls) {
          controls.enabled = true
        }
      }
      canvas.style.cursor = ''
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      canvas.dataset.cameraPanning = 'false'
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [camera, gl, controlsRef])

  return null
}
