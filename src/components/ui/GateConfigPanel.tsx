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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VENUE_PRESETS, getVenuePreset } from '@/utils/venuePresets'
import type { VenueId } from '@/types/venue'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { RotateCcw, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/i18n'


export function GateConfigPanel() {
  const { t, gateTypeLabel } = useTranslation()
  const config = useAppStore((state) => state.config)
  const setGateQuantity = useAppStore((state) => state.setGateQuantity)
  const setFieldSize = useAppStore((state) => state.setFieldSize)
  const setVenue = useAppStore((state) => state.setVenue)
  const resetToDefault = useAppStore((state) => state.resetToDefault)

  const activeVenuePreset = getVenuePreset(config.venueId)

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
        <CardTitle>{t('courseConfig')}</CardTitle>
        <CardDescription>
          {t('courseConfigDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gate Quantities */}
        <Collapsible open={quantitiesOpen} onOpenChange={setQuantitiesOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-foreground">
            {t('gateQuantity')}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${quantitiesOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {gateTypeOptions.map(({ type }) => (
              <div
                key={type}
                className="flex items-center justify-between gap-2"
              >
                <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GateIcon type={type} className="size-5 shrink-0" />
                  <span>{gateTypeLabel(type)}</span>
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
            {t('fieldSettings')}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${fieldOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            {/* Field Preset */}
            <div className="space-y-2">
              <Label htmlFor="field-preset" className="text-sm text-muted-foreground">
                {t('fieldPreset')}
              </Label>
              <Select
                value={config.venueId ?? 'custom'}
                onValueChange={(value) =>
                  setVenue(value === 'custom' ? null : (value as VenueId))
                }
              >
                <SelectTrigger id="field-preset" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">{t('fieldPresetCustom')}</SelectItem>
                  {VENUE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('fieldPresetDescription')}
              </p>
              {activeVenuePreset && (
                <p className="text-xs text-muted-foreground">
                  {t('fieldPresetLocked')}{' '}
                  {t('fieldPresetObstacles', { count: activeVenuePreset.obstacles.length })}
                </p>
              )}
            </div>

            {/* Field Size */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {t('fieldSize')}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="field-width" className="text-xs">
                    {t('width')}
                  </Label>
                  <Input
                    id="field-width"
                    type="number"
                    defaultValue={config.fieldSize.width}
                    key={`field-width-${config.fieldSize.width}`}
                    onBlur={commitFieldWidth}
                    onKeyDown={commitFieldSizeOnSubmit}
                    disabled={config.venueId !== null}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="field-height" className="text-xs">
                    {t('length')}
                  </Label>
                  <Input
                    id="field-height"
                    type="number"
                    defaultValue={config.fieldSize.height}
                    key={`field-height-${config.fieldSize.height}`}
                    onBlur={commitFieldHeight}
                    onKeyDown={commitFieldSizeOnSubmit}
                    disabled={config.venueId !== null}
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
              {t('resetDefaults')}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
