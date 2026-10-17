import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

// jsdom lacks DOM APIs that Radix Select relies on; provide minimal local mocks.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

const openFieldPresetSelect = () => {
  const trigger = screen.getByLabelText('Feldvorlage')
  fireEvent.pointerDown(trigger)
  fireEvent.click(trigger)
}

import { useAppStore } from '@/store'
import { defaultConfig } from '@/store/configSlice'

import { GateConfigPanel } from './GateConfigPanel'

const resetStore = () => {
  useAppStore.setState({
    config: defaultConfig,
    currentTrack: null,
    selectedGateId: null,
    selectedGateIds: [],
    isDeleteDialogOpen: false,
    isDraggingGate: false,
    past: [],
    future: [],
  })
}

describe('GateConfigPanel', () => {
  beforeEach(() => {
    resetStore()
  })

  it('commits free field width input after editing and blur', () => {
    render(<GateConfigPanel />)

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement

    fireEvent.change(widthInput, { target: { value: '30' } })
    fireEvent.blur(widthInput)

    expect(useAppStore.getState().config.fieldSize.width).toBe(30)
    expect(widthInput.value).toBe('30')
  })

  it('resets invalid width input back to current value on blur', () => {
    render(<GateConfigPanel />)

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement

    fireEvent.change(widthInput, { target: { value: '0' } })
    fireEvent.blur(widthInput)

    expect(useAppStore.getState().config.fieldSize.width).toBe(defaultConfig.fieldSize.width)
    expect(widthInput.value).toBe(String(defaultConfig.fieldSize.width))
  })

  it('allows clearing field size value and typing another valid number', () => {
    render(<GateConfigPanel />)

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement
    const heightInput = screen.getByLabelText('Länge') as HTMLInputElement

    fireEvent.change(widthInput, { target: { value: '' } })
    fireEvent.change(widthInput, { target: { value: '30' } })
    fireEvent.blur(widthInput)

    fireEvent.change(heightInput, { target: { value: '25' } })
    fireEvent.blur(heightInput)

    expect(useAppStore.getState().config.fieldSize.width).toBe(30)
    expect(useAppStore.getState().config.fieldSize.height).toBe(25)
    expect(widthInput.value).toBe('30')
    expect(heightInput.value).toBe('25')
  })

  it('applies the Last OG3 venue preset and locks the field size inputs', () => {
    render(<GateConfigPanel />)

    openFieldPresetSelect()
    fireEvent.click(screen.getByRole('option', { name: 'Last OG3' }))

    const config = useAppStore.getState().config
    expect(config.venueId).toBe('last-og3')
    expect(config.fieldSize).toEqual({ width: 10.5, height: 22.7 })

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement
    const heightInput = screen.getByLabelText('Länge') as HTMLInputElement
    expect(widthInput.disabled).toBe(true)
    expect(heightInput.disabled).toBe(true)
    expect(widthInput.value).toBe('10.5')
    expect(heightInput.value).toBe('22.7')
  })

  it('returns to the custom venue and re-enables inputs while keeping the preset field size', () => {
    render(<GateConfigPanel />)

    openFieldPresetSelect()
    fireEvent.click(screen.getByRole('option', { name: 'Last OG3' }))
    expect(useAppStore.getState().config.venueId).toBe('last-og3')

    openFieldPresetSelect()
    fireEvent.click(screen.getByRole('option', { name: 'Benutzerdefiniert' }))

    const config = useAppStore.getState().config
    expect(config.venueId).toBeNull()
    expect(config.fieldSize).toEqual({ width: 10.5, height: 22.7 })

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement
    const heightInput = screen.getByLabelText('Länge') as HTMLInputElement
    expect(widthInput.disabled).toBe(false)
    expect(heightInput.disabled).toBe(false)
  })

  it('keeps the field size inputs enabled when no venue preset is selected', () => {
    render(<GateConfigPanel />)

    expect(useAppStore.getState().config.venueId).toBeNull()

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement
    const heightInput = screen.getByLabelText('Länge') as HTMLInputElement
    expect(widthInput.disabled).toBe(false)
    expect(heightInput.disabled).toBe(false)
  })
})
