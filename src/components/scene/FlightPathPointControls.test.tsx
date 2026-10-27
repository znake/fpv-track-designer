import { act, render } from '@testing-library/react'
import { createRef, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera } from 'three'
import { useAppStore } from '../../store'
import type { Track } from '../../types'
import { calculateFlightPathWithControlPoints } from '../../utils/flightPath'
import { createDefaultGateOpenings } from '../../utils/gateOpenings'
import { FlightPathPointControls } from './FlightPathPointControls'

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

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

const pointer = (type: string, clientX: number, clientY: number, shiftKey = false) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    button: 0,
    pointerType: 'mouse',
    isPrimary: true,
    shiftKey,
  })

const dispatch = (target: EventTarget, event: Event) => {
  act(() => {
    target.dispatchEvent(event)
  })
}

const pointPosition = () => useAppStore.getState().currentTrack?.idealLinePoints?.[0].position

const renderControls = () => {
  const track = useAppStore.getState().currentTrack
  if (!track) throw new Error('Missing track')
  const data = calculateFlightPathWithControlPoints(track.gates, track.gateSequence, track.idealLinePoints)
  return render(
    <FlightPathPointControls
      data={data}
      hover={null}
      pointer={null}
      menuOpen={false}
      controlsRef={createRef<{ enabled: boolean }>()}
      fpvModeActive={false}
      onInsertGate={() => undefined}
      onInsertPoint={() => undefined}
    />,
  )
}

describe('FlightPathPointControls point dragging', () => {
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

  it('drags the point on the field plane when its dot is pressed and moved', () => {
    const { container } = renderControls()
    const dot = container.querySelector('[data-ideal-line-point="point-1"]')
    if (!dot) throw new Error('Missing point marker')

    dispatch(dot, pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 410, 300))
    dispatch(window, pointer('pointermove', 500, 300))

    expect(pointPosition()?.x).toBeGreaterThan(0)
    expect(pointPosition()?.y).toBe(1)
    expect(useAppStore.getState().selectedFlightPathPointId).toBe('point-1')
  })

  it('changes only the height when Shift is held while pressing the dot', () => {
    const { container } = renderControls()
    const dot = container.querySelector('[data-ideal-line-point="point-1"]')
    if (!dot) throw new Error('Missing point marker')

    dispatch(dot, pointer('pointerdown', 400, 300, true))
    dispatch(window, pointer('pointermove', 400, 290))
    dispatch(window, pointer('pointermove', 500, 200, true))

    expect(pointPosition()?.y).toBeCloseTo(1 + 100 * 0.03, 6)
    expect(pointPosition()?.x).toBe(0)
    expect(pointPosition()?.z).toBe(0)
  })

  it('keeps a plain click on the dot a selection without moving it', () => {
    const { container } = renderControls()
    const dot = container.querySelector('[data-ideal-line-point="point-1"]')
    if (!dot) throw new Error('Missing point marker')

    dispatch(dot, pointer('pointerdown', 400, 300))
    dispatch(window, pointer('pointermove', 402, 300))
    dispatch(window, pointer('pointerup', 402, 300))

    expect(pointPosition()).toEqual(POINT_POSITION)
    expect(useAppStore.getState().past).toHaveLength(0)
    expect(controls.enabled).toBe(true)
  })
})
