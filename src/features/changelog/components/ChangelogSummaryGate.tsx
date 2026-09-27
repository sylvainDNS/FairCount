import { Component, lazy, type ReactNode, Suspense, useCallback, useEffect, useState } from 'react';
import { useUpdateAvailable } from '@/shared/components';
import { useChangelogState } from '../hooks/useChangelogState';

// Loaded only when a summary is due, so the Drawer never weighs on regular screens
const WhatsNewSheet = lazy(() =>
  import('./WhatsNewSheet').then((m) => ({ default: m.WhatsNewSheet })),
);

// The summary is optional: if its chunk fails to load (offline after a deploy), skip it
// instead of letting the error reach the app-level ErrorBoundary
class SkipOnError extends Component<{ readonly children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const ChangelogSummaryGate = () => {
  const { summary, markSeen } = useChangelogState();
  // Frozen copy: markSeen() turns the live summary to null, which must not
  // unmount the sheet before its exit animation
  const [digest] = useState(summary);
  const [open, setOpen] = useState(true);
  const updateAvailable = useUpdateAvailable();

  const handleClose = useCallback(() => {
    markSeen();
    setOpen(false);
  }, [markSeen]);

  // A newer version is waiting: the modal sheet would trap focus away from the update
  // toast, so it steps aside (spec edge case « Résumé et toast simultanés »). It is not
  // marked seen, so the next summary still covers this version after the refresh.
  useEffect(() => {
    if (updateAvailable) setOpen(false);
  }, [updateAvailable]);

  if (!digest) return null;

  return (
    <SkipOnError>
      <Suspense fallback={null}>
        <WhatsNewSheet digest={digest} open={open} onClose={handleClose} />
      </Suspense>
    </SkipOnError>
  );
};
