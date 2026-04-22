import { useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useAppStore } from '../../store'

interface Point {
  x: number
  y: number
}

const DRAG_THRESHOLD_PX = 6

export function GateMarqueeSelection() {
  const { camera, gl } = useThree()
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setSelectedGates = useAppStore((state) => state.setSelectedGates)

  const [start, setStart] = useState<Point | null>(null)
  const [current, setCurrent] = useState<Point | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Point | null>(null)
  const currentRef = useRef<Point | null>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const canvas = gl.domElement

    const getCanvasPoint = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || canvas.dataset.cameraPanning === 'true') return

      const point = getCanvasPoint(event)
      dragStartRef.current = point
      currentRef.current = point
      isDraggingRef.current = false
      setIsDragging(false)
      setStart(point)
      setCurrent(point)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStartRef.current || canvas.dataset.cameraPanning === 'true') return

      const point = getCanvasPoint(event)
      const dx = point.x - dragStartRef.current.x
      const dy = point.y - dragStartRef.current.y

      if (!isDraggingRef.current) {
        const hasExceededDragThreshold = Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
        if (!hasExceededDragThreshold) return
        isDraggingRef.current = true
        setIsDragging(true)
      }

      currentRef.current = point
      setCurrent(point)
    }

    const handlePointerUp = () => {
      if (!dragStartRef.current) return

      if (isDraggingRef.current && currentTrack) {
        const from = dragStartRef.current
        const to = currentRef.current ?? dragStartRef.current

        const minX = Math.min(from.x, to.x)
        const maxX = Math.max(from.x, to.x)
        const minY = Math.min(from.y, to.y)
        const maxY = Math.max(from.y, to.y)

        const selectedGateIds = currentTrack.gates
          .filter((gate) => {
            const projected = new Vector3(gate.position.x, gate.position.y, gate.position.z).project(camera)
            const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth
            const y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight

            return projected.z >= -1 && projected.z <= 1 && x >= minX && x <= maxX && y >= minY && y <= maxY
          })
          .map((gate) => gate.id)

        setSelectedGates(selectedGateIds)
      }

      dragStartRef.current = null
      currentRef.current = null
      isDraggingRef.current = false
      setIsDragging(false)
      setStart(null)
      setCurrent(null)
    }

    const handleBlur = () => {
      dragStartRef.current = null
      currentRef.current = null
      isDraggingRef.current = false
      setIsDragging(false)
      setStart(null)
      setCurrent(null)
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [camera, currentTrack, gl, setSelectedGates])

  const selectionBox = useMemo(() => {
    if (!start || !current || !isDragging) return null

    const left = Math.min(start.x, current.x)
    const top = Math.min(start.y, current.y)
    const width = Math.abs(current.x - start.x)
    const height = Math.abs(current.y - start.y)

    return { left, top, width, height }
  }, [current, isDragging, start])

  if (!selectionBox) return null

  return (
    <Html fullscreen pointerEvents="none">
      <div
        className="absolute border border-cyan-400 bg-cyan-400/15"
        style={{
          left: selectionBox.left,
          top: selectionBox.top,
          width: selectionBox.width,
          height: selectionBox.height,
        }}
      />
    </Html>
  )
}
