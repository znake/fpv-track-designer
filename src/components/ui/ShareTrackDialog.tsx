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
import { useTranslation } from '@/i18n'

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
  const { t } = useTranslation()
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
      setCopyError(t('copyLinkError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('shareDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('shareDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="share-track-url">{t('shareableLink')}</Label>
          <Input
            id="share-track-url"
            value={shareUrl}
            readOnly
            aria-label={t('shareableLink')}
            onFocus={(event) => event.currentTarget.select()}
          />
          {isShortening && (
            <p className="text-xs text-muted-foreground">
              {t('shortLinkCreating')}
            </p>
          )}
          {!isShortening && hasShortLink && (
            <p className="text-xs text-muted-foreground">
              {t('shortLinkCreated')}
            </p>
          )}
          {!isShortening && !hasShortLink && !shortenError && (
            <p className="text-xs text-muted-foreground">
              {t('readonlyLinkInfo')}
            </p>
          )}
          {shortenError && <p className="text-xs text-destructive">{shortenError}</p>}
          {copyError && <p className="text-xs text-destructive">{copyError}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
          <Button type="button" onClick={handleCopy} disabled={!shareUrl}>
            {copied ? t('copied') : t('copyLink')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
