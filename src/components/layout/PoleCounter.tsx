import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { AlertTriangle, Hammer } from 'lucide-react'
import { useAppStore } from '@/store'
import { calculatePoleBreakdown } from '@/utils/poleCount'
import {
  sanitizeMaxPoles,
  setStoredMaxPoles,
  useMaxPoles,
} from '@/utils/poleLimit'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Stangenzähler – zeigt im TopBar an, wie viele Stangen für den Aufbau
 * der aktuellen Strecke gebraucht werden. Bei Klick öffnet sich ein Popover
 * mit dem Detail-Breakdown pro Gate-Typ und der im Browser hinterlegten
 * Stangen-Obergrenze.
 *
 * Dive-Gates und Tunnel werden als "nicht aus Stangen baubar" markiert
 * (siehe `POLES_PER_GATE`).
 */
export const PoleCounter: FC = () => {
  const { t, gateTypeLabel } = useTranslation()
  const gates = useAppStore((state) => state.currentTrack?.gates ?? null)
  const maxPoles = useMaxPoles()
  const [maxPolesDraft, setMaxPolesDraft] = useState<string | null>(null)
  const [wasOverLimit, setWasOverLimit] = useState(false)
  const [limitWarningDismissed, setLimitWarningDismissed] = useState(false)

  const breakdown = useMemo(
    () => calculatePoleBreakdown(gates ?? []),
    [gates],
  )

  const overLimit = breakdown.total > maxPoles

  // Beim Überschreiten einmal warnen und nach dem Wegklicken erst wieder
  // warnen, wenn die Strecke zwischenzeitlich unter das Limit gefallen ist.
  if (wasOverLimit !== overLimit) {
    setWasOverLimit(overLimit)
    if (!overLimit) {
      setLimitWarningDismissed(false)
    }
  }

  if (!gates || gates.length === 0) {
    return null
  }

  const buildableEntries = breakdown.entries.filter((e) => !e.notBuildable)
  const notBuildableEntries = breakdown.entries.filter((e) => e.notBuildable)
  const showLimitWarning = overLimit && !limitWarningDismissed

  const handleMaxPolesChange = (value: string) => {
    setMaxPolesDraft(value)
    const parsed = sanitizeMaxPoles(value)
    if (parsed !== null) {
      setStoredMaxPoles(parsed)
    }
  }

  const handleMaxPolesBlur = () => {
    setMaxPolesDraft(null)
  }

  return (
    <>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  overLimit
                    ? 'border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20'
                    : 'border-border/60 bg-muted/40 text-foreground hover:bg-muted'
                }`}
                aria-label={t('polesAria', { count: breakdown.total })}
              >
                {overLimit ? (
                  <AlertTriangle className="size-3.5" />
                ) : (
                  <Hammer className="size-3.5 text-muted-foreground" />
                )}
                <span className="hidden sm:inline">{t('polesLabel')}</span>
                <span className="tabular-nums">{breakdown.total}</span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {t('poleCounterTooltip')}
          </TooltipContent>
        </Tooltip>

        <PopoverContent align="start" className="w-80 p-0">
          <div className="flex flex-col">
            <div className="border-b border-border px-3 py-2">
              <div className="text-sm font-semibold">{t('poleCalculation')}</div>
              <div className="text-xs text-muted-foreground">
                {t('poleCalculationDescription')}
              </div>
            </div>

            <div className="px-3 py-2">
              {buildableEntries.length === 0 ? (
                <div className="py-2 text-xs text-muted-foreground">
                  {t('noBuildableGates')}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="pb-1 text-left font-medium">{t('gateType')}</th>
                      <th className="pb-1 text-right font-medium">{t('quantity')}</th>
                      <th className="pb-1 text-right font-medium">×</th>
                      <th className="pb-1 text-right font-medium">{t('poles')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildableEntries.map((entry) => (
                      <tr key={entry.type} className="align-baseline">
                        <td className="py-0.5 pr-2">{gateTypeLabel(entry.type)}</td>
                        <td className="py-0.5 pr-2 text-right tabular-nums">{entry.count}</td>
                        <td className="py-0.5 pr-2 text-right tabular-nums text-muted-foreground">
                          {entry.polesPerGate}
                        </td>
                        <td className="py-0.5 text-right tabular-nums font-medium">
                          {entry.subtotal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td className="pt-1.5 pr-2 text-sm font-semibold" colSpan={3}>
                        {t('total')}
                      </td>
                      <td
                        className={`pt-1.5 text-right text-sm font-semibold tabular-nums ${
                          overLimit ? 'text-destructive' : ''
                        }`}
                      >
                        {breakdown.total}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="border-t border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium">{t('maxPolesLabel')}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t('maxPolesDescription')}
                  </div>
                </div>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={maxPolesDraft ?? String(maxPoles)}
                  onFocus={() => setMaxPolesDraft(String(maxPoles))}
                  onChange={(e) => handleMaxPolesChange(e.target.value)}
                  onBlur={handleMaxPolesBlur}
                  aria-label={t('maxPolesInputAria')}
                  className="h-7 w-16 shrink-0 px-2 text-right text-xs tabular-nums"
                />
              </div>
              {overLimit && (
                <div className="mt-1.5 text-[11px] font-medium text-destructive">
                  {t('polesLimitOver', { max: maxPoles })}
                </div>
              )}
            </div>

            {notBuildableEntries.length > 0 && (
              <div className="border-t border-border bg-muted/30 px-3 py-2">
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('notBuildableFromPoles')}
                </div>
                <ul className="space-y-0.5 text-xs">
                  {notBuildableEntries.map((entry) => (
                    <li
                      key={entry.type}
                      className="flex items-center justify-between text-muted-foreground"
                    >
                      <span>{gateTypeLabel(entry.type)}</span>
                      <span className="tabular-nums">{entry.count}×</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {showLimitWarning && (
        <Dialog open onOpenChange={() => setLimitWarningDismissed(true)}>
          <DialogContent role="alertdialog" className="max-w-sm border-destructive/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                {t('poleLimitReachedTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('poleLimitReachedBody', { max: maxPoles, total: breakdown.total })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2 sm:gap-2">
              <Button
                type="button"
                variant="destructive"
                autoFocus
                onClick={() => setLimitWarningDismissed(true)}
              >
                {t('poleLimitReachedDismiss')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
