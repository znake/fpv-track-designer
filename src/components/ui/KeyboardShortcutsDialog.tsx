import type { LucideIcon } from 'lucide-react'
import { ArrowRightLeft, CircleHelp, Move, Plus, RotateCw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  Icon?: LucideIcon
  marker?: string
}

const helpIconAccentClassName = 'text-primary border-primary/40 bg-primary/10'

const helpSteps: HelpStep[] = [
  {
    title: 'Gate verschieben',
    description: 'Gate einmal anklicken, dann das Verschieben-Symbol gedrückt halten und das Gate an die gewünschte Position ziehen.',
    Icon: Move,
  },
  {
    title: 'Gate drehen',
    description: 'Gate einmal anklicken, dann das Dreh-Symbol gedrückt halten und seitlich ziehen, bis die Ausrichtung passt.',
    Icon: RotateCw,
  },
  {
    title: 'Einflugseite wechseln',
    description:
      'Beim ausgewählten Gate die jeweilige Öffnung anklicken (grün/rot) und die Richtung per Klick umdrehen. Die grüne Seite zeigt dann die neue Einflugseite.',
    Icon: ArrowRightLeft,
  },
  {
    title: 'Durchflugreihenfolge anpassen',
    description:
      'Die Durchflugnummer einer Öffnung anklicken, dann im kleinen Feld eine neue Position zwischen 1 und der Gesamtzahl der Durchflüge eintragen.',
    marker: '#',
  },
  {
    title: 'Gate hinzufügen',
    description: 'Gate anklicken, bei dem davor oder danach ein neues Gate eingefügt werden soll. Dann auf das Plus-Symbol klicken und den Gate-Typ auswählen.',
    Icon: Plus,
  },
]

const shortcuts: ShortcutGroup[] = [
  {
    category: 'Strecke',
    shortcuts: [
      { description: 'Strecke shuffeln', keys: ['S'] },
      { description: 'Strecke speichern', keys: [ctrl, 'S'] },
    ],
  },
  {
    category: 'Steuerung',
    shortcuts: [
      { description: 'Galerie öffnen', keys: ['G'] },
      { description: 'Ansicht drehen', keys: ['Linke Maustaste ziehen'] },
      { description: 'Über die Strecke bewegen', keys: ['Rechte Maustaste ziehen'] },
      { description: 'Ansicht verschieben', keys: ['Space + linke Maustaste ziehen'] },
      { description: 'Zoomen', keys: ['Mausrad scrollen'] },
      { description: 'Schnell zoomen', keys: ['Mausrad/mittlere Maustaste ziehen'] },
      { description: 'Mobile Ansicht verschieben', keys: ['Zwei Finger ziehen'] },
      { description: 'Mobile Ansicht zoomen', keys: ['Zwei Finger auf-/zuziehen'] },
      { description: 'Kamerahöhe ändern', keys: ['Shift + linke Maustaste ziehen'] },
      { description: 'Gate abwählen / Dialoge schließen', keys: ['Escape'] },
    ],
  },
  {
    category: 'Gate-Bearbeitung',
    shortcuts: [
      { description: 'Ausgewähltes Gate löschen', keys: ['Backspace'] },
      { description: 'Löschen bestätigen', keys: ['Enter'] },
      { description: 'Gate ziehen / drehen', keys: ['Werkzeuge im 3D-Feld'] },
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
    <kbd className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs whitespace-nowrap text-muted-foreground ring-1 ring-border">
      {children}
    </kbd>
  )
}

function ShortcutKeys({ keys }: { keys: string[] }) {
  // Keys that contain special UI text (not keyboard keys) render as plain text
  if (keys.length === 1 && keys[0].includes(' ')) {
    return <span className="max-w-full text-right text-xs text-muted-foreground sm:max-w-48">{keys[0]}</span>
  }

  return (
    <span className="flex min-w-0 flex-wrap items-center justify-end gap-1">
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100dvw-2rem)] max-w-4xl overflow-hidden p-4 sm:w-[calc(100dvw-2rem)] sm:p-5">
        <DialogHeader className="pr-10">
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="size-5" />
            Hilfe
          </DialogTitle>
          <DialogDescription>
            Kurzübersicht für Track-Bearbeitung, Gate-Werkzeuge und Tastaturbefehle.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(100dvh-10rem)] overflow-x-hidden pr-3 sm:pr-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Gates bearbeiten
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Wähle zuerst ein Gate in der Strecke aus. Danach erscheinen direkt am Gate die passenden Werkzeuge.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Einstellungen wie Feldgröße, Anzahl/Größe der Gates und Anzeigeoptionen findest du über das Zahnrad in der Werkzeugleiste.
              </p>
              <div className="mt-4 grid gap-3">
                {helpSteps.map(({ title, description, Icon, marker }) => (
                  <div
                    key={title}
                    className="flex min-w-0 gap-3 rounded-lg border border-border bg-background/70 p-3"
                  >
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${helpIconAccentClassName}`}>
                      {Icon ? <Icon className="size-5" /> : <span className="text-lg font-semibold leading-none">{marker}</span>}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h4 className="text-sm font-medium text-foreground">{title}</h4>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid min-w-0 gap-4">
              {shortcuts.map((group) => (
                <div key={group.category} className="rounded-xl border border-border bg-background/70 p-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {group.category}
                  </h3>
                  <div className="mt-2 flex flex-col">
                    {group.shortcuts.map((shortcut, i) => (
                      <div
                        key={i}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0 sm:flex-nowrap sm:gap-3"
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
