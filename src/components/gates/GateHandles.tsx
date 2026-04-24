import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vector2, Raycaster } from 'three'
import { Move, Plus, RotateCw, Trash2 } from 'lucide-react'
import type { GateType } from '../../types'
import { useAppStore } from '../../store'
import { createDefaultGateOpenings } from '../../utils/gateOpenings'
import { Button } from '../ui/button'

interface GateHandlesProps {
  gateId: string
  position: { x: number; y: number; z: number }
  rotation: number
}

type GatePosition = { x: number; y: number; z: number }

type DragMode = 'none' | 'move' | 'rotate'
type InsertPosition = 'before' | 'after'

interface InsertControlConfig {
  direction: InsertPosition
  midpoint: GatePosition
  gateIndex: number
  sequenceIndex: number
}

const RAYCASTER = new Raycaster()
const HANDLE_OFFSET_Y = 1.5
const INSERT_HANDLE_OFFSET_Y = 0.9
const DELETE_HANDLE_OFFSET_Y = 0.35
const DEGREES_PER_PIXEL = 1
const FALLBACK_INSERT_DISTANCE = 3
const HANDLE_BUTTON_CLASSNAME = 'pointer-events-auto flex size-11 items-center justify-center rounded-full border shadow-lg shadow-black/30 backdrop-blur supports-backdrop-filter:backdrop-blur-sm transition-colors select-none touch-none'

const GATE_TYPE_OPTIONS: { type: GateType; label: string }[] = [
  { type: 'start-finish', label: 'Start/Ziel' },
  { type: 'standard', label: 'Standard' },
  { type: 'h-gate', label: 'H-Gate' },
  { type: 'double-h', label: 'Doppel-H-Gate' },
  { type: 'dive', label: 'Dive' },
  { type: 'double', label: 'Double' },
  { type: 'ladder', label: 'Ladder' },
  { type: 'flag', label: 'Flag' },
]

function getMidpoint(a: GatePosition, b: GatePosition): GatePosition {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  }
}

function clampPositionToField(position: GatePosition, fieldSize: { width: number; height: number }): GatePosition {
  const halfWidth = fieldSize.width / 2
  const halfHeight = fieldSize.height / 2

  return {
    x: Math.max(-halfWidth, Math.min(halfWidth, position.x)),
    y: position.y,
    z: Math.max(-halfHeight, Math.min(halfHeight, position.z)),
  }
}

function getFallbackInsertPosition(
  position: GatePosition,
  rotation: number,
  direction: InsertPosition,
  fieldSize: { width: number; height: number },
): GatePosition {
  const radians = rotation * (Math.PI / 180)
  const directionMultiplier = direction === 'before' ? -1 : 1

  return clampPositionToField({
    x: position.x + Math.sin(radians) * FALLBACK_INSERT_DISTANCE * directionMultiplier,
    y: position.y,
    z: position.z + Math.cos(radians) * FALLBACK_INSERT_DISTANCE * directionMultiplier,
  }, fieldSize)
}

export function GateHandles({ gateId, position, rotation }: GateHandlesProps) {
  const { camera, gl, controls } = useThree()
  const modeRef = useRef<DragMode>('none')
  const [activeMode, setActiveMode] = useState<DragMode>('none')
  const [activeInsertPosition, setActiveInsertPosition] = useState<InsertPosition | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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
  const currentTrack = useAppStore((state) => state.currentTrack)
  const selectedGateId = useAppStore((state) => state.selectedGateId)
  const selectedGateIds = useAppStore((state) => state.selectedGateIds)
  const insertGateAtIndex = useAppStore((state) => state.insertGateAtIndex)
  const deleteSelectedGates = useAppStore((state) => state.deleteSelectedGates)

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
  const draggingReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const isSingleSelectedGate = selectedGateIds.length === 1 && selectedGateId === gateId
  const gateSequence = useMemo(
    () => currentTrack?.gateSequence.map((entry) => entry.gateId) ?? [],
    [currentTrack?.gateSequence],
  )
  const selectedGateIndex = currentTrack?.gates.findIndex((gate) => gate.id === gateId) ?? -1
  const selectedGate = selectedGateIndex >= 0 ? currentTrack?.gates[selectedGateIndex] : null

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
      if (draggingReleaseTimeoutRef.current) {
        clearTimeout(draggingReleaseTimeoutRef.current)
      }
      draggingReleaseTimeoutRef.current = setTimeout(() => {
        setDraggingRef.current(false)
      }, 0)
      
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
      if (draggingReleaseTimeoutRef.current) {
        clearTimeout(draggingReleaseTimeoutRef.current)
      }
    }
  }, [intersectGround])

  const disableControls = useCallback(() => {
    const currentControls = controlsRef.current
    if (currentControls && 'enabled' in currentControls) {
      ;(currentControls as { enabled: boolean }).enabled = false
    }
  }, [])

  const stopHtmlInteraction = useCallback((event: React.PointerEvent | React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if ('nativeEvent' in event && 'stopImmediatePropagation' in event.nativeEvent) {
      event.nativeEvent.stopImmediatePropagation()
    }
  }, [])

  const getInsertControlConfig = useCallback((direction: InsertPosition): InsertControlConfig | null => {
    if (!currentTrack || !selectedGate || selectedGateIndex < 0) return null

    const selectedSequenceIndex = direction === 'before'
      ? gateSequence.indexOf(gateId)
      : gateSequence.lastIndexOf(gateId)

    const insertionSequenceIndex = direction === 'before'
      ? Math.max(0, selectedSequenceIndex)
      : selectedSequenceIndex >= 0
        ? selectedSequenceIndex + 1
        : currentTrack.gateSequence.length

    const neighborSequenceIndex = direction === 'before'
      ? selectedSequenceIndex - 1
      : selectedSequenceIndex + 1
    const neighborId = gateSequence[neighborSequenceIndex]
    const neighborGate = neighborId
      ? currentTrack.gates.find((gate) => gate.id === neighborId)
      : null

    return {
      direction,
      midpoint: neighborGate
        ? getMidpoint(selectedGate.position, neighborGate.position)
        : getFallbackInsertPosition(selectedGate.position, selectedGate.rotation, direction, currentTrack.fieldSize),
      gateIndex: direction === 'before' ? selectedGateIndex : selectedGateIndex + 1,
      sequenceIndex: insertionSequenceIndex,
    }
  }, [currentTrack, gateId, gateSequence, selectedGate, selectedGateIndex])

  const handleInsertGate = useCallback((control: InsertControlConfig, type: GateType) => {
    if (!currentTrack || !selectedGate) return
    const id = crypto.randomUUID()

    insertGateAtIndex(
      {
        id,
        type,
        position: control.midpoint,
        rotation: selectedGate.rotation,
        size: currentTrack.gateSize,
        openings: createDefaultGateOpenings(type, currentTrack.gateSize, id),
      },
      control.gateIndex,
      control.sequenceIndex,
    )
    setActiveInsertPosition(null)
  }, [currentTrack, insertGateAtIndex, selectedGate])

  const handleDeleteConfirm = useCallback(() => {
    deleteSelectedGates()
    setIsDeleteDialogOpen(false)
  }, [deleteSelectedGates])

  const beforeInsertControl = isSingleSelectedGate ? getInsertControlConfig('before') : null
  const afterInsertControl = isSingleSelectedGate ? getInsertControlConfig('after') : null

  const handleMoveDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      disableControls()

      modeRef.current = 'move'
      setActiveMode('move')
      setDraggingGate(true)
      if (draggingReleaseTimeoutRef.current) {
        clearTimeout(draggingReleaseTimeoutRef.current)
        draggingReleaseTimeoutRef.current = null
      }

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
      if (draggingReleaseTimeoutRef.current) {
        clearTimeout(draggingReleaseTimeoutRef.current)
        draggingReleaseTimeoutRef.current = null
      }

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
        if (draggingReleaseTimeoutRef.current) {
          clearTimeout(draggingReleaseTimeoutRef.current)
          draggingReleaseTimeoutRef.current = null
        }
        const currentControls = controlsRef.current
        if (currentControls && 'enabled' in currentControls) {
          ;(currentControls as { enabled: boolean }).enabled = true
        }
      }
    }
  }, [setDraggingGate])

  const renderInsertControl = (control: InsertControlConfig | null, label: string) => {
    if (!control) return null

    const isOpen = activeInsertPosition === control.direction

    return (
      <Html
        key={control.direction}
        position={[
          control.midpoint.x,
          control.midpoint.y + INSERT_HANDLE_OFFSET_Y,
          control.midpoint.z,
        ]}
        center
        distanceFactor={9}
        style={{ pointerEvents: 'none' }}
      >
        <div className="relative flex flex-col items-center gap-2 pointer-events-auto">
          {isOpen && (
            <div
              className="grid w-40 grid-cols-2 gap-1 rounded-xl border border-border bg-popover/95 p-2 text-xs shadow-xl shadow-black/35 backdrop-blur supports-backdrop-filter:backdrop-blur-sm"
              onPointerDown={stopHtmlInteraction}
              onClick={stopHtmlInteraction}
            >
              {GATE_TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.type}
                  variant="outline"
                  size="xs"
                  className="h-auto justify-start py-1.5"
                  onPointerDown={stopHtmlInteraction}
                  onClick={(event) => {
                    stopHtmlInteraction(event)
                    handleInsertGate(control, option.type)
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
          <div className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-md shadow-black/20 backdrop-blur">
            {label}
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full border-border bg-surface-elevated/95 text-primary shadow-lg shadow-black/30 backdrop-blur supports-backdrop-filter:backdrop-blur-sm hover:bg-surface-hover"
            onPointerDown={stopHtmlInteraction}
            onClick={(event) => {
              stopHtmlInteraction(event)
              setIsDeleteDialogOpen(false)
              setActiveInsertPosition((current) => current === control.direction ? null : control.direction)
            }}
            aria-label={`Insert ${control.direction} ${gateId}`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </Html>
    )
  }

  return (
    <>
      {renderInsertControl(beforeInsertControl, 'Before')}
      {renderInsertControl(afterInsertControl, 'After')}

      {isSingleSelectedGate && (
        <>
          <Html
            position={[position.x, DELETE_HANDLE_OFFSET_Y, position.z]}
            center
            distanceFactor={9}
            style={{ pointerEvents: 'none' }}
          >
            <Button
              variant="destructive"
              size="sm"
              className="pointer-events-auto shadow-lg shadow-black/35"
              onPointerDown={stopHtmlInteraction}
              onClick={(event) => {
                stopHtmlInteraction(event)
                setActiveInsertPosition(null)
                setIsDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="size-3.5" />
              Delete gate
            </Button>
          </Html>

          {isDeleteDialogOpen && (
            <Html
              position={[position.x, position.y + HANDLE_OFFSET_Y + 0.45, position.z]}
              center
              distanceFactor={10}
              style={{ pointerEvents: 'none' }}
            >
              <div
                className="pointer-events-auto w-64 rounded-xl border border-border bg-popover/95 p-3 text-sm text-popover-foreground shadow-xl shadow-black/35 backdrop-blur supports-backdrop-filter:backdrop-blur-sm"
                onPointerDown={stopHtmlInteraction}
                onClick={stopHtmlInteraction}
              >
                <div className="space-y-1">
                  <p className="font-medium">Delete selected gate?</p>
                  <p className="text-xs text-muted-foreground">
                    This removes the selected gate from the course and clears its current selection.
                  </p>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onPointerDown={stopHtmlInteraction}
                    onClick={(event) => {
                      stopHtmlInteraction(event)
                      setIsDeleteDialogOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onPointerDown={stopHtmlInteraction}
                    onClick={(event) => {
                      stopHtmlInteraction(event)
                      handleDeleteConfirm()
                    }}
                  >
                    Delete gate
                  </Button>
                </div>
              </div>
            </Html>
          )}
        </>
      )}

      <Html
        position={[position.x, position.y + HANDLE_OFFSET_Y, position.z]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ display: 'flex', gap: 24, pointerEvents: 'none' }}>
          {/* Move handle (left) */}
          <button
            type="button"
            aria-label={`Move ${gateId}`}
            onPointerDown={handleMoveDown}
            className={`${HANDLE_BUTTON_CLASSNAME} ${activeMode === 'move'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-primary/40 bg-surface-elevated/95 text-primary hover:bg-surface-hover'
            }`}
            style={{ cursor: activeMode === 'move' ? 'grabbing' : 'grab' }}
          >
            <Move size={22} />
          </button>

          {/* Rotate handle (right) */}
          <button
            type="button"
            aria-label={`Rotate ${gateId}`}
            onPointerDown={handleRotateDown}
            className={`${HANDLE_BUTTON_CLASSNAME} ${activeMode === 'rotate'
              ? 'border-secondary bg-secondary text-secondary-foreground'
              : 'border-border bg-surface-elevated/95 text-foreground hover:bg-surface-hover'
            }`}
            style={{ cursor: 'ew-resize' }}
          >
            <RotateCw size={22} />
          </button>
        </div>
      </Html>
    </>
  )
}
