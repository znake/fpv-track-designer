import { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { generateTrack } from '../../utils/generator'
import { saveTrack, loadTrack, listTracks, type SavedTrackInfo } from '../../utils/storage'
import type { Track } from '../../types'

export function TrackControls() {
  const config = useAppStore((state) => state.config)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setTrack = useAppStore((state) => state.setTrack)
  const [trackName, setTrackName] = useState('')
  const [savedTracks, setSavedTracks] = useState<SavedTrackInfo[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    setSavedTracks(listTracks())
  }, [])

  const handleShuffle = () => {
    setIsGenerating(true)
    setTimeout(() => {
const track = generateTrack(config)
    setTrack(track)
      setIsGenerating(false)
  }, 100)
  }

  const handleSave = () => {
    if (!currentTrack) return
    const name = trackName || currentTrack.name
    const track = { ...currentTrack, name }
    saveTrack(track, config)
    setSavedTracks(listTracks())
    setTrackName('')
  }

  const handleLoad = (id: string) => {
    const result = loadTrack(id)
    if (result) setTrack(result.track)
  }

  const handleNew = () => {
    setTrack(null as unknown as Track)
  }

  const handleRefreshList = () => {
    setSavedTracks(listTracks())
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Track Controls</h2>

      {/* Shuffle */}
      <button
        onClick={handleShuffle}
        disabled={isGenerating}
        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-purple-400 text-white rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        {isGenerating ? 'Generating...' : '🎲 Shuffle Track'}
      </button>

      {/* Save */}
      <div className="flex gap-2">
        <input
          type="text"
          value={trackName}
          onChange={(e) => setTrackName(e.target.value)}
          placeholder={currentTrack?.name || 'Track name'}
          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={handleSave}
          disabled={!currentTrack}
          className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Save
        </button>
      </div>

      {/* Load */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Saved Tracks</span>
          <button onClick={handleRefreshList} className="text-xs text-purple-400 hover:text-purple-300 transition-colors focus:outline-none focus:underline">
            Refresh
          </button>
        </div>
        {savedTracks.length > 0 ? (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {savedTracks.map((t) => (
              <button
                key={t.id}
                onClick={() => handleLoad(t.id)}
                className="w-full text-left px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 truncate transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 focus:ring-offset-gray-700"
              >
                {t.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No saved tracks</div>
        )}
      </div>

      {/* New Track */}
      <button
        onClick={handleNew}
        className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        New Track
      </button>
    </div>
  )
}
