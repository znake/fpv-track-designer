import { useCallback, useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vector2, Raycaster } from 'three'
import { useAppStore } from '../../store'
import { Move, RotateCw } from 'lucide-react'

interface GateHandlesProps {
  gateId: string
  position: { x: number; y: number; z: number }
  rotation: number
}

type DragMode = 'none' | 'move' | 'rotate'

const RAYCASTER = new Raycaster()
const HANDLE_OFFSET_Y = 1.5
const DEGREES_PER_PIXEL = 1

export function GateHandles({ gateId, position, rotation }: GateHandlesProps) {
  const { camera, gl, controls } = useThree()
  const modeRef = useRef<DragMode>('none')
  const [activeMode, setActiveMode] = useState<DragMode>('none')

  // Move refs
  const dragStartRef = useRef<{ x: number; z: number } | null>(null)
  const gateStartPosRef = useRef<{ x: number; z: number } | null>(null)

  // Rotate refs
  const dragStartXRef = useRef(0)
  const startRotationRef = useRef(0)

  const setGatePosition = useAppStore((state) => state.setGatePosition)
  const setGateRotation = useAppStore((state) => state.setGateRotation)
  const commitGateDrag = useAppStore((state) => state.commitGateDrag)
  const setDraggingGate = useAppStore((state) => state.setDraggingGate)
  const fieldSize = useAppStore((state) => state.config.fieldSize)

  // Stable refs for window listeners
  const gateIdRef = useRef(gateId)
  const positionRef = useRef(position)
  const fieldSizeRef = useRef(fieldSize)
  const cameraRef = useRef(camera)
  const glRef = useRef(gl)
  const controlsRef = useRef(controls)
  const setGatePositionRef = useRef(setGatePosition)
  const setGateRotationRef = useRef(setGateRotation)
  const commitRef = useRef(commitGateDrag)
  const setDraggingRef = useRef(setDraggingGate)

  useEffect(() => { gateIdRef.current = gateId }, [gateId])
  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { fieldSizeRef.current = fieldSize }, [fieldSize])
  useEffect(() => { cameraRef.current = camera }, [camera])
  useEffect(() => { glRef.current = gl }, [gl])
  useEffect(() => { controlsRef.current = controls }, [controls])
  useEffect(() => { setGatePositionRef.current = setGatePosition }, [setGatePosition])
  useEffect(() => { setGateRotationRef.current = setGateRotation }, [setGateRotation])
  useEffect(() => { commitRef.current = commitGateDrag }, [commitGateDrag])
  useEffect(() => { setDraggingRef.current = setDraggingGate }, [setDraggingGate])

  const intersectGround = useCallback((clientX: number, clientY: number) => {
    const rect = glRef.current.domElement.getBoundingClientRect()
    const mouse = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    RAYCASTER.setFromCamera(mouse, cameraRef.current)
    const dir = RAYCASTER.ray.direction.clone()
    const ori = RAYCASTER.ray.origin.clone()
    const t = -ori.y / dir.y
    return ori.add(dir.multiplyScalar(t))
  }, [])

  // Window-level listeners
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const mode = modeRef.current
      if (mode === 'none') return

      if (mode === 'move') {
        if (!dragStartRef.current || !gateStartPosRef.current) return
        const hit = intersectGround(e.clientX, e.clientY)
        const dx = hit.x - dragStartRef.current.x
        const dz = hit.z - dragStartRef.current.z
        const fs = fieldSizeRef.current
        const halfW = fs.width / 2
        const halfH = fs.height / 2
        const x = Math.max(-halfW, Math.min(halfW, gateStartPosRef.current.x + dx))
        const z = Math.max(-halfH, Math.min(halfH, gateStartPosRef.current.z + dz))
        setGatePositionRef.current(gateIdRef.current, {
          x, y: positionRef.current.y, z,
        })
      }

      if (mode === 'rotate') {
        const dx = e.clientX - dragStartXRef.current
        const newRotation = startRotationRef.current + dx * DEGREES_PER_PIXEL
        setGateRotationRef.current(gateIdRef.current, newRotation)
      }
    }

    const onPointerUp = () => {
      if (modeRef.current === 'none') return
      modeRef.current = 'none'
      setActiveMode('none')
      setDraggingRef.current(false)

      const ctrl = controlsRef.current
      if (ctrl && 'enabled' in ctrl) {
        ;(ctrl as { enabled: boolean }).enabled = true
      }

      commitRef.current()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [intersectGround])

  const disableControls = useCallback(() => {
    if (controls && 'enabled' in controls) {
      ;(controls as { enabled: boolean }).enabled = false
    }
  }, [controls])

  const handleMoveDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      disableControls()

      modeRef.current = 'move'
      setActiveMode('move')
      setDraggingGate(true)

      const hit = intersectGround(e.clientX, e.clientY)
      dragStartRef.current = { x: hit.x, z: hit.z }
      gateStartPosRef.current = { x: position.x, z: position.z }
    },
    [position, intersectGround, setDraggingGate, disableControls],
  )

  const handleRotateDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      disableControls()

      modeRef.current = 'rotate'
      setActiveMode('rotate')
      setDraggingGate(true)

      dragStartXRef.current = e.clientX
      startRotationRef.current = rotation
    },
    [rotation, setDraggingGate, disableControls],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modeRef.current !== 'none') {
        modeRef.current = 'none'
        setDraggingGate(false)
        if (controls && 'enabled' in controls) {
          ;(controls as { enabled: boolean }).enabled = true
        }
      }
    }
  }, [setDraggingGate, controls])

  const buttonBase: React.CSSProperties = {
    pointerEvents: 'auto',
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    transition: 'background-color 0.15s ease',
    userSelect: 'none',
    touchAction: 'none',
  }

  return (
    <Html
      position={[position.x, position.y + HANDLE_OFFSET_Y, position.z]}
      center
      distanceFactor={8}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{ display: 'flex', gap: 24, pointerEvents: 'none' }}>
        {/* Move handle (left) */}
        <div
          onPointerDown={handleMoveDown}
          style={{
            ...buttonBase,
            backgroundColor: activeMode === 'move'
              ? 'rgba(96, 165, 250, 0.95)'
              : 'rgba(15, 23, 42, 0.85)',
            border: '2px solid rgba(96, 165, 250, 0.6)',
            color: '#60a5fa',
            cursor: activeMode === 'move' ? 'grabbing' : 'grab',
          }}
        >
          <Move size={22} />
        </div>

        {/* Rotate handle (right) */}
        <div
          onPointerDown={handleRotateDown}
          style={{
            ...buttonBase,
            backgroundColor: activeMode === 'rotate'
              ? 'rgba(251, 146, 60, 0.95)'
              : 'rgba(15, 23, 42, 0.85)',
            border: '2px solid rgba(251, 146, 60, 0.6)',
            color: '#fb923c',
            cursor: 'ew-resize',
          }}
        >
          <RotateCw size={22} />
        </div>
      </div>
    </Html>
  )
}
