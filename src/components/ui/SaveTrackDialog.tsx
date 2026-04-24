import type { FC } from 'react'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { saveTrack } from '@/utils/storage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface SaveTrackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SaveTrackDialog: FC<SaveTrackDialogProps> = ({ open, onOpenChange }) => {
  const currentTrack = useAppStore((state) => state.currentTrack)
  const syncCurrentTrack = useAppStore((state) => state.syncCurrentTrack)
  const config = useAppStore((state) => state.config)
  const [name, setName] = useState(currentTrack?.name ?? '')

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && currentTrack) {
      setName(currentTrack.name)
    }
    onOpenChange(newOpen)
  }

  const handleSave = () => {
    if (!currentTrack) return
    const trackName = name || currentTrack.name
    const updated = { ...currentTrack, name: trackName, updatedAt: new Date().toISOString() }
    saveTrack(updated, config)
    syncCurrentTrack(updated)
    window.dispatchEvent(new CustomEvent('track-saved'))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Strecke speichern</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSave()
          }}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="track-name">Streckenname</Label>
              <Input
                id="track-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Streckenname eingeben"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!currentTrack}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
