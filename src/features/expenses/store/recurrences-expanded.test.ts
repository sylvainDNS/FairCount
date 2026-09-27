import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'faircount:recurrences-expanded';

const load = async () => {
  vi.resetModules();
  return import('./recurrences-expanded');
};

describe('recurrences-expanded store', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('is collapsed by default', async () => {
    const { getRecurrencesExpanded } = await load();
    expect(getRecurrencesExpanded()).toBe(false);
  });

  it('persists the expanded state on the device', async () => {
    const first = await load();
    first.setRecurrencesExpanded(true);
    expect(localStorage.getItem(KEY)).toBe('true');

    const reloaded = await load();
    expect(reloaded.getRecurrencesExpanded()).toBe(true);
  });

  it('notifies subscribers', async () => {
    const { setRecurrencesExpanded, subscribe } = await load();
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setRecurrencesExpanded(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('falls back to memory when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { getRecurrencesExpanded, setRecurrencesExpanded } = await load();
    expect(getRecurrencesExpanded()).toBe(false);
    setRecurrencesExpanded(true);
    expect(getRecurrencesExpanded()).toBe(true);
  });
});
