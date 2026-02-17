import { createToaster } from '@ark-ui/react/toast';

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 8000;

const baseToaster = createToaster({
  placement: 'bottom',
  overlap: true,
  gap: 16,
  max: 5,
  duration: DEFAULT_DURATION,
  offsets: { bottom: '5rem', top: '1rem', left: '1rem', right: '1rem' },
});

export const toaster = {
  ...baseToaster,
  error: (options: Parameters<typeof baseToaster.error>[0]) =>
    baseToaster.error({ duration: ERROR_DURATION, ...options }),
};
