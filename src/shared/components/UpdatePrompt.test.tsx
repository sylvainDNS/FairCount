import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdatePrompt } from './UpdatePrompt';
import { getUpdateAvailable, resetUpdateAvailableForTests } from './update-available';

const needRefresh = vi.hoisted(() => ({ value: false }));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh.value, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}));

describe('UpdatePrompt', () => {
  beforeEach(() => resetUpdateAvailableForTests());

  it('publishes a pending update to the shared store', () => {
    needRefresh.value = true;
    render(<UpdatePrompt />);
    expect(getUpdateAvailable()).toBe(true);
  });

  it('publishes nothing when no update is pending', () => {
    needRefresh.value = false;
    render(<UpdatePrompt />);
    expect(getUpdateAvailable()).toBe(false);
  });
});
