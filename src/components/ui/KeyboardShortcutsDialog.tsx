import type { LucideIcon } from 'lucide-react'
import { CircleHelp, Move, Plus, RotateCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

const ctrl = isMac ? '⌘' : 'Ctrl'

interface ShortcutRow {
  description: string
  keys: string[]
}

interface ShortcutGroup {
  category: string
  shortcuts: ShortcutRow[]
}

interface HelpStep {
  title: string
  description: string
  Icon: LucideIcon
  accentClassName: string
}

const helpSteps: HelpStep[] = [
  {
    title: 'Tor verschieben',
    description: 'Tor einmal anklicken, dann das Verschieben-Symbol gedrückt halten und das Tor an die gewünschte Position ziehen.',
    Icon: Move,
    accentClassName: 'text-primary border-primary/40 bg-primary/10',
  },
  {
    title: 'Tor drehen',
    description: 'Tor einmal anklicken, dann das Dreh-Symbol gedrückt halten und seitlich ziehen, bis die Ausrichtung passt.',
    Icon: RotateCw,
    accentClassName: 'text-secondary border-secondary/40 bg-secondary/10',
  },
  {
    title: 'Tor hinzufügen',
    description: 'Tor anklicken, bei dem davor oder danach ein neues Tor eingefügt werden soll. Dann auf das Plus-Symbol klicken und den Tortyp auswählen.',
    Icon: Plus,
    accentClassName: 'text-primary border-primary/40 bg-primary/10',
  },
]

const shortcuts: ShortcutGroup[] = [
  {
    category: 'Strecke',
    shortcuts: [
      { description: 'Streke Shuffeln', keys: ['R'] },
      { description: 'Strecke speichern', keys: [ctrl, 'S'] },
    ],
  },
  {
    category: 'Steuerung',
    shortcuts: [
      { description: 'Galerie öffnen', keys: ['G'] },
      { description: 'Ansicht verschieben', keys: ['Space + linke Maustaste ziehen'] },
      { description: 'Kamerahöhe ändern', keys: ['Shift + linke Maustaste ziehen'] },
      { description: 'Tor abwählen / Dialoge schließen', keys: ['Escape'] },
    ],
  },
  {
    category: 'Tor-Bearbeitung',
    shortcuts: [
      { description: 'Ausgewähltes Tor löschen', keys: ['Backspace'] },
      { description: 'Löschen bestätigen', keys: ['Enter'] },
      { description: 'Tor ziehen / drehen', keys: ['Werkzeuge im 3D-Feld'] },
    ],
  },
  {
    category: 'Verlauf',
    shortcuts: [
      { description: 'Rückgängig', keys: [ctrl, 'Z'] },
      { description: 'Wiederholen', keys: [ctrl, 'Y', '/', ctrl, 'Shift', 'Z'] },
    ],
  },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground ring-1 ring-border">
      {children}
    </kbd>
  )
}

function ShortcutKeys({ keys }: { keys: string[] }) {
  // Keys that contain special UI text (not keyboard keys) render as plain text
  if (keys.length === 1 && keys[0].includes(' ')) {
    return <span className="shrink-0 text-xs text-muted-foreground">{keys[0]}</span>
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((key, i) => (
        <Kbd key={i}>{key}</Kbd>
      ))}
    </span>
  )
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),72rem)] max-w-none sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="size-5" />
            Hilfe
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[34rem] pr-4">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Tore bearbeiten
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Wähle zuerst ein Tor in der Strecke aus. Danach erscheinen direkt am Tor die passenden Werkzeuge.
              </p>
              <div className="mt-4 grid gap-3">
                {helpSteps.map(({ title, description, Icon, accentClassName }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-lg border border-border bg-background/70 p-3"
                  >
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${accentClassName}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-foreground">{title}</h4>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {shortcuts.map((group) => (
                <div key={group.category} className="rounded-xl border border-border bg-background/70 p-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {group.category}
                  </h3>
                  <div className="mt-2 flex flex-col">
                    {group.shortcuts.map((shortcut, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                      >
                        <span className="min-w-0 text-sm text-muted-foreground">
                          {shortcut.description}
                        </span>
                        <ShortcutKeys keys={shortcut.keys} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
