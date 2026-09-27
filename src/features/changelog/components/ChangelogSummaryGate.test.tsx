import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetUpdateAvailableForTests,
  setUpdateAvailable,
} from '@/shared/components/update-available';
import { LAST_CONSULTED_KEY, LAST_SEEN_KEY } from '../constants';
import { APP_VERSION } from '../lib/app-version';
import { resetForTests } from '../store/changelog-storage';
import { ChangelogSummaryGate } from './ChangelogSummaryGate';

const renderGate = () =>
  render(
    <MemoryRouter>
      <ChangelogSummaryGate />
    </MemoryRouter>,
  );

const seed = (values: Record<string, string>) => {
  localStorage.clear();
  for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  resetForTests();
};

describe('ChangelogSummaryGate', () => {
  beforeEach(() => {
    seed({});
    resetUpdateAvailableForTests();
  });

  it('shows the summary after an update and marks it seen on close', async () => {
    seed({ [LAST_SEEN_KEY]: '0.1.0', [LAST_CONSULTED_KEY]: '0.1.0' });
    const { unmount } = renderGate();

    await userEvent.click(await screen.findByRole('button', { name: "C'est noté" }));

    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe(APP_VERSION);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    unmount();
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing on first open and initialises both versions', async () => {
    renderGate();

    await waitFor(() => expect(localStorage.getItem(LAST_SEEN_KEY)).toBe(APP_VERSION));
    expect(localStorage.getItem(LAST_CONSULTED_KEY)).toBe(APP_VERSION);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing on rollback and leaves storage untouched', async () => {
    seed({ [LAST_SEEN_KEY]: '9.9.9', [LAST_CONSULTED_KEY]: '9.9.9' });
    renderGate();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe('9.9.9');
  });

  it('steps aside without marking it seen when a new update becomes pending', async () => {
    seed({ [LAST_SEEN_KEY]: '0.1.0', [LAST_CONSULTED_KEY]: '0.1.0' });
    renderGate();
    await screen.findByRole('dialog', { name: 'Quoi de neuf' });

    act(() => setUpdateAvailable(true));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Not seen: after the refresh, the next summary still covers this version
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe('0.1.0');
  });
});
