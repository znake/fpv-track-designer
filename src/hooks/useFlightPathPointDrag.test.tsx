import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera } from 'three'
import { useAppStore } from '../store'
import type { Track } from '../types'
import { createDefaultGateOpenings } from '../utils/gateOpenings'
import { useFlightPathPointDrag } from './useFlightPathPointDrag'

const CANVAS_RECT = { left: 0, top: 0, width: 800, height: 600 }
const camera = new PerspectiveCamera(50, CANVAS_RECT.width / CANVAS_RECT.height, 0.1, 1000)
camera.position.set(0, 30, 30)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()

const controls = { enabled: true }
const gl = {
  domElement: {
    getBoundingClientRect: () => ({
      ...CANVAS_RECT,
      right: CANVAS_RECT.width,
      bottom: CANVAS_RECT.height,
      x: 0,
      y: 0,
      toJSON: () => CANVAS_RECT,
    }),
  },
}

vi.mock('@react-three/fiber', () => ({
  useThree: (selector?: (state: { camera: PerspectiveCamera; gl: typeof gl }) => unknown) => {
    const state = { camera, gl }
    return selector ? selector(state) : state
  },
}))

const startOpenings = createDefaultGateOpenings('standard')
const endOpenings = createDefaultGateOpenings('standard')
const POINT_POSITION = { x: 0, y: 1, z: 0 }

const createTrack = (): Track => ({
  id: 'track',
  name: 'Track',
  gates: [
    { id: 'gate-1', type: 'standard', position: { x: -5, y: 0, z: 0 }, rotation: 0, openings: startOpenings },
    { id: 'gate-2', type: 'standard', position: { x: 5, y: 0, z: 0 }, rotation: 0, openings: endOpenings },
  ],
  gateSequence: [
    { gateId: 'gate-1', openingId: startOpenings[0].id, reverse: false },
    { gateId: 'gate-2', openingId: endOpenings[0].id, reverse: false },
  ],
  fieldSize: { width: 30, height: 15 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  idealLinePoints: [{
    id: 'point-1',
    leg: {
      from: { gateId: 'gate-1', openingId: startOpenings[0].id },
      to: { gateId: 'gate-2', openingId: endOpenings[0].id },
    },
    u: 0.5,
    position: { ...POINT_POSITION },
  }],
})

function DragProbe() {
  const point = useAppStore((state) => state.currentTrack?.idealLinePoints?.[0])
  const controlsRef = useRef<{ enabled: boolean } | null>(controls)
  const { startHandleDrag, startPressDrag } = useFlightPathPointDrag({ controlsRef, fpvModeActive: false })
  if (!point) return null

  return (
    <>
      <button
        type="button"
        data-testid="point-marker"
        onPointerDown={(event) => startPressDrag(point, event.pointerId, event.clientX, event.clientY)}
      />
      <button
        type="button"
        data-testid="point-marker-vertical"
        onPointerDown={(event) => startPressDrag(point, event.pointerId, event.clientX, event.clientY, { vertical: true })}
      />
      <button
        type="button"
        data-testid="move-handle"
        onPointerDown={(event) => startHandleDrag(point, 'move', event.pointerId, event.clientX, event.clientY)}
      />
      <button
        type="button"
        data-testid="elevate-handle"
        onPointerDown={(event) => startHandleDrag(point, 'elevate', event.pointerId, event.clientX, event.clientY)}
      />
    </>
  )
}

const pointer = (type: string, clientX: number, clientY: number) =>
  new PointerEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0, pointerType: 'mouse' })

const dispatch = (target: EventTarget, event: Event) => {
  act(() => {
    target.dispatchEvent(event)
  })
}

const pointPosition = () => useAppStore.getState().currentTrack?.idealLinePoints?.[0].position

describe('useFlightPathPointDrag', () => {
  beforeEach(() => {
    controls.enabled = true
    useAppStore.setState({
      currentTrack: createTrack(),
      config: {
        ...useAppStore.getState().config,
        fieldSize: { width: 30, height: 15 },
        snapGatesToGrid: false,
      },
      selectedGateId: null,
      selectedGateIds: [],
      selectedFlightPathPointId: null,
      past: [],
      future: [],
      dragHistoryEntry: null,
      isTrackModified: false,
      isDraggingGate: false,
    })
  })

  it('moves the point on the ground plane when the marker is pressed and dragged', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('point-marker'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 410, 300))
    dispatch(window, pointer('pointermove', 500, 300))

    const position = pointPosition()
    expect(position?.x).toBeGreaterThan(0)
    expect(position?.z).toBeCloseTo(0, 6)
    expect(position?.y).toBe(1)
    expect(useAppStore.getState().selectedFlightPathPointId).toBe('point-1')
  })

  it('keeps a press without real pointer travel a plain click', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('point-marker'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 402, 300))
    dispatch(window, pointer('pointerup', 402, 300))

    expect(pointPosition()).toEqual(POINT_POSITION)
    expect(useAppStore.getState().selectedFlightPathPointId).toBeNull()
    expect(useAppStore.getState().isDraggingGate).toBe(false)
    expect(useAppStore.getState().past).toHaveLength(0)
    expect(controls.enabled).toBe(true)
  })

  it('raises the point vertically in elevation mode during a marker drag', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('point-marker-vertical'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 400, 290))
    dispatch(window, pointer('pointermove', 400, 200))

    const position = pointPosition()
    expect(position?.y).toBeCloseTo(1 + 100 * 0.03, 6)
    expect(position?.x).toBe(0)
    expect(position?.z).toBe(0)
    expect(useAppStore.getState().selectedFlightPathPointId).toBe('point-1')

    dispatch(window, pointer('pointerup', 400, 200))

    expect(useAppStore.getState().isDraggingGate).toBe(false)
    expect(useAppStore.getState().past).toHaveLength(1)
    expect(controls.enabled).toBe(true)
  })

  it('stops the vertically dragged point at ground level', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('point-marker-vertical'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 400, 310))
    dispatch(window, pointer('pointermove', 400, 2000))

    expect(pointPosition()?.y).toBe(0)
  })

  it('clamps the dragged point to the field bounds', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('point-marker'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 410, 300))
    dispatch(window, pointer('pointermove', 5000, 300))

    expect(pointPosition()?.x).toBe(15)
  })

  it('moves immediately when the move handle starts the drag', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('move-handle'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 500, 300))

    expect(pointPosition()?.x).toBeGreaterThan(0)
    expect(useAppStore.getState().selectedFlightPathPointId).toBeNull()
  })

  it('elevates immediately when the height handle starts the drag', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('elevate-handle'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 400, 200))

    expect(pointPosition()?.y).toBeCloseTo(1 + 100 * 0.03, 6)
    expect(pointPosition()?.x).toBe(0)
  })

  it('commits one undo entry per completed drag', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('point-marker'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 410, 300))
    dispatch(window, pointer('pointermove', 460, 300))
    dispatch(window, pointer('pointermove', 500, 300))
    expect(useAppStore.getState().isDraggingGate).toBe(true)

    dispatch(window, pointer('pointerup', 500, 300))

    expect(useAppStore.getState().isDraggingGate).toBe(false)
    expect(useAppStore.getState().isTrackModified).toBe(true)
    expect(useAppStore.getState().past).toHaveLength(1)
    expect(controls.enabled).toBe(true)
  })
})
