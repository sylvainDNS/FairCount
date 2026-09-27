import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LAST_CONSULTED_KEY, LAST_SEEN_KEY } from '../constants';
import { resetForTests } from '../store/changelog-storage';
import { ChangelogSummaryGate } from './ChangelogSummaryGate';

// Simulates the lazy chunk failing to load (offline after a deploy)
vi.mock('./WhatsNewSheet', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

describe('ChangelogSummaryGate chunk failure', () => {
  it('silently skips the summary instead of crashing the app', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    localStorage.setItem(LAST_SEEN_KEY, '0.1.0');
    localStorage.setItem(LAST_CONSULTED_KEY, '0.1.0');
    resetForTests();

    render(
      <MemoryRouter>
        <p>Écran courant</p>
        <ChangelogSummaryGate />
      </MemoryRouter>,
    );

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByText('Écran courant')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Not shown, so not seen: the summary gets another chance on the next load
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe('0.1.0');
  });
});
