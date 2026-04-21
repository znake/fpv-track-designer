import { useAppStore } from '../store'

export function useGateSelection(gateId: string) {
  const selectedGateId = useAppStore((state) => state.selectedGateId)
  const selectGate = useAppStore((state) => state.selectGate)

  const isSelected = selectedGateId === gateId

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    selectGate(gateId)
  }

  return { isSelected, handleClick }
}