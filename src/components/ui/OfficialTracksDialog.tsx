import { useMemo } from 'react'
import { AlertTriangle, Ghost, Play } from 'lucide-react'

import { useAppStore } from '@/store'
import { listOfficialTracks, loadOfficialTrack } from '@/utils/officialTracks'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface OfficialTracksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OfficialTracksDialog({ open, onOpenChange }: OfficialTracksDialogProps) {
  const { t } = useTranslation()
  const replaceTrack = useAppStore((state) => state.replaceTrack)
  const setConfig = useAppStore((state) => state.setConfig)
  const requestDestructiveAction = useAppStore((state) => state.requestDestructiveAction)
  // Parsed once per mount, not per open state: tying the result to `open`
  // emptied the list during the closing animation and flashed the empty state.
  const { tracks, invalidFiles } = useMemo(() => listOfficialTracks(), [])

  const handleLoad = (sourceFile: string) => {
    requestDestructiveAction(
      () => {
        const result = loadOfficialTrack(sourceFile)
        if (!result) return
        setConfig(result.config)
        replaceTrack(result.track)
        onOpenChange(false)
      },
      t('discardCurrentTrackTitle'),
      t('dirtyOfficialTracksLoadDescription'),
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(100dvw,24rem)] gap-0 sm:max-w-md">
        <SheetHeader className="pr-12">
          <SheetTitle>{t('officialTracksTitle')}</SheetTitle>
          <SheetDescription>{t('officialTracksDescription')}</SheetDescription>
        </SheetHeader>

        <Separator />

        {invalidFiles.length > 0 && (
          <div className="flex items-start gap-2 px-4 pt-4 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>
              {t('officialTracksInvalidFiles', {
                count: invalidFiles.length,
                files: invalidFiles.map((file) => file.sourceFile.split('/').pop()).join(', '),
              })}
            </p>
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1 px-4">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Ghost className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('officialTracksEmpty')}</p>
            </div>
          ) : (
            <ul className="py-2">
              {tracks.map((track) => (
                <li
                  key={track.sourceFile}
                  className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span
                      className="truncate text-sm font-semibold text-foreground"
                      title={track.name}
                    >
                      {track.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t('officialTracksGateCount', { count: track.gateCount })}
                      {' · '}
                      {t('officialTracksFieldSize', {
                        width: track.fieldSize.width,
                        height: track.fieldSize.height,
                      })}
                    </span>
                  </div>
                  <Button size="xs" onClick={() => handleLoad(track.sourceFile)}>
                    <Play />
                    {t('load')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
