import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string | undefined;
  readonly cancelLabel?: string | undefined;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly isLoading?: boolean | undefined;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={(details) => !details.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <Dialog.Content className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {title}
            </Dialog.Title>

            <Dialog.Description className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {description}
            </Dialog.Description>

            <div className="flex gap-3">
              <Dialog.CloseTrigger
                type="button"
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {cancelLabel}
              </Dialog.CloseTrigger>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Suppression...' : confirmLabel}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
