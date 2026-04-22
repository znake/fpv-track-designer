import type { FC } from 'react'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAppStore } from '@/store'
import type { GateType } from '@/types/gate'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const GATE_LABELS: Record<GateType, string> = {
  'standard': 'Standard',
  'h-gate': 'H-Gate',
  'huerdel': 'Hürdel',
  'doppelgate': 'Doppelgate',
  'ladder': 'Ladder',
  'start-finish': 'Start/Ziel',
  'flag': 'Flag',
}

export const PropertiesPanel: FC = () => {
  const [isOpen, setIsOpen] = useState(true)

  const selectedGateId = useAppStore((state) => state.selectedGateId)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const config = useAppStore((state) => state.config)
  const rotateGate = useAppStore((state) => state.rotateGate)
  const moveGate = useAppStore((state) => state.moveGate)
  const selectGate = useAppStore((state) => state.selectGate)
  const setFieldSize = useAppStore((state) => state.setFieldSize)
  const setGateSize = useAppStore((state) => state.setGateSize)
  const resetToDefault = useAppStore((state) => state.resetToDefault)

  const selectedGate = currentTrack?.gates.find((g) => g.id === selectedGateId) ?? null

  const handleRotationChange = (value: number[]) => {
    if (!selectedGateId) return
    // rotateGate takes clockwise boolean, so we set absolute rotation
    // We need to calculate the difference
    const targetRotation = value[0]
    const current = selectedGate?.rotation ?? 0
    const diff = ((targetRotation - current + 360) % 360) / 30
    for (let i = 0; i < diff; i++) {
      rotateGate(selectedGateId, true)
    }
  }

  const handleFieldWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val > 0) {
      setFieldSize(val, config.fieldSize.height)
    }
  }

  const handleFieldHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val > 0) {
      setFieldSize(config.fieldSize.width, val)
    }
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="relative flex shrink-0 border-l border-border bg-surface transition-all duration-200 ease-out"
    >
      <CollapsibleContent className="w-[280px] overflow-hidden transition-all data-[state=closed]:w-0 data-[state=open]:w-[280px]">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
            <h2 className="text-sm font-semibold">Properties</h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6">
                <ChevronRight className="size-4" />
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {selectedGate ? (
                <>
                  {/* Gate type badge */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Gate Type</Label>
                    <Badge variant="default" className="w-full justify-center">
                      {GATE_LABELS[selectedGate.type]}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Position */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Position</Label>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-muted px-2 py-1.5">
                        <div className="text-xs text-muted-foreground">X</div>
                        <div className="text-sm font-mono">{selectedGate.position.x.toFixed(1)}</div>
                      </div>
                      <div className="rounded-md bg-muted px-2 py-1.5">
                        <div className="text-xs text-muted-foreground">Y</div>
                        <div className="text-sm font-mono">{selectedGate.position.y.toFixed(1)}</div>
                      </div>
                      <div className="rounded-md bg-muted px-2 py-1.5">
                        <div className="text-xs text-muted-foreground">Z</div>
                        <div className="text-sm font-mono">{selectedGate.position.z.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Rotation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Rotation</Label>
                      <span className="text-xs font-mono">{selectedGate.rotation}°</span>
                    </div>
                    <Slider
                      value={[selectedGate.rotation]}
                      min={0}
                      max={330}
                      step={30}
                      onValueChange={handleRotationChange}
                    />
                  </div>

                  <Separator />

                  {/* Movement D-Pad */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Move (1m)</Label>
                    <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => moveGate(selectedGateId!, 'N')}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => moveGate(selectedGateId!, 'W')}
                      >
                        <ArrowLeft className="size-3.5" />
                      </Button>
                      <div className="flex items-center justify-center">
                        <div className="size-2 rounded-full bg-muted-foreground/30" />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => moveGate(selectedGateId!, 'E')}
                      >
                        <ArrowRight className="size-3.5" />
                      </Button>
                      <div />
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => moveGate(selectedGateId!, 'S')}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <div />
                    </div>
                  </div>

                  <Separator />

                  {/* Deselect */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => selectGate(null)}
                  >
                    <X className="mr-2 size-3.5" />
                    Deselect Gate
                  </Button>
                </>
              ) : (
                <>
                  {/* General Settings */}
                  <div className="space-y-4">
                    {/* Field Size */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Field Size (m)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="field-width" className="text-xs">Width</Label>
                          <Input
                            id="field-width"
                            type="number"
                            value={config.fieldSize.width}
                            onChange={handleFieldWidthChange}
                            min={1}
                            className="h-7"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="field-height" className="text-xs">Height</Label>
                          <Input
                            id="field-height"
                            type="number"
                            value={config.fieldSize.height}
                            onChange={handleFieldHeightChange}
                            min={1}
                            className="h-7"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Gate Size */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Gate Size</Label>
                      <ToggleGroup
                        type="single"
                        value={String(config.gateSize)}
                        onValueChange={(v) => {
                          if (v) setGateSize(parseFloat(v) as 0.75 | 1 | 1.5)
                        }}
                        className="w-full"
                      >
                        <ToggleGroupItem value="0.75" className="flex-1 text-xs">
                          75cm
                        </ToggleGroupItem>
                        <ToggleGroupItem value="1" className="flex-1 text-xs">
                          1m
                        </ToggleGroupItem>
                        <ToggleGroupItem value="1.5" className="flex-1 text-xs">
                          1.5m
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    <Separator />

                    {/* Reset */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={resetToDefault}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>

      {/* Collapse toggle when closed */}
      {!isOpen && (
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 size-6 -translate-y-1/2 rounded-l-none border-l border-border bg-surface hover:bg-surface-hover"
          >
            <ChevronLeft className="size-4" />
          </Button>
        </CollapsibleTrigger>
      )}
    </Collapsible>
  )
}
