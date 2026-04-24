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
      <aside className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-surface py-2 transition-all duration-200 ease-out">
        <div className="flex flex-col items-center gap-1">
          {primaryTools.map(({ icon: Icon, label, shortcut, action }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={action}
                  aria-label={label}
                  className="size-8"
                >
                  <Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
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
