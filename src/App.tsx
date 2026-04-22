import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import { generateTrack } from './utils/generator'
import { defaultConfig } from './store/configSlice'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { SaveTrackDialog } from './components/ui/SaveTrackDialog'
import { TrackGallery } from './components/ui/TrackGallery'
import { KeyboardShortcutsDialog } from './components/ui/KeyboardShortcutsDialog'
import { Scene } from './components/scene/Scene'
import { TopBar } from './components/layout/TopBar'
import { LeftToolPanel } from './components/layout/LeftToolPanel'
import { PropertiesPanel } from './components/layout/PropertiesPanel'
import { TooltipProvider } from '@/components/ui/tooltip'

function App() {
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setTrack = useAppStore((state) => state.setTrack)
  const config = useAppStore((state) => state.config)

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useKeyboardShortcuts({
    onSave: () => setSaveDialogOpen(true),
    onShuffle: () => setTrack(generateTrack(config)),
    onOpenGallery: () => setGalleryOpen(true),
  })
  // Auto-generate track on first load
  useEffect(() => {
    if (!currentTrack) {
      const track = generateTrack(defaultConfig)
      setTrack(track)
    }
  }, [currentTrack, setTrack])

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <TopBar
          onSaveClick={() => setSaveDialogOpen(true)}
          onGalleryClick={() => setGalleryOpen(true)}
          onShortcutsClick={() => setShortcutsOpen(true)}
        />
        <div className="flex flex-1 overflow-hidden">
          <LeftToolPanel onSaveClick={() => setSaveDialogOpen(true)} onGalleryClick={() => setGalleryOpen(true)} />
          <main className="relative flex-1">
            <Scene />
          </main>
          <PropertiesPanel />
        </div>
      </div>
      <SaveTrackDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
      <TrackGallery open={galleryOpen} onOpenChange={setGalleryOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </TooltipProvider>
)
}

export default App
