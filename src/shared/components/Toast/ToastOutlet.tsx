import { Portal } from '@ark-ui/react/portal';
import { Toast, Toaster } from '@ark-ui/react/toast';
import { ToastItem } from './ToastItem';
import { toastRootStyle } from './toast-root.styles';
import { toaster } from './toaster';

export const ToastOutlet = () => (
  <Portal>
    <Toaster toaster={toaster}>
      {(toast) => (
        <Toast.Root key={toast.id} style={toastRootStyle} className="z-70">
          <ToastItem toast={toast} />
        </Toast.Root>
      )}
    </Toaster>
  </Portal>
);
