import { useCallback, useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import { useAppStore } from '../store'

type GatePosition = { x: number; y: number; z: number }

interface UseGateMoveDragOptions {
  gateId: string
  position: GatePosition
}

const RAYCASTER = new Raycaster()
const PRESS_DRAG_THRESHOLD_PX = 3

function setControlsEnabled(controls: unknown, enabled: boolean) {
  if (controls && typeof controls === 'object' && 'enabled' in controls) {
    ;(controls as { enabled: boolean }).enabled = enabled
  }
}

function getControlsEnabled(controls: unknown): boolean | undefined {
  return controls && typeof controls === 'object' && 'enabled' in controls
    ? (controls as { enabled: boolean }).enabled
    : undefined
}

/** Ground dragging for the move handle (immediate) and the gate body (press + travel). */
export function useGateMoveDrag({ gateId, position }: UseGateMoveDragOptions) {
  const { camera, gl, controls } = useThree()
  const [isMoving, setIsMoving] = useState(false)
  const isMovingRef = useRef(false)
  const stopMoveRef = useRef<(() => void) | null>(null)
  const stopPressRef = useRef<(() => void) | null>(null)
  const controlsEnabledBeforeDragRef = useRef<boolean | undefined>(undefined)

  const setGatePosition = useAppStore((state) => state.setGatePosition)
  const commitGateDrag = useAppStore((state) => state.commitGateDrag)
  const setDraggingGate = useAppStore((state) => state.setDraggingGate)
  const selectGate = useAppStore((state) => state.selectGate)

  const getGroundPoint = useCallback((clientX: number, clientY: number): { x: number; z: number } => {
    const rect = gl.domElement.getBoundingClientRect()
    const pointer = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    RAYCASTER.setFromCamera(pointer, camera)
    const direction = RAYCASTER.ray.direction.clone()
    const origin = RAYCASTER.ray.origin.clone()
    const hit = origin.add(direction.multiplyScalar(-origin.y / direction.y))
    return { x: hit.x, z: hit.z }
  }, [camera, gl])

  const restoreControls = useCallback(() => {
    const enabled = controlsEnabledBeforeDragRef.current
    if (enabled === undefined) return
    controlsEnabledBeforeDragRef.current = undefined
    setControlsEnabled(controls, enabled)
  }, [controls])

  const endMove = useCallback(() => {
    if (!isMovingRef.current) return
    isMovingRef.current = false
    setIsMoving(false)
    stopMoveRef.current?.()
    stopMoveRef.current = null
    restoreControls()
    // The click event fires after pointerup, so release the dragging flag later.
    setTimeout(() => {
      setDraggingGate(false)
    }, 0)
    commitGateDrag()
  }, [commitGateDrag, restoreControls, setDraggingGate])

  const beginMoveDrag = useCallback((clientX: number, clientY: number) => {
    if (isMovingRef.current) return

    if (controlsEnabledBeforeDragRef.current === undefined) {
      controlsEnabledBeforeDragRef.current = getControlsEnabled(controls)
    }
    const startPoint = getGroundPoint(clientX, clientY)
    const startPosition = { x: position.x, z: position.z }
    const y = position.y

    isMovingRef.current = true
    setIsMoving(true)
    setControlsEnabled(controls, false)
    setDraggingGate(true)

    const handlePointerMove = (event: PointerEvent) => {
      if (!isMovingRef.current) return
      const point = getGroundPoint(event.clientX, event.clientY)
      setGatePosition(gateId, {
        x: startPosition.x + point.x - startPoint.x,
        y,
        z: startPosition.z + point.z - startPoint.z,
      })
    }

    stopMoveRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', endMove)
      window.removeEventListener('pointercancel', endMove)
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', endMove)
    window.addEventListener('pointercancel', endMove)
  }, [
    controls,
    endMove,
    gateId,
    getGroundPoint,
    position.x,
    position.y,
    position.z,
    setDraggingGate,
    setGatePosition,
  ])

  const startPressDrag = useCallback((clientX: number, clientY: number) => {
    if (isMovingRef.current) return

    const controlsWereEnabled = getControlsEnabled(controls)
    if (controlsWereEnabled === false) return
    controlsEnabledBeforeDragRef.current = controlsWereEnabled

    const pressX = clientX
    const pressY = clientY
    setControlsEnabled(controls, false)

    const stopPress = () => {
      window.removeEventListener('pointermove', handlePressMove)
      window.removeEventListener('pointerup', handlePressUp)
      window.removeEventListener('pointercancel', handlePressUp)
      if (stopPressRef.current === stopPress) stopPressRef.current = null
    }

    const handlePressMove = (event: PointerEvent) => {
      const dx = event.clientX - pressX
      const dy = event.clientY - pressY
      if (Math.hypot(dx, dy) < PRESS_DRAG_THRESHOLD_PX) return

      stopPress()
      selectGate(gateId)
      beginMoveDrag(pressX, pressY)
    }

    const handlePressUp = () => {
      stopPress()
      restoreControls()
    }

    stopPressRef.current = stopPress
    window.addEventListener('pointermove', handlePressMove)
    window.addEventListener('pointerup', handlePressUp)
    window.addEventListener('pointercancel', handlePressUp)
  }, [beginMoveDrag, controls, gateId, restoreControls, selectGate])

  useEffect(() => {
    return () => {
      stopPressRef.current?.()
      stopPressRef.current = null
      if (!isMovingRef.current) return

      isMovingRef.current = false
      stopMoveRef.current?.()
      stopMoveRef.current = null
      setDraggingGate(false)
      restoreControls()
    }
  }, [restoreControls, setDraggingGate])

  return { isMoving, beginMoveDrag, startPressDrag }
}
