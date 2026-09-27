import { lazy } from 'react';

// The barrel is imported eagerly by Layout/BottomNav: exposing the page lazily keeps its
// code out of the main chunk (route-based code splitting)
export const LazyChangelogPage = lazy(() =>
  import('./ChangelogPage').then((m) => ({ default: m.ChangelogPage })),
);
