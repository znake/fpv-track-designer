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
    window.dispatchEvent(new CustomEvent('track-saved'))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Track</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="track-name">Track Name</Label>
            <Input
              id="track-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter track name"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!currentTrack}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
