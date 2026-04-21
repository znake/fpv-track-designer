import { useEffect } from 'react'
import { useAppStore } from '../../store'

export function UndoRedo() {
  const undo = useAppStore((state) => state.undo)
  const redo = useAppStore((state) => state.redo)
  const past = useAppStore((state) => state.past)
  const future = useAppStore((state) => state.future)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">History</h2>

      <div className="flex gap-2">
        <button
          onClick={undo}
          disabled={past.length === 0}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          title="Redo (Ctrl+Y)"
        >
          ↪ Redo
        </button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        {past.length} undo steps | {future.length} redo steps
      </div>
    </div>
  )
}
