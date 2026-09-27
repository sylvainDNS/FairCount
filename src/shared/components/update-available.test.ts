import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getUpdateAvailable,
  resetUpdateAvailableForTests,
  setUpdateAvailable,
  subscribeUpdateAvailable,
} from './update-available';

describe('update-available store', () => {
  beforeEach(() => resetUpdateAvailableForTests());

  it('starts with no pending update', () => {
    expect(getUpdateAvailable()).toBe(false);
  });

  it('notifies subscribers only when the value changes', () => {
    const listener = vi.fn();
    subscribeUpdateAvailable(listener);

    setUpdateAvailable(true);
    setUpdateAvailable(true);

    expect(getUpdateAvailable()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
