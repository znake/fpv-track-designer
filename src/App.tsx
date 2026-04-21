import { useEffect } from 'react'
import { useAppStore } from './store'
import { generateTrack } from './utils/generator'
import { defaultConfig } from './store/configSlice'
import { Scene } from './components/scene/Scene'
import { GateConfigPanel } from './components/ui/GateConfigPanel'
import { UndoRedo } from './components/ui/UndoRedo'
import { TrackControls } from './components/ui/TrackControls'
import { GateAdjustment } from './components/ui/GateAdjustment'
import { JsonImportExport } from './components/ui/JsonImportExport'
import { TrackGallery } from './components/ui/TrackGallery'

function App() {
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setTrack = useAppStore((state) => state.setTrack)

  // Auto-generate track on first load
  useEffect(() => {
    if (!currentTrack) {
      const track = generateTrack(defaultConfig)
      setTrack(track)
    }
  }, [currentTrack, setTrack])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      {/* Sidebar */}
      <aside className="w-80 min-w-80 bg-gray-800 border-r border-gray-700 flex flex-col overflow-y-auto">
        <div className="p-4 space-y-6">
          <h1 className="text-xl font-bold text-white">FPV Track Designer</h1>
          <GateConfigPanel />
          <TrackControls />
          <GateAdjustment />
          <TrackGallery />
          <JsonImportExport />
          <UndoRedo />
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 relative">
        <Scene />
      </main>
    </div>
  )
}

export default App
