import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { ArrowUpDown, Move, Plus, RotateCw, Trash2 } from 'lucide-react'
import type { GateType } from '../../types'
import { useAppStore } from '../../store'
import { calculateFlightPathWithControlPoints } from '../../utils/flightPath'
import { getClosestPathPoint } from '../../utils/idealLine'
import { Button } from '../ui/button'
import { useGateMoveDrag } from '../../hooks/useGateMoveDrag'
import { GATE_ELEVATION_METERS_PER_PIXEL } from '../../constants/gateDimensions'
import { useTranslation } from '@/i18n'

interface GateHandlesProps {
  gateId: string
  gateType: GateType
  position: { x: number; y: number; z: number }
  rotation: number
}

type GatePosition = { x: number; y: number; z: number }

type DragMode = 'none' | 'elevate' | 'rotate'
type InsertPosition = 'before' | 'after'

interface InsertControlConfig {
  direction: InsertPosition
  insertPosition: GatePosition
  handlePosition: GatePosition
  gateIndex: number
  sequenceIndex: number
}

const BASE_GATE_HEIGHT = 1.2
const FLAG_BASE_HEIGHT = 2
const FLAG_SMALL_BASE_HEIGHT = 1.2
const POST_THICKNESS = 0.06
const H_GATE_BACKREST_HEIGHT_MULTIPLIER = 1.85
const HANDLE_CLEARANCE_ABOVE_GATE = 0.5
const INSERT_HANDLE_OFFSET_Y = 0.9
const DEGREES_PER_PIXEL = 1
const ROTATION_SNAP_STEP_DEGREES = 15
const FALLBACK_INSERT_DISTANCE = 3
const GATE_HANDLE_Z_INDEX_RANGE: [number, number] = [30, 0]
const HANDLE_BUTTON_CLASSNAME = 'pointer-events-auto flex size-11 items-center justify-center rounded-full border shadow-lg shadow-black/30 backdrop-blur supports-backdrop-filter:backdrop-blur-sm transition-colors select-none touch-none'

function getMidpoint(a: GatePosition, b: GatePosition): GatePosition {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  }
}

function getWrappedSequenceIndex(index: number, length: number): number {
  return length > 0 ? (index + length) % length : -1
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

function getGateTopOffset(gateType: GateType): number {
  const height = BASE_GATE_HEIGHT
  const topBarHalfThickness = POST_THICKNESS / 2

  switch (gateType) {
    case 'h-gate':
      return height * H_GATE_BACKREST_HEIGHT_MULTIPLIER
    case 'double-h':
      return height + height * H_GATE_BACKREST_HEIGHT_MULTIPLIER
    case 'hurdle':
      return height + height * 0.9
    case 'double':
      return height * 2 + topBarHalfThickness
    case 'ladder':
      return height * 3 + topBarHalfThickness
    case 'start-finish':
      return height + 0.375
    case 'flag':
      return FLAG_BASE_HEIGHT
    case 'flag-small':
      return FLAG_SMALL_BASE_HEIGHT
    case 'octagonal-tunnel':
    case 'dive':
    case 'standard':
      return height + topBarHalfThickness
  }
}

export function GateHandles({ gateId, gateType, position, rotation }: GateHandlesProps) {
  const { t } = useTranslation()
  const { controls } = useThree()
  const { isMoving, beginMoveDrag } = useGateMoveDrag({ gateId, position })
  const modeRef = useRef<DragMode>('none')
  const [activeMode, setActiveMode] = useState<DragMode>('none')
  const openDeleteDialog = useAppStore((state) => state.openDeleteDialog)
  const closeDeleteDialog = useAppStore((state) => state.closeDeleteDialog)

  // Elevation refs
  const elevationDragStartYRef = useRef(0)
  const gateStartHeightRef = useRef(0)

  // Rotate refs
  const dragStartXRef = useRef(0)
  const startRotationRef = useRef(0)

  const setGatePosition = useAppStore((state) => state.setGatePosition)
  const setGateRotation = useAppStore((state) => state.setGateRotation)
  const commitGateDrag = useAppStore((state) => state.commitGateDrag)
  const setDraggingGate = useAppStore((state) => state.setDraggingGate)
  const snapGatesToGrid = useAppStore((state) => state.config.snapGatesToGrid)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const selectedGateId = useAppStore((state) => state.selectedGateId)
  const selectedGateIds = useAppStore((state) => state.selectedGateIds)
  const openGateInsertionDialog = useAppStore((state) => state.openGateInsertionDialog)
  // Stable refs for window listeners
  const gateIdRef = useRef(gateId)
  const positionRef = useRef(position)
  const controlsRef = useRef(controls)
  const setGatePositionRef = useRef(setGatePosition)
  const setGateRotationRef = useRef(setGateRotation)
  const commitRef = useRef(commitGateDrag)
  const setDraggingRef = useRef(setDraggingGate)
  const draggingReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapGatesToGridRef = useRef(snapGatesToGrid)

  useEffect(() => { gateIdRef.current = gateId }, [gateId])
  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { controlsRef.current = controls }, [controls])
  useEffect(() => { setGatePositionRef.current = setGatePosition }, [setGatePosition])
  useEffect(() => { setGateRotationRef.current = setGateRotation }, [setGateRotation])
  useEffect(() => { commitRef.current = commitGateDrag }, [commitGateDrag])
  useEffect(() => { setDraggingRef.current = setDraggingGate }, [setDraggingGate])
  useEffect(() => { snapGatesToGridRef.current = snapGatesToGrid }, [snapGatesToGrid])

  const isSingleSelectedGate = selectedGateIds.length === 1 && selectedGateId === gateId
  const gateSequence = useMemo(
    () => currentTrack?.gateSequence.map((entry) => entry.gateId) ?? [],
    [currentTrack?.gateSequence],
  )
  const flightPath = useMemo(
    () => currentTrack ? calculateFlightPathWithControlPoints(
      currentTrack.gates,
      currentTrack.gateSequence,
      currentTrack.idealLinePoints,
    ) : null,
    [currentTrack],
  )
  const selectedGateIndex = currentTrack?.gates.findIndex((gate) => gate.id === gateId) ?? -1
  const selectedGate = selectedGateIndex >= 0 ? currentTrack?.gates[selectedGateIndex] : null
  const moveRotateHandleY = position.y + getGateTopOffset(gateType) + HANDLE_CLEARANCE_ABOVE_GATE

  // Window-level listeners
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const mode = modeRef.current
      if (mode === 'none') return

      if (mode === 'rotate') {
        const dx = e.clientX - dragStartXRef.current
        const rawRotation = startRotationRef.current + dx * DEGREES_PER_PIXEL
        const newRotation = snapGatesToGridRef.current
          ? Math.round(rawRotation / ROTATION_SNAP_STEP_DEGREES) * ROTATION_SNAP_STEP_DEGREES
          : rawRotation
        setGateRotationRef.current(gateIdRef.current, newRotation)
      }

      if (mode === 'elevate') {
        const pointerDeltaY = elevationDragStartYRef.current - e.clientY
        const y = Math.max(0, gateStartHeightRef.current + pointerDeltaY * GATE_ELEVATION_METERS_PER_PIXEL)
        setGatePositionRef.current(gateIdRef.current, {
          ...positionRef.current,
          y,
        })
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
  }, [])

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

    const neighborSequenceIndex = selectedSequenceIndex >= 0
      ? getWrappedSequenceIndex(
        direction === 'before' ? selectedSequenceIndex - 1 : selectedSequenceIndex + 1,
        gateSequence.length,
      )
      : -1
    const neighborId = gateSequence[neighborSequenceIndex]
    const neighborGate = neighborId
      ? currentTrack.gates.find((gate) => gate.id === neighborId)
      : null

    const fallbackPosition = getFallbackInsertPosition(selectedGate.position, selectedGate.rotation, direction, currentTrack.fieldSize)
    const centerTarget = neighborGate ? getMidpoint(selectedGate.position, neighborGate.position) : fallbackPosition
    const pathLegIndex = direction === 'before' ? neighborSequenceIndex : selectedSequenceIndex
    const pathPoints = pathLegIndex >= 0 ? flightPath?.path.sampledLegs[pathLegIndex] ?? [] : []
    const closestPathPoint = getClosestPathPoint(centerTarget, pathPoints)
    const insertPosition = clampPositionToField({
      x: closestPathPoint?.x ?? centerTarget.x,
      y: selectedGate.position.y,
      z: closestPathPoint?.z ?? centerTarget.z,
    }, currentTrack.fieldSize)
    const handlePosition = closestPathPoint
      ? { x: insertPosition.x, y: closestPathPoint.y, z: insertPosition.z }
      : { x: insertPosition.x, y: insertPosition.y + INSERT_HANDLE_OFFSET_Y, z: insertPosition.z }

    return {
      direction,
      insertPosition,
      handlePosition,
      gateIndex: direction === 'before' ? selectedGateIndex : selectedGateIndex + 1,
      sequenceIndex: insertionSequenceIndex,
    }
  }, [currentTrack, flightPath?.path.sampledLegs, gateId, gateSequence, selectedGate, selectedGateIndex])

  const handleOpenInsertDialog = useCallback((control: InsertControlConfig) => {
    if (!currentTrack || !selectedGate) return
    openGateInsertionDialog({
      gateIndex: control.gateIndex,
      sequenceIndex: control.sequenceIndex,
      position: control.insertPosition,
      rotation: selectedGate.rotation,
    })
  }, [currentTrack, openGateInsertionDialog, selectedGate])

  const beforeInsertControl = isSingleSelectedGate ? getInsertControlConfig('before') : null
  const afterInsertControl = isSingleSelectedGate ? getInsertControlConfig('after') : null

  const handleMoveDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()

      beginMoveDrag(e.clientX, e.clientY)
    },
    [beginMoveDrag],
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

  const handleElevateDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      disableControls()

      modeRef.current = 'elevate'
      setActiveMode('elevate')
      setDraggingGate(true)
      if (draggingReleaseTimeoutRef.current) {
        clearTimeout(draggingReleaseTimeoutRef.current)
        draggingReleaseTimeoutRef.current = null
      }

      elevationDragStartYRef.current = e.clientY
      gateStartHeightRef.current = position.y
    },
    [position.y, setDraggingGate, disableControls],
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

    return (
      <Html
        key={control.direction}
        position={[
          control.handlePosition.x,
          control.handlePosition.y,
          control.handlePosition.z,
        ]}
        center
        distanceFactor={9}
        zIndexRange={GATE_HANDLE_Z_INDEX_RANGE}
        style={{ pointerEvents: 'none' }}
      >
        <div className="relative flex flex-col items-center gap-2 pointer-events-auto">
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
              closeDeleteDialog()
              handleOpenInsertDialog(control)
            }}
            aria-label={`${gateId} ${control.direction === 'before' ? t('before') : t('after')} ${t('insert')}`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </Html>
    )
  }

  return (
    <>
      {renderInsertControl(beforeInsertControl, t('before'))}
      {renderInsertControl(afterInsertControl, t('after'))}

      <Html
        position={[position.x, moveRotateHandleY, position.z]}
        center
        distanceFactor={8}
        zIndexRange={GATE_HANDLE_Z_INDEX_RANGE}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ display: 'flex', gap: 24, pointerEvents: 'none' }}>
          {/* Move handle (left) */}
          <button
            type="button"
            aria-label={`${gateId} ${t('move')}`}
            onPointerDown={handleMoveDown}
            className={`${HANDLE_BUTTON_CLASSNAME} ${isMoving
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-primary/40 bg-surface-elevated/95 text-primary hover:bg-surface-hover'
            }`}
            style={{ cursor: isMoving ? 'grabbing' : 'grab' }}
          >
            <Move size={22} />
          </button>

          {/* Elevation handle (middle) */}
          <button
            type="button"
            aria-label={`${gateId} ${t('adjustHeight')}`}
            onPointerDown={handleElevateDown}
            className={`${HANDLE_BUTTON_CLASSNAME} ${activeMode === 'elevate'
              ? 'border-accent bg-accent text-accent-foreground'
              : 'border-accent/60 bg-surface-elevated/95 text-accent-foreground hover:bg-surface-hover'
            }`}
            style={{ cursor: 'ns-resize' }}
          >
            <ArrowUpDown size={22} />
          </button>

          {/* Rotate handle (right) */}
          <button
            type="button"
            aria-label={`${gateId} ${t('rotate')}`}
            onPointerDown={handleRotateDown}
            className={`${HANDLE_BUTTON_CLASSNAME} ${activeMode === 'rotate'
              ? 'border-secondary bg-secondary text-secondary-foreground'
              : 'border-border bg-surface-elevated/95 text-foreground hover:bg-surface-hover'
            }`}
            style={{ cursor: 'ew-resize' }}
          >
            <RotateCw size={22} />
          </button>

          {isSingleSelectedGate && (
            <button
              type="button"
              aria-label={`${gateId} ${t('delete')}`}
              onPointerDown={stopHtmlInteraction}
              onClick={(event) => {
                stopHtmlInteraction(event)
                openDeleteDialog()
              }}
              className={`${HANDLE_BUTTON_CLASSNAME} border-destructive/60 bg-destructive text-destructive-foreground hover:bg-destructive/90`}
            >
              <Trash2 size={22} />
            </button>
          )}
        </div>
      </Html>
    </>
  )
}
