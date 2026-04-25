import type { FC } from 'react'
import { useState, useCallback } from 'react'
import { Dice5, Save, Settings2, GalleryVertical } from 'lucide-react'
import { useAppStore } from '@/store'
import { generateTrack } from '@/utils/generator'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SaveTrackDialog } from '@/components/ui/SaveTrackDialog'

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
  const setTrack = useAppStore((state) => state.setTrack)

  const [saveOpen, setSaveOpen] = useState(false)

  const handleShuffle = useCallback(() => {
    const track = generateTrack(config)
    setTrack(track)
  }, [config, setTrack])

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

  const handleSettingsClick = useCallback(() => {
    onSettingsClick?.()
  }, [onSettingsClick])

  const primaryTools = [
    {
      icon: Dice5,
      label: 'Mischen',
      shortcut: 'R',
      action: handleShuffle,
    },
    {
      icon: Save,
      label: 'Speichern',
      shortcut: 'Ctrl+S',
      action: handleSaveClick,
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
          {primaryTools.map(({ icon: Icon, label, shortcut, action }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={action}
                  aria-label={label}
                  className="size-11 rounded-2xl md:size-8 md:rounded-lg"
                >
                  <Icon className="size-5 md:size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden md:block">
                {label}{shortcut && ` (${shortcut})`}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </aside>

      {/* Fallback Save Dialog (when no onSaveClick prop provided) */}
      {!onSaveClick && (
        <SaveTrackDialog open={saveOpen} onOpenChange={setSaveOpen} />
      )}
    </>
  )
}
