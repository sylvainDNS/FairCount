import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAST_CONSULTED_KEY, LAST_SEEN_KEY } from '../constants';
import {
  getSnapshot,
  resetForTests,
  setLastConsulted,
  setLastSeen,
  subscribe,
} from './changelog-storage';

describe('changelog storage', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads both versions from localStorage', () => {
    localStorage.setItem(LAST_SEEN_KEY, '0.2.0');
    localStorage.setItem(LAST_CONSULTED_KEY, '0.1.0');
    resetForTests();

    expect(getSnapshot()).toEqual({ lastSeen: '0.2.0', lastConsulted: '0.1.0' });
  });

  it('treats missing or non-semver values as absent', () => {
    localStorage.setItem(LAST_SEEN_KEY, 'garbage');
    resetForTests();

    expect(getSnapshot()).toEqual({ lastSeen: undefined, lastConsulted: undefined });
  });

  it('persists writes and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    setLastSeen('0.2.0');
    setLastConsulted('0.2.0');

    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe('0.2.0');
    expect(localStorage.getItem(LAST_CONSULTED_KEY)).toBe('0.2.0');
    expect(getSnapshot()).toEqual({ lastSeen: '0.2.0', lastConsulted: '0.2.0' });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('never lowers a stored version', () => {
    setLastSeen('0.3.0');
    const listener = vi.fn();
    subscribe(listener);

    setLastSeen('0.2.0');

    expect(getSnapshot().lastSeen).toBe('0.3.0');
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe('0.3.0');
    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores invalid versions on write', () => {
    setLastSeen('not-a-version');

    expect(getSnapshot().lastSeen).toBeUndefined();
  });

  it('falls back to memory when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    resetForTests();

    expect(getSnapshot()).toEqual({ lastSeen: undefined, lastConsulted: undefined });
    expect(() => setLastSeen('0.2.0')).not.toThrow();
    expect(getSnapshot().lastSeen).toBe('0.2.0');
  });

  it('notifies subscribers on storage events from other tabs', () => {
    const listener = vi.fn();
    subscribe(listener);

    localStorage.setItem(LAST_CONSULTED_KEY, '0.2.0');
    window.dispatchEvent(new StorageEvent('storage', { key: LAST_CONSULTED_KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSnapshot().lastConsulted).toBe('0.2.0');
  });

  it('returns a referentially stable snapshot between changes', () => {
    const first = getSnapshot();
    expect(getSnapshot()).toBe(first);

    setLastSeen('0.2.0');
    expect(getSnapshot()).not.toBe(first);
  });

  it('keeps writes in memory when only setItem throws (quota, Safari private mode)', () => {
    localStorage.setItem(LAST_SEEN_KEY, '0.1.0');
    resetForTests();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    setLastSeen('0.2.0');

    expect(getSnapshot().lastSeen).toBe('0.2.0');
  });
});
