import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store'
import { defaultConfig } from '@/store/configSlice'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createDefaultGateOpenings } from '@/utils/gateOpenings'
import type { Gate, Track } from '@/types'

import { PoleCounter } from './PoleCounter'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

const createGate = (index: number): Gate => ({
  id: `gate-${index}`,
  type: 'standard',
  position: { x: index, y: 0, z: 0 },
  rotation: 0,
  openings: createDefaultGateOpenings('standard'),
})

const createTrackWithGateCount = (gateCount: number): Track => {
  const gates = Array.from({ length: gateCount }, (_, index) => createGate(index))

  return {
    id: 'pole-counter-test',
    name: 'Pole Counter Test',
    gates,
    gateSequence: gates.map((gate) => ({ gateId: gate.id, openingId: 'main', reverse: false })),
    fieldSize: { width: 30, height: 15 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

const renderPoleCounter = () =>
  render(
    <TooltipProvider>
      <PoleCounter />
    </TooltipProvider>,
  )

describe('PoleCounter', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAppStore.setState({
      config: defaultConfig,
      currentTrack: null,
      selectedGateId: null,
      selectedGateIds: [],
    })
  })

  it('renders nothing while no track is loaded', () => {
    renderPoleCounter()

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows the pole total without a warning at exactly the stored limit', () => {
    useAppStore.setState({ currentTrack: createTrackWithGateCount(20) })

    renderPoleCounter()

    expect(screen.getByRole('button', { name: 'Stangen: 60. Klicken für Details.' })).toBeTruthy()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('warns in an alert dialog when the track exceeds the stored limit and hides it on dismiss', () => {
    window.localStorage.setItem('fpv-track-designer-max-poles', '30')
    useAppStore.setState({ currentTrack: createTrackWithGateCount(20) })

    renderPoleCounter()

    const warning = screen.getByRole('alertdialog')
    expect(warning.textContent).toContain('Maximale Stangenanzahl erreicht')
    expect(warning.textContent).toContain('Maximalzahl von 30 Stangen')
    expect(warning.textContent).toContain('aktuell 60 Stangen')

    fireEvent.click(screen.getByRole('button', { name: 'Verstanden' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('warns once per crossing instead of on every added gate', () => {
    useAppStore.setState({ currentTrack: createTrackWithGateCount(20) })

    renderPoleCounter()
    expect(screen.queryByRole('alertdialog')).toBeNull()

    act(() => useAppStore.setState({ currentTrack: createTrackWithGateCount(21) }))
    expect(screen.getByRole('alertdialog')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Verstanden' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()

    act(() => useAppStore.setState({ currentTrack: createTrackWithGateCount(22) }))
    expect(screen.queryByRole('alertdialog')).toBeNull()

    act(() => useAppStore.setState({ currentTrack: createTrackWithGateCount(10) }))
    expect(screen.queryByRole('alertdialog')).toBeNull()

    act(() => useAppStore.setState({ currentTrack: createTrackWithGateCount(21) }))
    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })

  it('stores a custom limit typed into the pole dialog', () => {
    useAppStore.setState({ currentTrack: createTrackWithGateCount(2) })

    renderPoleCounter()

    const trigger = screen.getByRole('button', { name: 'Stangen: 6. Klicken für Details.' })
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
    fireEvent.click(trigger)

    const limitInput = screen.getByLabelText('Maximale Anzahl Stangen')
    fireEvent.change(limitInput, { target: { value: '90' } })

    expect(window.localStorage.getItem('fpv-track-designer-max-poles')).toBe('90')

    fireEvent.change(limitInput, { target: { value: '' } })
    expect(window.localStorage.getItem('fpv-track-designer-max-poles')).toBe('90')

    fireEvent.blur(limitInput)
    expect((limitInput as HTMLInputElement).value).toBe('90')
  })
})
