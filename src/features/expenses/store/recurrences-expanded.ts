import { useSyncExternalStore } from 'react';

// Device-wide state of the « Récurrences » card (collapsed by default)
const STORAGE_KEY = 'faircount:recurrences-expanded';

const listeners = new Set<() => void>();

// Session value, used when localStorage is unavailable (private mode, blocked storage)
let memory: boolean | undefined;

const readStorage = (): boolean | undefined => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? undefined : stored === 'true';
  } catch {
    return undefined;
  }
};

export const getRecurrencesExpanded = (): boolean => memory ?? readStorage() ?? false;

export const setRecurrencesExpanded = (expanded: boolean): void => {
  memory = expanded;
  try {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  } catch {
    // Storage unavailable: memory only
  }
  for (const listener of listeners) listener();
};

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useRecurrencesExpanded = (): readonly [boolean, (expanded: boolean) => void] => [
  useSyncExternalStore(subscribe, getRecurrencesExpanded, () => false),
  setRecurrencesExpanded,
];
