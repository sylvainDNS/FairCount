import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { Button } from './Button';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string | undefined;
  readonly cancelLabel?: string | undefined;
  readonly loadingText?: string | undefined;
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
  loadingText = 'Chargement...',
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
              <Dialog.CloseTrigger asChild>
                <Button type="button" variant="outline" disabled={isLoading} className="flex-1">
                  {cancelLabel}
                </Button>
              </Dialog.CloseTrigger>
              <Button
                type="button"
                variant="danger"
                onClick={onConfirm}
                loading={isLoading}
                loadingText={loadingText}
                className="flex-1"
              >
                {confirmLabel}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
