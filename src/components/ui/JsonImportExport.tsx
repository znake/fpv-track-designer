import { useState } from 'react'
import { useAppStore } from '../../store'
import { serializeTrack, deserializeTrack } from '../../schemas/track.schema'

export function JsonImportExport() {
  const currentTrack = useAppStore((state) => state.currentTrack)
  const config = useAppStore((state) => state.config)
  const setTrack = useAppStore((state) => state.setTrack)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExport = () => {
    if (!currentTrack) return
    const json = serializeTrack(currentTrack, config)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentTrack.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ type: 'success', text: 'Track exported successfully' })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const result = deserializeTrack(json)
        if ('error' in result) {
          setMessage({ type: 'error', text: `Invalid track: ${result.error}` })
        } else {
          setTrack(result.track)
          setMessage({ type: 'success', text: `Loaded "${result.track.name}"` })
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to parse JSON file' })
      }
      setTimeout(() => setMessage(null), 3000)
    }
    reader.readAsText(file)
    // Reset input
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Import/Export</h2>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={!currentTrack}
        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        Export as JSON
      </button>

      {/* Import */}
      <label className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm text-center cursor-pointer block transition-colors focus-within:ring-2 focus-within:ring-purple-400">
        Import from JSON
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </label>

      {/* Message */}
      {message && (
        <div className={`text-xs p-2 rounded ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
