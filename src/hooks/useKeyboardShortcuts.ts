import { useEffect } from 'react'
import { useAppStore } from '@/store'
import type { Track } from '@/types/track'

interface KeyboardShortcutsOptions {
  onSave?: () => void
  onShuffle?: () => void
  onOpenGallery?: () => void
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { onSave, onShuffle, onOpenGallery } = options
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const selectGate = useAppStore((s) => s.selectGate)
  const setTrack = useAppStore((s) => s.setTrack)
  const moveGate = useAppStore((s) => s.moveGate)
  const selectedGateId = useAppStore((s) => s.selectedGateId)

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
        setTrack(null as unknown as Track)
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
        return
      }

      if (selectedGateId) {
        const dirMap: Record<string, 'N' | 'S' | 'E' | 'W'> = {
          ArrowUp: 'N',
          ArrowDown: 'S',
          ArrowLeft: 'W',
          ArrowRight: 'E',
        }
        if (dirMap[e.key]) {
          e.preventDefault()
          moveGate(selectedGateId, dirMap[e.key])
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, onSave, onShuffle, onOpenGallery, selectGate, setTrack, moveGate, selectedGateId])
}
