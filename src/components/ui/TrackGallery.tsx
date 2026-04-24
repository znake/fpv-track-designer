import { useCallback, useEffect, useState } from 'react'
import { Copy, Trash2, Play, RefreshCw, Ghost } from 'lucide-react'

import { useAppStore } from '@/store'
import { loadTrack, listTracks, deleteTrack, saveTrack, type SavedTrackInfo } from '@/utils/storage'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface TrackGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TrackGallery({ open, onOpenChange }: TrackGalleryProps) {
  const currentTrack = useAppStore((state) => state.currentTrack)
  const replaceTrack = useAppStore((state) => state.replaceTrack)
  const setConfig = useAppStore((state) => state.setConfig)
  const [tracks, setTracks] = useState<SavedTrackInfo[]>(() => listTracks())
  const [trackToDelete, setTrackToDelete] = useState<SavedTrackInfo | null>(null)
  const [trackToDuplicate, setTrackToDuplicate] = useState<SavedTrackInfo | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const refreshTracks = useCallback(() => setTracks(listTracks()), [])

  useEffect(() => {
    if (open) {
      const timeoutId = window.setTimeout(refreshTracks, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [open, refreshTracks])

  useEffect(() => {
    window.addEventListener('track-saved', refreshTracks)
    return () => window.removeEventListener('track-saved', refreshTracks)
  }, [refreshTracks])

  const handleLoad = (id: string) => {
    const result = loadTrack(id)
    if (result) {
      setConfig(result.config)
      replaceTrack(result.track)
      onOpenChange(false)
    }
    refreshTracks()
  }

  const handleDeleteClick = (track: SavedTrackInfo) => {
    setTrackToDelete(track)
  }

  const handleDuplicateClick = (track: SavedTrackInfo) => {
    setTrackToDuplicate(track)
    setDuplicateName(`${track.name} Kopie`)
  }

  const handleDuplicateDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTrackToDuplicate(null)
      setDuplicateName('')
    }
  }

  const handleDeleteDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTrackToDelete(null)
    }
  }

  const handleDeleteConfirm = () => {
    if (!trackToDelete) return
    deleteTrack(trackToDelete.id)
    setTrackToDelete(null)
    refreshTracks()
  }

  const handleDuplicateConfirm = () => {
    if (!trackToDuplicate) return

    const saved = loadTrack(trackToDuplicate.id)
    if (!saved) {
      setTrackToDuplicate(null)
      setDuplicateName('')
      refreshTracks()
      return
    }

    const now = new Date().toISOString()
    const copiedTrack = {
      ...saved.track,
      id: crypto.randomUUID(),
      name: duplicateName.trim() || `${trackToDuplicate.name} Kopie`,
      createdAt: now,
      updatedAt: now,
    }

    saveTrack(copiedTrack, saved.config)
    window.dispatchEvent(new CustomEvent('track-saved'))
    setTrackToDuplicate(null)
    setDuplicateName('')
    refreshTracks()
  }

  const refresh = refreshTracks

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-96 sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Strecken-Galerie</SheetTitle>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={refresh}
            title="Aktualisieren"
          >
            <RefreshCw />
          </Button>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 pr-4">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Ghost className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Noch keine gespeicherten Strecken</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-4">
              {tracks.map((t) => {
                const isCurrent = currentTrack?.id === t.id
                return (
                  <Card
                    key={t.id}
                    className={
                      isCurrent
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-border/50'
                    }
                  >
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {t.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(t.updatedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px]">
                            Aktuell
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleLoad(t.id)}
                          className="flex-1"
                        >
                          <Play />
                          Laden
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateClick(t)}
                        >
                          <Copy />
                          Duplizieren
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(t)}
                        >
                          <Trash2 />
                          Löschen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={trackToDelete !== null} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleDeleteConfirm()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleDeleteConfirm()
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Gespeicherte Strecke löschen?</DialogTitle>
              <DialogDescription>
                {trackToDelete
                  ? `„${trackToDelete.name}“ wird aus der Galerie entfernt. Dies kann nicht rückgängig gemacht werden.`
                  : 'Diese gespeicherte Strecke wird aus der Galerie entfernt. Dies kann nicht rückgängig gemacht werden.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteDialogOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" variant="destructive" autoFocus>
                Strecke löschen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={trackToDuplicate !== null} onOpenChange={handleDuplicateDialogOpenChange}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleDuplicateConfirm()
            }}
          >
            <DialogHeader>
              <DialogTitle>Strecke duplizieren</DialogTitle>
              <DialogDescription>
                Vergib einen Namen für die Kopie von „{trackToDuplicate?.name ?? 'dieser Strecke'}“.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="duplicate-track-name">Neuer Streckenname</Label>
              <Input
                id="duplicate-track-name"
                value={duplicateName}
                onChange={(event) => setDuplicateName(event.target.value)}
                placeholder="Name der duplizierten Strecke"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDuplicateDialogOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit">
                Duplizieren
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
