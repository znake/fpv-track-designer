import { useEffect } from 'react'
import { useAppStore } from '@/store'

interface KeyboardShortcutsOptions {
  onSave?: () => void
  onNewTrack?: () => void
  onShuffle?: () => void
  onOpenGallery?: () => void
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { onSave, onNewTrack, onShuffle, onOpenGallery } = options
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const selectGate = useAppStore((s) => s.selectGate)
  const selectedGateId = useAppStore((s) => s.selectedGateId)
  const selectedGateIds = useAppStore((s) => s.selectedGateIds)
  const isDeleteDialogOpen = useAppStore((s) => s.isDeleteDialogOpen)
  const openDeleteDialog = useAppStore((s) => s.openDeleteDialog)
  const closeDeleteDialog = useAppStore((s) => s.closeDeleteDialog)
  const deleteSelectedGates = useAppStore((s) => s.deleteSelectedGates)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave?.()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        onNewTrack?.()
        return
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        onShuffle?.()
        return
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        onOpenGallery?.()
        return
      }

      if (e.key === 'Escape') {
        selectGate(null)
        if (isDeleteDialogOpen) {
          closeDeleteDialog()
        }
        return
      }

      if (e.key === 'Backspace' && selectedGateId && selectedGateIds.length === 1) {
        e.preventDefault()
        openDeleteDialog()
        return
      }

      if (e.key === 'Enter' && isDeleteDialogOpen) {
        e.preventDefault()
        deleteSelectedGates()
        closeDeleteDialog()
        return
      }

    }
  
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    undo,
    redo,
    onSave,
    onNewTrack,
    onShuffle,
    onOpenGallery,
    selectGate,
    selectedGateId,
    selectedGateIds,
    isDeleteDialogOpen,
    openDeleteDialog,
    closeDeleteDialog,
    deleteSelectedGates,
  ])
}
