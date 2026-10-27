import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import { useAppStore } from '../store'

type DragMode = 'move' | 'elevate'

type PointTarget = { id: string; position: { x: number; y: number; z: number } }

interface UseFlightPathPointDragOptions {
  controlsRef: RefObject<{ enabled: boolean } | null>
  fpvModeActive: boolean
}

interface StartPressDragOptions {
  /** Shift + press on the point marker raises/lowers it instead of ground dragging. */
  vertical?: boolean
}

interface ActivePointDrag {
  pointerId: number
  pointId: string
  mode: DragMode
  startClientY: number
  startPosition: { x: number; y: number; z: number }
  startGround: { x: number; z: number } | null
  controlsEnabled: boolean
}

const RAYCASTER = new Raycaster()
const PRESS_DRAG_THRESHOLD_PX = 3
const METERS_PER_ELEVATION_PIXEL = 0.03

/** Ground dragging for ideal-line points: marker press + travel (Shift raises instead), and the immediate move/elevate handles. */
export function useFlightPathPointDrag({ controlsRef, fpvModeActive }: UseFlightPathPointDragOptions) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const dragRef = useRef<ActivePointDrag | null>(null)
  const [activeMode, setActiveMode] = useState<DragMode | null>(null)
  const selectedPointId = useAppStore((state) => state.selectedFlightPathPointId)
  const selectPoint = useAppStore((state) => state.selectFlightPathPoint)
  const setPointPosition = useAppStore((state) => state.setFlightPathPointPosition)
  const cancelDrag = useAppStore((state) => state.cancelFlightPathPointDrag)
  const commitDrag = useAppStore((state) => state.commitGateDrag)
  const setDraggingGate = useAppStore((state) => state.setDraggingGate)

  const intersectGround = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    RAYCASTER.setFromCamera(mouse, camera)
    const direction = RAYCASTER.ray.direction.clone()
    const origin = RAYCASTER.ray.origin.clone()
    const distance = -origin.y / direction.y
    return origin.add(direction.multiplyScalar(distance))
  }, [camera, gl])

  const finishDrag = useCallback((outcome: 'commit' | 'cancel') => {
    const drag = dragRef.current
    if (!drag) return

    dragRef.current = null
    setActiveMode(null)
    if (controlsRef.current) controlsRef.current.enabled = drag.controlsEnabled && !fpvModeActive
    setDraggingGate(false)
    if (outcome === 'commit') commitDrag()
    else cancelDrag()
  }, [cancelDrag, commitDrag, controlsRef, fpvModeActive, setDraggingGate])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      event.preventDefault()

      if (drag.mode === 'elevate') {
        const y = drag.startPosition.y + (drag.startClientY - event.clientY) * METERS_PER_ELEVATION_PIXEL
        setPointPosition(drag.pointId, { ...drag.startPosition, y })
        return
      }

      if (!drag.startGround) return
      const hit = intersectGround(event.clientX, event.clientY)
      setPointPosition(drag.pointId, {
        x: drag.startPosition.x + hit.x - drag.startGround.x,
        y: drag.startPosition.y,
        z: drag.startPosition.z + hit.z - drag.startGround.z,
      })
    }
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId === dragRef.current?.pointerId) finishDrag('commit')
    }
    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerId === dragRef.current?.pointerId) finishDrag('cancel')
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [finishDrag, intersectGround, setPointPosition])

  useEffect(() => {
    if (dragRef.current && dragRef.current.pointId !== selectedPointId) finishDrag('cancel')
  }, [finishDrag, selectedPointId])

  useEffect(() => {
    if (fpvModeActive && dragRef.current) finishDrag('cancel')
  }, [finishDrag, fpvModeActive])

  useEffect(() => () => {
    if (dragRef.current) finishDrag('cancel')
  }, [finishDrag])

  const beginDrag = useCallback((
    point: PointTarget,
    mode: DragMode,
    pointerId: number,
    clientX: number,
    clientY: number,
  ) => {
    if (dragRef.current) return

    const controls = controlsRef.current
    const controlsEnabled = controls?.enabled ?? true
    if (controlsEnabled === false) return

    const startGround = mode === 'move' ? intersectGround(clientX, clientY) : null
    dragRef.current = {
      pointerId,
      pointId: point.id,
      mode,
      startClientY: clientY,
      startPosition: { ...point.position },
      startGround: startGround ? { x: startGround.x, z: startGround.z } : null,
      controlsEnabled,
    }
    setActiveMode(mode)
    setDraggingGate(true)
    if (controls) controls.enabled = false
  }, [controlsRef, intersectGround, setDraggingGate])

  const startHandleDrag = useCallback((
    point: PointTarget,
    mode: DragMode,
    pointerId: number,
    clientX: number,
    clientY: number,
  ) => {
    beginDrag(point, mode, pointerId, clientX, clientY)
  }, [beginDrag])

  const startPressDrag = useCallback((
    point: PointTarget,
    pointerId: number,
    clientX: number,
    clientY: number,
    options?: StartPressDragOptions,
  ) => {
    if (dragRef.current) return

    const controls = controlsRef.current
    const controlsEnabled = controls?.enabled ?? true
    if (controlsEnabled === false) return

    const pressX = clientX
    const pressY = clientY

    const stopPress = () => {
      window.removeEventListener('pointermove', handlePressMove)
      window.removeEventListener('pointerup', handlePressUp)
      window.removeEventListener('pointercancel', handlePressUp)
    }

    const handlePressMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) < PRESS_DRAG_THRESHOLD_PX) return

      stopPress()
      selectPoint(point.id)
      beginDrag(point, options?.vertical ? 'elevate' : 'move', pointerId, pressX, pressY)
    }

    const handlePressUp = () => {
      stopPress()
    }

    window.addEventListener('pointermove', handlePressMove)
    window.addEventListener('pointerup', handlePressUp)
    window.addEventListener('pointercancel', handlePressUp)
  }, [beginDrag, controlsRef, selectPoint])

  return { activeMode, startHandleDrag, startPressDrag }
}
