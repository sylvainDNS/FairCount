import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { changelog } from '../data/changelog';
import { APP_VERSION } from '../lib/app-version';
import { resolveChangelogState } from '../lib/resolve-changelog-state';
import { getSnapshot, setLastConsulted, setLastSeen, subscribe } from '../store/changelog-storage';

export const useChangelogState = () => {
  const { lastSeen, lastConsulted } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { summary, unread, writes } = resolveChangelogState({
    currentVersion: APP_VERSION,
    lastSeen,
    lastConsulted,
    releases: changelog,
  });

  // Initialisation (first open) and auto-seen (fix-only update); writes are idempotent
  useEffect(() => {
    if (writes.lastSeen) setLastSeen(writes.lastSeen);
    if (writes.lastConsulted) setLastConsulted(writes.lastConsulted);
  }, [writes.lastSeen, writes.lastConsulted]);

  const markSeen = useCallback(() => setLastSeen(APP_VERSION), []);
  const markConsulted = useCallback(() => setLastConsulted(APP_VERSION), []);

  return { summary, unread, markSeen, markConsulted };
};
