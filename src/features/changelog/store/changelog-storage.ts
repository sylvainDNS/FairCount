import { LAST_CONSULTED_KEY, LAST_SEEN_KEY } from '../constants';
import { compareVersions, isValidVersion } from '../lib/version';

export interface ChangelogSnapshot {
  readonly lastSeen: string | undefined;
  readonly lastConsulted: string | undefined;
}

type Key = typeof LAST_SEEN_KEY | typeof LAST_CONSULTED_KEY;

const listeners = new Set<() => void>();

// In-memory mirror, used as fallback when localStorage is unavailable (private mode, quota)
const memory = new Map<Key, string>();

// Newest of localStorage and the in-memory mirror: when setItem fails but getItem works
// (quota, Safari private mode), the memory keeps the write for the session
const readKey = (key: Key): string | undefined => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(key);
  } catch {
    // Storage unavailable: memory only
  }
  const fromStorage = isValidVersion(stored) ? stored : undefined;
  const fromMemory = memory.get(key);
  if (fromMemory === undefined) return fromStorage;
  if (fromStorage === undefined) return fromMemory;
  return compareVersions(fromMemory, fromStorage) >= 0 ? fromMemory : fromStorage;
};

const readSnapshot = (): ChangelogSnapshot => ({
  lastSeen: readKey(LAST_SEEN_KEY),
  lastConsulted: readKey(LAST_CONSULTED_KEY),
});

let snapshot: ChangelogSnapshot = readSnapshot();

const emit = () => {
  for (const listener of listeners) listener();
};

const refresh = () => {
  const next = readSnapshot();
  if (next.lastSeen === snapshot.lastSeen && next.lastConsulted === snapshot.lastConsulted) return;
  snapshot = next;
  emit();
};

const writeKey = (key: Key, version: string) => {
  if (!isValidVersion(version)) return;
  const current = readKey(key);
  // Never lower a stored version (rollback safety)
  if (current !== undefined && compareVersions(version, current) <= 0) return;

  memory.set(key, version);
  try {
    localStorage.setItem(key, version);
  } catch {
    // Storage unavailable: the in-memory value is used for this session
  }
  refresh();
};

const onStorage = (event: StorageEvent) => {
  if (event.key === null || event.key === LAST_SEEN_KEY || event.key === LAST_CONSULTED_KEY) {
    refresh();
  }
};

export const subscribe = (listener: () => void): (() => void) => {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
};

export const getSnapshot = (): ChangelogSnapshot => snapshot;

export const setLastSeen = (version: string) => writeKey(LAST_SEEN_KEY, version);

export const setLastConsulted = (version: string) => writeKey(LAST_CONSULTED_KEY, version);

export const resetForTests = () => {
  memory.clear();
  listeners.clear();
  if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  snapshot = readSnapshot();
};
