import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useAppStore } from '../../store'
import type { FlightPathWithControlPoints } from '../../utils/flightPath'
import { resolveIdealLineGateInsertion } from '../../utils/gateInsertion'
import type { IdealLineHoverTarget } from '../../utils/idealLine'
import { FlightPath } from './FlightPath'
import type { FlightPathPointer } from './FlightPath'
import { FlightPathPointControls } from './FlightPathPointControls'

interface FlightPathEditorProps {
  data: FlightPathWithControlPoints
  controlsRef: RefObject<OrbitControlsImpl | null>
  fpvModeActive: boolean
}

interface PinnedTarget {
  target: IdealLineHoverTarget
  pointer: FlightPathPointer
}

export function FlightPathEditor({ data, controlsRef, fpvModeActive }: FlightPathEditorProps) {
  const [hover, setHover] = useState<IdealLineHoverTarget | null>(null)
  const [pointer, setPointer] = useState<FlightPathPointer | null>(null)
  const [pinned, setPinned] = useState<PinnedTarget | null>(null)
  const isDragging = useAppStore((state) => state.isDraggingGate)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const insertPoint = useAppStore((state) => state.insertFlightPathPoint)
  const openGateInsertionDialog = useAppStore((state) => state.openGateInsertionDialog)
  const canvas = useThree((state) => state.gl.domElement)

  const activeTarget = pinned?.target ?? hover
  const activePointer = pinned?.pointer ?? pointer

  const closeMenu = useCallback(() => {
    setPinned(null)
  }, [])

  const handleHover = useCallback((target: IdealLineHoverTarget | null, nextPointer: FlightPathPointer) => {
    setHover(target)
    setPointer(nextPointer)
  }, [])

  const handlePointerLeave = useCallback(() => {
    setHover(null)
    setPointer(null)
  }, [])

  useEffect(() => {
    if (!pinned) return

    const onDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node) || target === canvas) return
      if (document.querySelector('[data-ideal-line-hover]')?.contains(target)) return
      closeMenu()
    }

    document.addEventListener('pointerdown', onDocumentPointerDown, true)
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  }, [canvas, closeMenu, pinned])

  const handleClick = useCallback((target: IdealLineHoverTarget | null, clickPointer: FlightPathPointer) => {
    if (!target || isDragging) {
      closeMenu()
      return
    }

    setPinned((current) => current ? null : { target, pointer: clickPointer })
  }, [closeMenu, isDragging])

  const handleInsertPoint = useCallback(() => {
    if (!activeTarget || isDragging) {
      closeMenu()
      return
    }
    insertPoint(activeTarget)
    setHover(null)
    setPointer(null)
    closeMenu()
  }, [activeTarget, closeMenu, insertPoint, isDragging])

  const handleInsertGate = useCallback(() => {
    if (!activeTarget || isDragging || !currentTrack) {
      closeMenu()
      return
    }

    const insertion = resolveIdealLineGateInsertion({
      hover: activeTarget,
      legRefs: data.legRefs,
      sampledLegs: data.path.sampledLegs,
      sampledLegUs: data.sampledLegUs,
      gates: currentTrack.gates,
      gateSequence: currentTrack.gateSequence,
    })
    setHover(null)
    setPointer(null)
    closeMenu()
    if (!insertion) return
    openGateInsertionDialog(insertion)
  }, [activeTarget, closeMenu, currentTrack, data.legRefs, data.path.sampledLegs, data.sampledLegUs, isDragging, openGateInsertionDialog])

  const interaction = useMemo(() => ({
    mapping: {
      sampledLegIndexes: data.sampledLegIndexes,
      sampledLegUs: data.sampledLegUs,
      legRefs: data.legRefs,
    },
    onHover: handleHover,
    onLeave: handlePointerLeave,
    onClick: handleClick,
  }), [data.legRefs, data.sampledLegIndexes, data.sampledLegUs, handleClick, handleHover, handlePointerLeave])

  return (
    <>
      <FlightPath path={data.path} interaction={interaction} />
      <FlightPathPointControls
        data={data}
        hover={activeTarget}
        pointer={activePointer}
        menuOpen={pinned !== null}
        controlsRef={controlsRef}
        fpvModeActive={fpvModeActive}
        onInsertGate={handleInsertGate}
        onInsertPoint={handleInsertPoint}
      />
    </>
  )
}
