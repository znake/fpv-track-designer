import type { ThreeEvent } from '@react-three/fiber'
import type { GateOpening } from '../../types'
import { GateEntryIndicator } from './GateEntryIndicator'

interface GateOpeningIndicatorsProps {
  openings: GateOpening[]
  openingLabels?: Record<string, string>
  label?: string
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

export function GateOpeningIndicators({ openings, openingLabels, label, onClick }: GateOpeningIndicatorsProps) {
  return openings.map((opening) => {
    const openingLabel = openingLabels?.[opening.id] ?? label

    return (
      <GateEntryIndicator
        key={opening.id}
        width={opening.width}
        height={opening.height}
        position={[opening.position.x, opening.position.y, opening.position.z]}
        rotationY={opening.rotation}
        label={openingLabel}
        onClick={onClick}
      />
    )
  })
}
