import type { FC } from 'react'
import { useState, useCallback } from 'react'
import { Dice5, Save, Settings2, GalleryVertical, Share2 } from 'lucide-react'
import { useAppStore } from '@/store'
import { generateTrack } from '@/utils/generator'
import { extractGenerationConfig } from '@/utils/generationConfig'
import { createTrackShareUrl, getTrackShortenerEndpoint, shortenTrackShareUrl } from '@/utils/shareTrack'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SaveTrackDialog } from '@/components/ui/SaveTrackDialog'
import { ShareTrackDialog } from '@/components/ui/ShareTrackDialog'

interface LeftToolPanelProps {
  onSaveClick?: () => void
  onGalleryClick?: () => void
  onSettingsClick?: () => void
}

export const LeftToolPanel: FC<LeftToolPanelProps> = ({
  onSaveClick,
  onGalleryClick,
  onSettingsClick,
}) => {
  const config = useAppStore((state) => state.config)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setTrack = useAppStore((state) => state.setTrack)
  const requestDestructiveAction = useAppStore((state) => state.requestDestructiveAction)

  const [saveOpen, setSaveOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [originalShareUrl, setOriginalShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const handleShuffle = useCallback(() => {
    requestDestructiveAction(
      () => setTrack(generateTrack(config), extractGenerationConfig(config)),
      'Aktuelle Strecke verwerfen?',
      'Die aktuelle Strecke enthält ungespeicherte Änderungen, die beim Shuffle verloren gehen. Möchtest du sie zuerst speichern?',
    )
  }, [config, requestDestructiveAction, setTrack])

  const handleSaveClick = useCallback(() => {
    if (onSaveClick) {
      onSaveClick()
    } else {
      setSaveOpen(true)
    }
  }, [onSaveClick])

  const handleGalleryClick = useCallback(() => {
    onGalleryClick?.()
  }, [onGalleryClick])

  const handleShareClick = useCallback(() => {
    if (!currentTrack) return

    const longUrl = createTrackShareUrl(currentTrack, config, import.meta.env.VITE_VIEWER_DOMAIN)
    setShareUrl(longUrl)
    setOriginalShareUrl(longUrl)
    setShareError(null)
    setShareLoading(true)
    setShareOpen(true)

    void shortenTrackShareUrl(longUrl, { endpoint: getTrackShortenerEndpoint() })
      .then((shortUrl) => {
        setShareUrl(shortUrl)
        setShareError(null)
      })
      .catch(() => {
        setShareUrl(longUrl)
        setShareError('Der Kurzlink konnte nicht erstellt werden. Du kannst den langen Link trotzdem teilen.')
      })
      .finally(() => {
        setShareLoading(false)
      })
  }, [config, currentTrack])

  const handleSettingsClick = useCallback(() => {
    onSettingsClick?.()
  }, [onSettingsClick])

  const primaryTools: Array<{
    icon: typeof Dice5
    label: string
    shortcut: string
    description?: string
    action: () => void
    disabled?: boolean
  }> = [
    {
      icon: Dice5,
      label: 'Shuffle',
      shortcut: 'S',
      description:
        'Ordnet alle Gates neu an – basierend auf den Settings wird ein neuer Track zufällig generiert.',
      action: handleShuffle,
    },
    {
      icon: Save,
      label: 'Speichern',
      shortcut: 'Ctrl+S',
      action: handleSaveClick,
    },
    {
      icon: Share2,
      label: 'Track Teilen',
      shortcut: '',
      action: handleShareClick,
      disabled: !currentTrack,
    },
    {
      icon: GalleryVertical,
      label: 'Galerie',
      shortcut: 'G',
      action: handleGalleryClick,
    },
    {
      icon: Settings2,
      label: 'Einstellungen',
      shortcut: '',
      action: handleSettingsClick,
    },
  ]

  return (
    <>
      <aside className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(3.75rem+env(safe-area-inset-bottom))] shrink-0 items-start justify-center border-t border-border bg-surface/95 px-3 pt-2 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-200 ease-out md:static md:h-auto md:w-12 md:flex-col md:items-center md:justify-start md:border-t-0 md:border-r md:bg-surface md:px-0 md:py-2 md:shadow-none md:backdrop-blur-none">
        <div className="flex w-full max-w-sm items-center justify-around gap-2 md:w-auto md:flex-col md:justify-start md:gap-1">
          {primaryTools.map(({ icon: Icon, label, shortcut, description, action, disabled }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={action}
                  disabled={disabled}
                  aria-label={label}
                  className="size-11 rounded-2xl md:size-8 md:rounded-lg"
                >
                  <Icon className="size-5 md:size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden max-w-xs md:block">
                <div className="font-medium">
                  {label}{shortcut && ` (${shortcut})`}
                </div>
                {description && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </aside>

      {/* Fallback Save Dialog (when no onSaveClick prop provided) */}
      {!onSaveClick && (
        <SaveTrackDialog open={saveOpen} onOpenChange={setSaveOpen} />
      )}
      <ShareTrackDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
        originalShareUrl={originalShareUrl}
        isShortening={shareLoading}
        shortenError={shareError}
      />
    </>
  )
}
