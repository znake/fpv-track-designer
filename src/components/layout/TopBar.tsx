import type { FC, ChangeEvent } from 'react'
import {
  Drone,
  Undo2,
  Redo2,
  Upload,
  Download,
  Play,
  Square,
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
import { PoleCounter } from './PoleCounter'

interface TopBarProps {
  onShortcutsClick: () => void
  fpvModeActive: boolean
  fpvDisabled: boolean
  onFpvToggle: () => void
}

export const TopBar: FC<TopBarProps> = ({ onShortcutsClick, fpvModeActive, fpvDisabled, onFpvToggle }) => {
  const past = useAppStore((state) => state.past)
  const future = useAppStore((state) => state.future)
  const undo = useAppStore((state) => state.undo)
  const redo = useAppStore((state) => state.redo)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const config = useAppStore((state) => state.config)
  const replaceTrack = useAppStore((state) => state.replaceTrack)
  const setConfig = useAppStore((state) => state.setConfig)
  const requestDestructiveAction = useAppStore((state) => state.requestDestructiveAction)
  const setSnapGatesToGrid = useAppStore((state) => state.setSnapGatesToGrid)
  const snapAllGatesToGrid = useAppStore((state) => state.snapAllGatesToGrid)
  const setShowFlightPath = useAppStore((state) => state.setShowFlightPath)
  const setShowOpeningLabels = useAppStore((state) => state.setShowOpeningLabels)
  const setShowGrid = useAppStore((state) => state.setShowGrid)

  const handleSnapGatesToGridChange = (enabled: boolean) => {
    setSnapGatesToGrid(enabled)
    if (enabled) {
      snapAllGatesToGrid()
    }
  }

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
    e.target.value = ''
    if (!file) return
    // Wrap the entire import (read + parse + apply) so the confirmation
    // dialog is shown BEFORE the file is read when the track is dirty.
    // The user's pick is discarded if they cancel.
    requestDestructiveAction(
      () => {
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
      },
      'Aktuelle Strecke verwerfen?',
      'Beim Import einer JSON-Datei wird die aktuelle Strecke ersetzt. Die ungespeicherten Änderungen gehen dabei verloren. Möchtest du sie zuerst speichern?',
    )
  }

  return (
    <header className="flex h-14 w-full shrink-0 items-center gap-1 border-b border-border bg-background/90 px-2 backdrop-blur-sm md:h-12 md:gap-2 md:px-3">
      {/* Left: Logo + Title */}
      <div className="flex min-w-0 items-center gap-2">
        <Drone className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight sm:hidden">
          FPV
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">
          FPV-Track-Designer
        </span>
        <Badge variant="outline" className="hidden border-primary/40 bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary sm:inline-flex">
          Beta Version
        </Badge>
      </div>

      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      {/* Center: Undo/Redo */}
      <div className="flex items-center gap-0.5 md:gap-1">
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

      <Separator orientation="vertical" className="hidden h-6 md:block" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={fpvModeActive ? 'secondary' : 'ghost'}
            size="sm"
            className="hidden gap-1.5 md:inline-flex"
            onClick={onFpvToggle}
            disabled={fpvDisabled}
          >
            {fpvModeActive ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
            <span>{fpvModeActive ? 'FPV stoppen' : 'FPV-Flug'}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {fpvModeActive
            ? 'Stoppt den Kameraflug und stellt die Editor-Kamera wieder her.'
            : 'Fliegt die Ideallinie automatisch aus der First-Person-Perspektive durch alle Gates.'}
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="hidden h-6 md:block" />

      {/* Center: Pole counter (badge with click-popover) */}
      <PoleCounter />

      <Separator orientation="vertical" className="hidden h-6 md:block" />

      {/* Center: View toggles */}
        <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="size-3 accent-primary"
                checked={config.showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span>Grid anzeigen</span>
            </label>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Blendet das Boden-Grid mit 1m-Zellen und 5m-Markierungen ein. Standardmäßig deaktiviert für eine ruhige, grüne Fläche.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="size-3 accent-primary"
                checked={config.snapGatesToGrid}
                onChange={(e) => handleSnapGatesToGridChange(e.target.checked)}
              />
              <span>Grid-Snap</span>
            </label>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Gates rasten auf einem festen Grid ein und drehen sich nur in 15°-Schritten – ideal, um eigene Gate-Kombinationen exakt auszurichten.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="size-3 accent-primary"
                checked={config.showFlightPath}
                onChange={(e) => setShowFlightPath(e.target.checked)}
              />
              <span>Flugbahn</span>
            </label>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Zeigt die Ideallinie als Flugpfad durch alle Gates an, inklusive Richtungspfeilen, in welcher Reihenfolge der Track geflogen wird.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="size-3 accent-primary"
                checked={config.showOpeningLabels}
                onChange={(e) => setShowOpeningLabels(e.target.checked)}
              />
              <span>Durchflüge</span>
            </label>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Markiert an jedem Gate die Reihenfolge der Durchflüge sowie die Einflug- und Ausflug-Seite – so siehst du auf einen Blick, wo du rein- und rauskommst.
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Right: Track name + actions */}
      <div className="ml-auto flex min-w-0 items-center gap-1 md:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://fpvooe.com/"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/15 sm:inline-flex"
            >
              #fpvooe
            </a>
          </TooltipTrigger>
          <TooltipContent>Zurück zu unserer Webseite (fpvooe.com)</TooltipContent>
        </Tooltip>

        {currentTrack && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="hidden max-w-48 truncate md:inline-flex">
                {currentTrack.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{currentTrack.name}</TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="hidden h-6 sm:block" />

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
          <TooltipContent className="max-w-xs">JSON importieren – lade eine Strecke, die du zuvor exportiert oder von einem anderen Piloten erhalten hast.</TooltipContent>
        </Tooltip>

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleExport} disabled={!currentTrack}>
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">JSON exportieren – speichert die aktuell geladene Strecke als JSON-Datei zum Teilen oder Sichern.</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="hidden h-6 sm:block" />

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
