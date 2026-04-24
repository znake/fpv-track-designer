import { useCallback, useEffect, useState } from 'react'
import { Trash2, Play, RefreshCw, Ghost } from 'lucide-react'

import { useAppStore } from '@/store'
import { loadTrack, listTracks, deleteTrack, type SavedTrackInfo } from '@/utils/storage'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

  const handleDelete = (id: string) => {
    deleteTrack(id)
    refreshTracks()
  }

  const refresh = refreshTracks

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-96 sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Track Gallery</SheetTitle>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={refresh}
            title="Refresh"
          >
            <RefreshCw />
          </Button>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 pr-4">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Ghost className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No saved tracks yet</p>
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
                            Current
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
                          Load
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 />
                          Delete
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
  )
}
