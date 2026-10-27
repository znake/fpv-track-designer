import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera } from 'three'
import { useAppStore } from '../store'
import type { Track } from '../types'
import { createDefaultGateOpenings } from '../utils/gateOpenings'
import { useGateMoveDrag } from './useGateMoveDrag'

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
  useThree: () => ({ camera, gl, controls }),
}))

const initialOpenings = createDefaultGateOpenings('standard')

const createTrack = (): Track => ({
  id: 'track',
  name: 'Track',
  gates: [{
    id: 'gate-1',
    type: 'standard',
    position: { x: 0, y: 0.5, z: 0 },
    rotation: 0,
    openings: initialOpenings,
  }],
  gateSequence: [{ gateId: 'gate-1', openingId: initialOpenings[0].id, reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

function DragProbe() {
  const gate = useAppStore((state) => state.currentTrack?.gates[0])
  const { isMoving, beginMoveDrag, startPressDrag } = useGateMoveDrag({
    gateId: 'gate-1',
    position: gate?.position ?? { x: 0, y: 0, z: 0 },
  })

  return (
    <>
      <button
        type="button"
        data-testid="gate-body"
        data-moving={String(isMoving)}
        onPointerDown={(event) => startPressDrag(event.clientX, event.clientY)}
      />
      <button
        type="button"
        data-testid="move-handle"
        onPointerDown={(event) => beginMoveDrag(event.clientX, event.clientY)}
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

const gatePosition = () => useAppStore.getState().currentTrack?.gates[0].position

describe('useGateMoveDrag', () => {
  beforeEach(() => {
    vi.useFakeTimers()
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
      past: [],
      future: [],
      dragHistoryEntry: null,
      isTrackModified: false,
      isDraggingGate: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves the gate on the ground plane when the gate body is pressed and dragged', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('gate-body'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 410, 300))
    dispatch(window, pointer('pointermove', 500, 300))

    const position = gatePosition()
    expect(position?.x).toBeGreaterThan(0)
    expect(position?.z).toBeCloseTo(0, 6)
    expect(position?.y).toBe(0.5)
    expect(useAppStore.getState().selectedGateId).toBe('gate-1')
  })

  it('keeps a press without real pointer travel a plain click', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('gate-body'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 402, 300))
    dispatch(window, pointer('pointerup', 402, 300))

    expect(gatePosition()).toEqual({ x: 0, y: 0.5, z: 0 })
    expect(useAppStore.getState().selectedGateId).toBeNull()
    expect(useAppStore.getState().isDraggingGate).toBe(false)
    expect(useAppStore.getState().past).toHaveLength(0)
    expect(controls.enabled).toBe(true)
  })

  it('clamps the dragged gate to the field bounds', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('gate-body'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 410, 300))
    dispatch(window, pointer('pointermove', 5000, 300))

    expect(gatePosition()?.x).toBe(15)
  })

  it('releases the dragging flag after the click and commits one undo entry', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('gate-body'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 410, 300))
    dispatch(window, pointer('pointermove', 500, 300))
    expect(useAppStore.getState().isDraggingGate).toBe(true)

    dispatch(window, pointer('pointerup', 500, 300))

    expect(useAppStore.getState().isDraggingGate).toBe(true)
    expect(getByTestId('gate-body').getAttribute('data-moving')).toBe('false')
    expect(controls.enabled).toBe(true)

    act(() => {
      vi.runAllTimers()
    })

    expect(useAppStore.getState().isDraggingGate).toBe(false)
    expect(useAppStore.getState().isTrackModified).toBe(true)
    expect(useAppStore.getState().past).toHaveLength(1)
  })

  it('leaves camera controls disabled during FPV flight', () => {
    controls.enabled = false
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('gate-body'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 410, 300))
    dispatch(window, pointer('pointermove', 500, 300))
    dispatch(window, pointer('pointerup', 500, 300))

    expect(gatePosition()).toEqual({ x: 0, y: 0.5, z: 0 })
    expect(controls.enabled).toBe(false)
    expect(useAppStore.getState().isDraggingGate).toBe(false)
    expect(useAppStore.getState().past).toHaveLength(0)
  })

  it('moves immediately when the move handle starts the drag', () => {
    const { getByTestId } = render(<DragProbe />)

    dispatch(getByTestId('move-handle'), pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 500, 300))

    expect(gatePosition()?.x).toBeGreaterThan(0)
    expect(useAppStore.getState().selectedGateId).toBeNull()
  })
})
