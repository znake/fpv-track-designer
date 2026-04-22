import type { ThreeEvent } from '@react-three/fiber'
import { useAppStore } from '../store'

export function useGateSelection(gateId: string) {
  const selectedGateIds = useAppStore((state) => state.selectedGateIds)
  const selectGate = useAppStore((state) => state.selectGate)

  const isSelected = selectedGateIds.includes(gateId)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()

    const isAdditiveSelection = e.shiftKey || e.metaKey || e.ctrlKey
    selectGate(gateId, isAdditiveSelection)
  }

  return { isSelected, handleClick }
}
