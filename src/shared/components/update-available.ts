import { useSyncExternalStore } from 'react';

// Shares the service-worker "update pending" state published by UpdatePrompt,
// without registering the service worker a second time
let updateAvailable = false;
const listeners = new Set<() => void>();

export const getUpdateAvailable = (): boolean => updateAvailable;

export const setUpdateAvailable = (value: boolean) => {
  if (value === updateAvailable) return;
  updateAvailable = value;
  for (const listener of listeners) listener();
};

export const subscribeUpdateAvailable = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useUpdateAvailable = (): boolean =>
  useSyncExternalStore(subscribeUpdateAvailable, getUpdateAvailable, getUpdateAvailable);

export const resetUpdateAvailableForTests = () => {
  updateAvailable = false;
  listeners.clear();
};
