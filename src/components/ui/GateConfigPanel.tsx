import { useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { useAppStore } from '@/store'
import type { GateType } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { RotateCcw, ChevronDown } from 'lucide-react'

const GATE_TYPES: { type: GateType; label: string }[] = [
  { type: 'start-finish', label: 'Start/Ziel-Tor' },
  { type: 'standard', label: 'Standard-Tor' },
  { type: 'h-gate', label: 'H-Tor' },
  { type: 'double-h', label: 'Doppel-H-Tor' },
  { type: 'dive', label: 'Dive-Tor' },
  { type: 'double', label: 'Doppeltor' },
  { type: 'ladder', label: 'Leitertor' },
  { type: 'flag', label: 'Flaggen-Tor' },
]

const GATE_SIZE_OPTIONS: ReadonlyArray<{ value: 0.75 | 1 | 1.5; label: string }> = [
  { value: 0.75, label: '75cm' },
  { value: 1, label: '1m' },
  { value: 1.5, label: '1.5m' },
]

export function GateConfigPanel() {
  const config = useAppStore((state) => state.config)
  const setGateQuantity = useAppStore((state) => state.setGateQuantity)
  const setFieldSize = useAppStore((state) => state.setFieldSize)
  const setGateSize = useAppStore((state) => state.setGateSize)
  const resetToDefault = useAppStore((state) => state.resetToDefault)

  const [quantitiesOpen, setQuantitiesOpen] = useState(true)
  const [fieldOpen, setFieldOpen] = useState(true)

  const handleGateSizeChange = (value: string) => {
    const selectedSize = Number(value)

    if (selectedSize === 0.75 || selectedSize === 1 || selectedSize === 1.5) {
      setGateSize(selectedSize)
    }
  }

  const normalizeFieldSizeValue = (value: string): string | null => {
    const parsedValue = parseInt(value, 10)

    return Number.isNaN(parsedValue) || parsedValue <= 0 ? null : String(parsedValue)
  }

  const commitFieldWidth = (event: FocusEvent<HTMLInputElement>) => {
    const normalized = normalizeFieldSizeValue(event.currentTarget.value)

    if (!normalized) {
      event.currentTarget.value = String(config.fieldSize.width)
      return
    }

    setFieldSize(parseInt(normalized, 10), config.fieldSize.height)
    event.currentTarget.value = normalized
  }

  const commitFieldHeight = (event: FocusEvent<HTMLInputElement>) => {
    const normalized = normalizeFieldSizeValue(event.currentTarget.value)

    if (!normalized) {
      event.currentTarget.value = String(config.fieldSize.height)
      return
    }

    setFieldSize(config.fieldSize.width, parseInt(normalized, 10))
    event.currentTarget.value = normalized
  }

  const commitFieldSizeOnSubmit = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kurskonfiguration</CardTitle>
        <CardDescription>
          Verwalten Sie die Toranzahl und die Feldabmessungen für neue Layouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gate Quantities */}
        <Collapsible open={quantitiesOpen} onOpenChange={setQuantitiesOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-foreground">
            Toranzahl
            <ChevronDown
              className={`h-4 w-4 transition-transform ${quantitiesOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {GATE_TYPES.map(({ type, label }) => (
              <div
                key={type}
                className="flex items-center justify-between gap-2"
              >
                <Label className="text-sm text-muted-foreground">
                  {label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={config.gateQuantities[type]}
                  onChange={(e) =>
                    setGateQuantity(
                      type,
                      Math.max(0, parseInt(e.target.value) || 0)
                    )
                  }
                  className="w-16 text-center"
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Field Settings */}
        <Collapsible open={fieldOpen} onOpenChange={setFieldOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-foreground">
            Feldeinstellungen
            <ChevronDown
              className={`h-4 w-4 transition-transform ${fieldOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            {/* Field Size */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Feldgröße (m)
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="field-width" className="text-xs">
                    Breite
                  </Label>
                  <Input
                    id="field-width"
                    type="number"
                    defaultValue={config.fieldSize.width}
                    key={`field-width-${config.fieldSize.width}`}
                    onBlur={commitFieldWidth}
                    onKeyDown={commitFieldSizeOnSubmit}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="field-height" className="text-xs">
                    Länge
                  </Label>
                  <Input
                    id="field-height"
                    type="number"
                    defaultValue={config.fieldSize.height}
                    key={`field-height-${config.fieldSize.height}`}
                    onBlur={commitFieldHeight}
                    onKeyDown={commitFieldSizeOnSubmit}
                  />
                </div>
              </div>
            </div>

            {/* Gate Size */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Torgröße
              </Label>
              <ToggleGroup
                type="single"
                value={String(config.gateSize)}
                onValueChange={handleGateSizeChange}
                className="w-full"
              >
                {GATE_SIZE_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option.value} value={String(option.value)} className="flex-1">
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={resetToDefault}
              className="w-full"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Auf Standard zurücksetzen
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
