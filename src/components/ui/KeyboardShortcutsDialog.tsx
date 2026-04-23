import { CircleHelp } from 'lucide-react'
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
      { description: 'Nudge Selected Gate', keys: ['↑', '↓', '←', '→'] },
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="size-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-4">
          <div className="flex flex-col gap-6">
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
