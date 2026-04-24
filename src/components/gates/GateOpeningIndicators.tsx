import type { ThreeEvent } from '@react-three/fiber'
import type { GateOpening } from '../../types'
import { GateEntryIndicator } from './GateEntryIndicator'

interface GateOpeningIndicatorsProps {
  openings: GateOpening[]
  openingLabels?: Record<string, string>
  label?: string
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onOpeningClick?: (openingId: string, e: ThreeEvent<MouseEvent>) => void
}

export function GateOpeningIndicators({ openings, openingLabels, label, onClick, onOpeningClick }: GateOpeningIndicatorsProps) {
  return openings.map((opening) => {
    const openingLabel = openingLabels?.[opening.id] ?? label
    const handleOpeningClick = (e: ThreeEvent<MouseEvent>) => {
      if (onOpeningClick) {
        onOpeningClick(opening.id, e)
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
        onClick={handleOpeningClick}
      />
    )
  })
}
