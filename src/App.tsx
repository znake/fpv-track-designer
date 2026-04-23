import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import { generateTrack } from './utils/generator'
import { defaultConfig } from './store/configSlice'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { SaveTrackDialog } from './components/ui/SaveTrackDialog'
import { TrackGallery } from './components/ui/TrackGallery'
import { KeyboardShortcutsDialog } from './components/ui/KeyboardShortcutsDialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './components/ui/sheet'
import { ScrollArea } from './components/ui/scroll-area'
import { Separator } from './components/ui/separator'
import { GateConfigPanel } from './components/ui/GateConfigPanel'
import { Scene } from './components/scene/Scene'
import { TopBar } from './components/layout/TopBar'
import { LeftToolPanel } from './components/layout/LeftToolPanel'
import { TooltipProvider } from '@/components/ui/tooltip'

function App() {
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setTrack = useAppStore((state) => state.setTrack)
  const config = useAppStore((state) => state.config)

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useKeyboardShortcuts({
    onSave: () => setSaveDialogOpen(true),
    onNewTrack: () => setTrack(generateTrack(config)),
    onShuffle: () => setTrack(generateTrack(config)),
    onOpenGallery: () => {
      setSettingsOpen(false)
      setGalleryOpen(true)
    },
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
          onShortcutsClick={() => setShortcutsOpen(true)}
        />
        <div className="flex flex-1 overflow-hidden">
          <LeftToolPanel
            onNewTrackClick={() => setTrack(generateTrack(config))}
            onSaveClick={() => setSaveDialogOpen(true)}
            onGalleryClick={() => {
              setSettingsOpen(false)
              setGalleryOpen(true)
            }}
            onSettingsClick={() => {
              setGalleryOpen(false)
              setSettingsOpen(true)
            }}
          />
          <main className="relative flex-1">
            <Scene />
          </main>
        </div>
      </div>
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="left" className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="pr-12">
            <SheetTitle>Track Settings</SheetTitle>
            <SheetDescription>
              Adjust gate quantities, field dimensions, gate size, and reset defaults.
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1">
            <div className="p-4">
              <GateConfigPanel />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <SaveTrackDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
      <TrackGallery open={galleryOpen} onOpenChange={setGalleryOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </TooltipProvider>
  )
}

export default App
