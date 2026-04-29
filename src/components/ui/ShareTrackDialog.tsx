import type { FC } from 'react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ShareTrackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareUrl: string
  originalShareUrl?: string
  isShortening?: boolean
  shortenError?: string | null
}

export const ShareTrackDialog: FC<ShareTrackDialogProps> = ({
  open,
  onOpenChange,
  shareUrl,
  originalShareUrl = '',
  isShortening = false,
  shortenError = null,
}) => {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)
  const [prevShareUrl, setPrevShareUrl] = useState(shareUrl)
  const hasShortLink = Boolean(originalShareUrl && shareUrl && originalShareUrl !== shareUrl)

  if (open !== prevOpen || shareUrl !== prevShareUrl) {
    setPrevOpen(open)
    setPrevShareUrl(shareUrl)
    setCopied(false)
    setCopyError(null)
  }

  const handleCopy = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setCopyError(null)
    } catch {
      setCopied(false)
      setCopyError('Der Link konnte nicht automatisch kopiert werden. Bitte kopiere ihn manuell.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track teilen</DialogTitle>
          <DialogDescription>
            Kopiere diesen Link und schicke ihn an Freunde. Der Track öffnet sich im reinen Ansichtsmodus ohne Bearbeitungsfunktionen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="share-track-url">Teilbarer Link</Label>
          <Input
            id="share-track-url"
            value={shareUrl}
            readOnly
            aria-label="Teilbarer Link"
            onFocus={(event) => event.currentTarget.select()}
          />
          {isShortening && (
            <p className="text-xs text-muted-foreground">
              Kurzlink wird erstellt. Bis dahin ist der lange Link bereits nutzbar.
            </p>
          )}
          {!isShortening && hasShortLink && (
            <p className="text-xs text-muted-foreground">
              Kurzlink erstellt. Bewahre den Original-Link zusätzlich auf, falls der Kurzlink später nicht verfügbar ist.
            </p>
          )}
          {!isShortening && !hasShortLink && !shortenError && (
            <p className="text-xs text-muted-foreground">
              Der Track öffnet sich über diesen Link im reinen Ansichtsmodus.
            </p>
          )}
          {shortenError && <p className="text-xs text-destructive">{shortenError}</p>}
          {copyError && <p className="text-xs text-destructive">{copyError}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          <Button type="button" onClick={handleCopy} disabled={!shareUrl}>
            {copied ? 'Kopiert!' : 'Link kopieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
