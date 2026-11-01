import type { ThreeEvent } from '@react-three/fiber'
import type { GateOpening } from '../../types'
import { isOpeningDisabled } from '../../utils/gateOpenings'
import { GateEntryIndicator } from './GateEntryIndicator'

interface GateOpeningIndicatorsProps {
  openings: GateOpening[]
  openingLabels?: Record<string, string>
  label?: string
  isSelected?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onOpeningClick?: (openingId: string, e: ThreeEvent<MouseEvent>) => void
  onOpeningLabelClick?: (openingId: string, sequenceNumber: number, e: ThreeEvent<MouseEvent>) => void
  onOpeningToggleDisabled?: (openingId: string, e: ThreeEvent<MouseEvent>) => void
}

export function GateOpeningIndicators({ openings, openingLabels, label, isSelected, onClick, onOpeningClick, onOpeningLabelClick, onOpeningToggleDisabled }: GateOpeningIndicatorsProps) {
  return openings.map((opening) => {
    const openingLabel = openingLabels?.[opening.id] ?? label
    const sequenceNumber = openingLabel ? Number.parseInt(openingLabel, 10) : Number.NaN
    const disabled = isOpeningDisabled(opening)
    const handleSurfaceClick = (e: ThreeEvent<MouseEvent>) => {
      onClick?.(e)
    }

    const handleSwapClick = (e: ThreeEvent<MouseEvent>) => {
      if (onOpeningClick) {
        onOpeningClick(opening.id, e)
        return
      }

      onClick?.(e)
    }

    const handleToggleDisabledClick = (e: ThreeEvent<MouseEvent>) => {
      if (onOpeningToggleDisabled) {
        onOpeningToggleDisabled(opening.id, e)
        return
      }

      onClick?.(e)
    }

    const handleLabelClick = (e: ThreeEvent<MouseEvent>) => {
      if (onOpeningLabelClick && !disabled && Number.isInteger(sequenceNumber)) {
        onOpeningLabelClick(opening.id, sequenceNumber, e)
        return
      }

      onClick?.(e)
    }

    return (
      <GateEntryIndicator
        key={opening.id}
        width={opening.width}
        height={opening.height}
        position={[opening.position.x, opening.position.y, opening.position.z]}
        rotationX={opening.rotationX}
        rotationY={opening.rotation}
        reverse={opening.reverse}
        label={openingLabel}
        isSelected={isSelected}
        isDisabled={disabled}
        canToggleDirection={!!onOpeningClick}
        onClick={handleSurfaceClick}
        onSwapClick={handleSwapClick}
        onToggleDisabledClick={onOpeningToggleDisabled ? handleToggleDisabledClick : undefined}
        onLabelClick={disabled ? undefined : handleLabelClick}
      />
    )
  })
}
