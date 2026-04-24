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
    title: 'Gate verschieben',
    description: 'Gate einmal anklicken, dann das Verschieben-Symbol gedrückt halten und das Gate an die gewünschte Position ziehen.',
    Icon: Move,
    accentClassName: 'text-primary border-primary/40 bg-primary/10',
  },
  {
    title: 'Gate drehen',
    description: 'Gate einmal anklicken, dann das Dreh-Symbol gedrückt halten und seitlich ziehen, bis die Ausrichtung passt.',
    Icon: RotateCw,
    accentClassName: 'text-secondary border-secondary/40 bg-secondary/10',
  },
  {
    title: 'Gate hinzufügen',
    description: 'Gate anklicken, bei dem davor oder danach ein neues Gate eingefügt werden soll. Dann auf das Plus-Icon klicken und den Gate-Typ auswählen.',
    Icon: Plus,
    accentClassName: 'text-primary border-primary/40 bg-primary/10',
  },
]

const shortcuts: ShortcutGroup[] = [
  {
    category: 'Track',
    shortcuts: [
      { description: 'Shuffle Track', keys: ['R'] },
      { description: 'Save Track', keys: [ctrl, 'S'] },
      { description: 'New Track', keys: [ctrl, 'N'] },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { description: 'Open Gallery', keys: ['G'] },
      { description: 'Deselect Gate / Close Dialogs', keys: ['Escape'] },
    ],
  },
  {
    category: 'Gate Editing',
    shortcuts: [
      { description: 'Delete selected gate', keys: ['Backspace'] },
      { description: 'Confirm delete', keys: ['Enter'] },
      { description: 'Drag / Rotate Gate', keys: ['In-canvas handles'] },
    ],
  },
  {
    category: 'History',
    shortcuts: [
      { description: 'Undo', keys: [ctrl, 'Z'] },
      { description: 'Redo', keys: [ctrl, 'Y', '/', ctrl, 'Shift', 'Z'] },
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
    return <span className="text-xs text-muted-foreground">{keys[0]}</span>
  }

  return (
    <span className="flex items-center gap-1">
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="size-5" />
            Hilfe
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[32rem] pr-4">
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Gates bearbeiten
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Wähle zuerst ein Gate im Track aus. Danach erscheinen direkt am Gate die passenden Werkzeuge.
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

            {shortcuts.map((group) => (
              <div key={group.category} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {group.category}
                </h3>
                <div className="flex flex-col">
                  {group.shortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-border py-2 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <ShortcutKeys keys={shortcut.keys} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
