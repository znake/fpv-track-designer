import { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { loadTrack, listTracks, deleteTrack, type SavedTrackInfo } from '../../utils/storage'

export function TrackGallery() {
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setTrack = useAppStore((state) => state.setTrack)
  const [tracks, setTracks] = useState<SavedTrackInfo[]>([])

  useEffect(() => {
    setTracks(listTracks())
  }, [])

  const handleLoad = (id: string) => {
    const result = loadTrack(id)
    if (result) setTrack(result.track)
  }

  const handleDelete = (id: string) => {
    deleteTrack(id)
    setTracks(listTracks())
  }

  const refresh = () => setTracks(listTracks())

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Track Gallery</h2>
        <button onClick={refresh} className="text-xs text-purple-400 hover:text-purple-300 transition-colors focus:outline-none focus:underline">
          Refresh
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-4">No saved tracks yet</div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tracks.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between p-2 rounded ${
                currentTrack?.id === t.id ? 'bg-purple-900/50 border border-purple-500' : 'bg-gray-700'
              }`}
            >
              <button
                onClick={() => handleLoad(t.id)}
                className="flex-1 text-left text-sm text-gray-300 hover:text-white truncate transition-colors focus:outline-none focus:text-white"
              >
                {t.name}
                {currentTrack?.id === t.id && (
                  <span className="ml-2 text-xs text-purple-400">(current)</span>
                )}
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="ml-2 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 focus:ring-offset-gray-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
