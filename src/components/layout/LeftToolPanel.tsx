import type { FC } from 'react'
import { useState, useCallback } from 'react'
import { Dice5, Save, FilePlus, Settings2, GalleryVertical } from 'lucide-react'
import { useAppStore } from '@/store'
import { generateTrack } from '@/utils/generator'
import type { Track } from '@/types/track'
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
}

export const LeftToolPanel: FC<LeftToolPanelProps> = ({ onSaveClick, onGalleryClick }) => {
  const config = useAppStore((state) => state.config)
  const setTrack = useAppStore((state) => state.setTrack)

  const [saveOpen, setSaveOpen] = useState(false)

  const handleShuffle = useCallback(() => {
    const track = generateTrack(config)
    setTrack(track)
  }, [config, setTrack])

  const handleNew = useCallback(() => {
    setTrack(null as unknown as Track)
  }, [setTrack])

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

  const tools = [
    {
      icon: Dice5,
      label: 'Shuffle',
      shortcut: 'R',
      action: handleShuffle,
    },
    {
      icon: Save,
      label: 'Save',
      shortcut: 'Ctrl+S',
      action: handleSaveClick,
    },
    {
      icon: FilePlus,
      label: 'New Track',
      shortcut: 'Ctrl+N',
      action: handleNew,
    },
    {
      icon: Settings2,
      label: 'Settings',
      shortcut: '',
      action: () => {},
    },
    {
      icon: GalleryVertical,
      label: 'Gallery',
      shortcut: 'G',
      action: handleGalleryClick,
    },
  ]

  return (
    <>
      <aside className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-surface py-2 transition-all duration-200 ease-out">
        <div className="flex flex-col items-center gap-1">
          {tools.map(({ icon: Icon, label, shortcut, action }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={action}
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
