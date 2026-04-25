import type { FC, ChangeEvent } from 'react'
import {
  Drone,
  Undo2,
  Redo2,
  Upload,
  Download,
  CircleHelp,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { serializeTrack, deserializeTrack } from '@/schemas/track.schema'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface TopBarProps {
  onShortcutsClick: () => void
}

export const TopBar: FC<TopBarProps> = ({ onShortcutsClick }) => {
  const past = useAppStore((state) => state.past)
  const future = useAppStore((state) => state.future)
  const undo = useAppStore((state) => state.undo)
  const redo = useAppStore((state) => state.redo)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const config = useAppStore((state) => state.config)
  const replaceTrack = useAppStore((state) => state.replaceTrack)
  const setConfig = useAppStore((state) => state.setConfig)
  const setShowFlightPath = useAppStore((state) => state.setShowFlightPath)
  const setShowOpeningLabels = useAppStore((state) => state.setShowOpeningLabels)

  const handleExport = () => {
    if (!currentTrack) return
    const json = serializeTrack(currentTrack, config)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentTrack.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const result = deserializeTrack(json)
        if ('error' in result) {
          console.error('Import failed:', result.error)
        } else {
          setConfig(result.config)
          replaceTrack(result.track)
        }
      } catch {
        console.error('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header className="flex h-12 w-full shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-sm">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2">
        <Drone className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">
          FPV-Track-Designer
        </span>
        <Badge variant="outline" className="hidden border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-700 sm:inline-flex">
          Alpha Version
        </Badge>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Center: Undo/Redo */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={past.length === 0}
            >
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Rückgängig{past.length > 0 && ` (${past.length})`}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={future.length === 0}
            >
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Wiederholen{future.length > 0 && ` (${future.length})`}
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Center: View toggles */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="size-3 accent-primary"
            checked={config.showFlightPath}
            onChange={(e) => setShowFlightPath(e.target.checked)}
          />
          <span>Flugbahn</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="size-3 accent-primary"
            checked={config.showOpeningLabels}
            onChange={(e) => setShowOpeningLabels(e.target.checked)}
          />
          <span>Durchflüge</span>
        </label>
      </div>

      {/* Right: Track name + actions */}
      <div className="ml-auto flex items-center gap-2">
        <a
          href="https://fpvooe.com/"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/15 sm:inline-flex"
        >
          #fpvooe
        </a>

        {currentTrack && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="max-w-48 truncate">
                {currentTrack.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{currentTrack.name}</TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Import */}
        <Tooltip>
          <TooltipTrigger asChild>
            <label>
              <Button variant="ghost" size="icon" asChild>
                <span>
                  <Upload className="size-4" />
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </TooltipTrigger>
          <TooltipContent>JSON importieren</TooltipContent>
        </Tooltip>

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleExport} disabled={!currentTrack}>
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>JSON exportieren</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Help */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onShortcutsClick}>
              <CircleHelp className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hilfe</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
