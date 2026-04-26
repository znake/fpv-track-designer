import { useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { useAppStore } from '@/store'
import { gateTypeOptions } from '@/utils/gateTypeOptions'
import { GateIcon } from '@/components/icons/GateIcon'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { RotateCcw, ChevronDown } from 'lucide-react'


export function GateConfigPanel() {
  const config = useAppStore((state) => state.config)
  const setGateQuantity = useAppStore((state) => state.setGateQuantity)
  const setFieldSize = useAppStore((state) => state.setFieldSize)
  const resetToDefault = useAppStore((state) => state.resetToDefault)

  const [quantitiesOpen, setQuantitiesOpen] = useState(true)
  const [fieldOpen, setFieldOpen] = useState(true)

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
          Verwalten Sie die Gate-Anzahl und die Feldabmessungen für neue Layouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gate Quantities */}
        <Collapsible open={quantitiesOpen} onOpenChange={setQuantitiesOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-foreground">
            Gate-Anzahl
            <ChevronDown
              className={`h-4 w-4 transition-transform ${quantitiesOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {gateTypeOptions.map(({ type, label }) => (
              <div
                key={type}
                className="flex items-center justify-between gap-2"
              >
                <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GateIcon type={type} className="size-5 shrink-0" />
                  <span>{label}</span>
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
