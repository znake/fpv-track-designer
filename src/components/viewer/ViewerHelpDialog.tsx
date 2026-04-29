import { CircleHelp } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ViewerHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const viewerControls = [
  { description: 'Ansicht drehen', keys: 'Linke Maustaste gedrückt halten und ziehen' },
  { description: 'Über die Strecke bewegen', keys: 'Rechte Maustaste ziehen oder Space + linke Maustaste ziehen' },
  { description: 'Kamerahöhe ändern', keys: 'Shift gedrückt halten und mit linker Maustaste ziehen' },
  { description: 'Zoomen', keys: 'Mausrad scrollen oder mittlere Maustaste ziehen' },
]

export function ViewerHelpDialog({ open, onOpenChange }: ViewerHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-white/10 bg-slate-950/95 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur">
        <DialogHeader className="pr-10">
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="size-5 text-sky-300" />
            Viewer-Hilfe
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            So bewegst du dich durch den geteilten Track. Der Viewer ist read-only, du kannst also nichts versehentlich verändern.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {viewerControls.map((control) => (
            <div key={control.description} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-semibold text-slate-100">{control.description}</div>
              <div className="mt-1 text-sm leading-6 text-slate-300">{control.keys}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
