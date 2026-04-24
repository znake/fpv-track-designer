import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

type Direction = 'N' | 'S' | 'E' | 'W'

interface DirectionalPadProps {
  onMove: (direction: Direction) => void
  disabled?: boolean
}

export function DirectionalPad({ onMove, disabled }: DirectionalPadProps) {
  return (
    <div className="grid grid-cols-3 gap-1 w-fit">
      <div />
      <Button variant="outline" size="sm" onClick={() => onMove('N')} disabled={disabled} aria-label="Nach oben bewegen">
        <ArrowUp className="size-4" />
      </Button>
      <div />
      <Button variant="outline" size="sm" onClick={() => onMove('W')} disabled={disabled} aria-label="Nach links bewegen">
        <ArrowLeft className="size-4" />
      </Button>
      <div className="flex items-center justify-center text-xs text-muted-foreground">1m</div>
      <Button variant="outline" size="sm" onClick={() => onMove('E')} disabled={disabled} aria-label="Nach rechts bewegen">
        <ArrowRight className="size-4" />
      </Button>
      <div />
      <Button variant="outline" size="sm" onClick={() => onMove('S')} disabled={disabled} aria-label="Nach unten bewegen">
        <ArrowDown className="size-4" />
      </Button>
      <div />
    </div>
  )
}
