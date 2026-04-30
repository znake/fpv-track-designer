import type { FC } from 'react'
import { useAppStore } from '@/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n'

/**
 * Globally-mounted confirmation dialog shown whenever a destructive action
 * (Shuffle, Import JSON, Gallery Load, Gallery Duplicate, Apply Config) is
 * triggered while there are unsaved changes (`isTrackModified === true`).
 *
 * Three resolution paths:
 *   - Abbrechen          → cancelDestructiveAction()         (discard staged action)
 *   - Zuerst speichern   → saveBeforeDestructiveAction()     (open SaveTrackDialog, keep staged)
 *   - Verwerfen          → confirmDestructiveAction()        (run staged action, lose changes)
 *
 * The dialog hides itself while SaveTrackDialog is open so the two dialogs
 * never overlap. Once the user saves successfully, `markTrackSaved` runs the
 * staged action automatically.
 */
export const UnsavedChangesDialog: FC = () => {
  const { t } = useTranslation()
  const pending = useAppStore((state) => state.pendingDestructiveAction)
  const isSaveDialogOpen = useAppStore((state) => state.isSaveDialogOpen)
  const cancelDestructiveAction = useAppStore((state) => state.cancelDestructiveAction)
  const confirmDestructiveAction = useAppStore((state) => state.confirmDestructiveAction)
  const saveBeforeDestructiveAction = useAppStore((state) => state.saveBeforeDestructiveAction)

  const open = pending !== null && !isSaveDialogOpen

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) cancelDestructiveAction()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pending?.title ?? t('unsavedChanges')}</DialogTitle>
          <DialogDescription>
            {pending?.description
              ?? t('unsavedChangesDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={cancelDestructiveAction}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={saveBeforeDestructiveAction}
          >
            {t('saveFirst')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            autoFocus
            onClick={confirmDestructiveAction}
          >
            {t('discard')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
