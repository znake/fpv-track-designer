import { useState } from 'react'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { KeyboardEvent } from 'react'
import type { ReactNode } from 'react'
import type { Gate as GateType } from '../../types'
import { useGateSelection } from '../../hooks/useGateSelection'
import { useAppStore } from '../../store'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { StandardGate } from './StandardGate'
import { HGate } from './HGate'
import { DoubleHGate } from './DoubleHGate'
import { DiveGate } from './DiveGate'
import { DoubleGate } from './DoubleGate'
import { LadderGate } from './LadderGate'
import { StartFinishGate } from './StartFinishGate'
import { Flag } from './Flag'
import { GateHandles } from './GateHandles'

interface GateProps {
  gate: GateType
  openingLabels?: Record<string, string>
  showOpeningLabels?: boolean
}

const SEQUENCE_EDITOR_OFFSET_Y = 1.85

export function Gate({ gate, openingLabels, showOpeningLabels = true }: GateProps) {
  const { isSelected, handleClick } = useGateSelection(gate.id)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const toggleGateDirection = useAppStore((state) => state.toggleGateDirection)
  const moveGateSequenceEntry = useAppStore((state) => state.moveGateSequenceEntry)
  const selectGate = useAppStore((state) => state.selectGate)

  const [editingOpeningId, setEditingOpeningId] = useState<string | null>(null)
  const [editingSequenceValue, setEditingSequenceValue] = useState('')
  const [editingSourceSequenceNumber, setEditingSourceSequenceNumber] = useState(0)

  const stopHtmlInteraction = (event: {
    preventDefault: () => void
    stopPropagation: () => void
    nativeEvent?: { stopImmediatePropagation?: () => void }
  }) => {
    event.preventDefault()
    event.stopPropagation()
    const nativeEvent = event.nativeEvent
    if (nativeEvent?.stopImmediatePropagation) {
      nativeEvent.stopImmediatePropagation()
    }
  }

  const closeSequenceEditor = () => {
    setEditingOpeningId(null)
    setEditingSequenceValue('')
    setEditingSourceSequenceNumber(0)
  }

  const sequenceLength = currentTrack?.gateSequence.length ?? 0

  const parseSequenceInput = (value: string): number => Number(value.trim())

  const sequenceInputError = (() => {
    if (!editingOpeningId || editingSequenceValue.trim().length === 0) {
      return 'Bitte eine Zahl eingeben.'
    }

    const nextSequenceNumber = parseSequenceInput(editingSequenceValue)
    if (!Number.isInteger(nextSequenceNumber)) {
      return 'Bitte eine ganze Zahl eingeben.'
    }

    if (nextSequenceNumber < 1 || nextSequenceNumber > sequenceLength) {
      return `Bitte eine Nummer zwischen 1 und ${sequenceLength} wählen.`
    }

    return null
  })()

  const handleSequenceEditorSubmit = () => {
    if (!editingOpeningId || sequenceInputError) return

    const nextSequenceNumber = parseSequenceInput(editingSequenceValue)
    moveGateSequenceEntry(gate.id, editingOpeningId, editingSourceSequenceNumber, nextSequenceNumber)
    closeSequenceEditor()
  }

  const handleSequenceEditorKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSequenceEditorSubmit()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeSequenceEditor()
    }
  }

  const handleOpeningClick = (openingId: string, e: ThreeEvent<globalThis.MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate) return

    if (!isSelected) {
      selectGate(gate.id)
    }

    toggleGateDirection(gate.id, openingId)
  }

  const handleOpeningLabelClick = (openingId: string, sequenceNumber: number, e: ThreeEvent<globalThis.MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate) return

    if (!isSelected) {
      selectGate(gate.id)
    }

    const sequenceLength = currentTrack?.gateSequence.length ?? 0
    if (sequenceLength === 0) return

    setEditingOpeningId(openingId)
    setEditingSourceSequenceNumber(sequenceNumber)
    setEditingSequenceValue('')
  }

  const commonProps = {
    position: gate.position,
    rotation: gate.rotation,
    size: gate.size,
    openings: showOpeningLabels ? gate.openings : [],
    openingLabels: showOpeningLabels ? openingLabels : undefined,
    isSelected,
    onClick: handleClick,
    onOpeningClick: showOpeningLabels ? handleOpeningClick : undefined,
    onOpeningLabelClick: showOpeningLabels ? handleOpeningLabelClick : undefined,
  }

  let gateComponent: ReactNode
  switch (gate.type) {
    case 'h-gate':
      gateComponent = <HGate {...commonProps} gateId={gate.id} />
      break
    case 'double-h':
      gateComponent = <DoubleHGate {...commonProps} gateId={gate.id} />
      break
    case 'dive':
      gateComponent = <DiveGate {...commonProps} />
      break
    case 'double':
      gateComponent = <DoubleGate {...commonProps} />
      break
    case 'ladder':
      gateComponent = <LadderGate {...commonProps} />
      break
    case 'start-finish':
      gateComponent = <StartFinishGate {...commonProps} />
      break
    case 'flag':
      gateComponent = <Flag {...commonProps} />
      break
    case 'standard':
    default:
      gateComponent = <StandardGate {...commonProps} />
      break
  }

  return (
    <group>
      {gateComponent}
      {editingOpeningId && isSelected && (
        <Html
          center
          distanceFactor={10}
          position={[gate.position.x, gate.position.y + SEQUENCE_EDITOR_OFFSET_Y, gate.position.z]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="pointer-events-auto w-72 rounded-xl border border-border bg-popover/95 p-3 text-sm text-popover-foreground shadow-xl shadow-black/35 backdrop-blur supports-backdrop-filter:backdrop-blur-sm"
            onPointerDown={stopHtmlInteraction}
            onClick={stopHtmlInteraction}
          >
            <div className="space-y-1">
              <p className="font-medium">Durchflugnummer ändern</p>
              <p className="text-xs text-muted-foreground">
                Neue Nummer zwischen 1 und {sequenceLength} eingeben.
              </p>
              <Input
                value={editingSequenceValue}
                onChange={(event) => setEditingSequenceValue(event.target.value)}
                onKeyDown={handleSequenceEditorKeyDown}
                inputMode="numeric"
                className="h-8"
                autoFocus
              />
              {sequenceInputError && <p className="text-xs text-destructive">{sequenceInputError}</p>}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onPointerDown={stopHtmlInteraction}
                onClick={(event) => {
                  stopHtmlInteraction(event)
                  closeSequenceEditor()
                }}
              >
                Abbrechen
              </Button>
              <Button
                size="sm"
                onPointerDown={stopHtmlInteraction}
                disabled={Boolean(sequenceInputError)}
                onClick={(event) => {
                  stopHtmlInteraction(event)
                  handleSequenceEditorSubmit()
                }}
              >
                Übernehmen
              </Button>
            </div>
          </div>
        </Html>
      )}
      {isSelected && (
        <GateHandles
          gateId={gate.id}
          gateType={gate.type}
          position={gate.position}
          rotation={gate.rotation}
          size={gate.size}
        />
      )}
    </group>
  )
}
