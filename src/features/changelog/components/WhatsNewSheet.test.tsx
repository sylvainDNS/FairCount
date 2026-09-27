import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CHANGELOG_ROUTE } from '../constants';
import type { ChangelogDigest } from '../types';
import { WhatsNewSheet } from './WhatsNewSheet';

const singleDigest: ChangelogDigest = {
  fromVersion: '0.2.0',
  toVersion: '0.2.0',
  date: '2026-09-30',
  features: ["Désignez un compte commun comme payeur d'une dépense"],
  improvements: [],
  fixCount: 0,
};

const rangeDigest: ChangelogDigest = {
  fromVersion: '0.2.0',
  toVersion: '0.4.0',
  date: '2026-11-01',
  features: ['Nouveauté C'],
  improvements: ['Amélioration C'],
  fixCount: 3,
};

const renderSheet = (digest: ChangelogDigest, onClose = vi.fn()) => {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<WhatsNewSheet digest={digest} open onClose={onClose} />} />
        <Route path={CHANGELOG_ROUTE} element={<p>Page historique</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return onClose;
};

describe('WhatsNewSheet', () => {
  it('renders a dialog named « Quoi de neuf »', async () => {
    renderSheet(singleDigest);
    expect(await screen.findByRole('dialog', { name: 'Quoi de neuf' })).toBeInTheDocument();
  });

  it('shows a single version line', async () => {
    renderSheet(singleDigest);
    expect(await screen.findByText('Version 0.2.0 · 30 sept. 2026')).toBeInTheDocument();
  });

  it('shows a version range line', async () => {
    renderSheet(rangeDigest);
    expect(await screen.findByText('Versions 0.2.0 à 0.4.0 · 1 nov. 2026')).toBeInTheDocument();
  });

  it('shows Nouveautés then Améliorations, and the fix count', async () => {
    renderSheet(rangeDigest);
    const headings = await screen.findAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Nouveautés', 'Améliorations']);
    expect(screen.getByText('Nouveauté C')).toBeInTheDocument();
    expect(screen.getByText('Amélioration C')).toBeInTheDocument();
    expect(screen.getByText('Plus 3 corrections.')).toBeInTheDocument();
  });

  it('omits empty sections and the fix line when there is no fix', async () => {
    renderSheet(singleDigest);
    await screen.findByRole('dialog');
    expect(screen.queryByRole('heading', { name: 'Améliorations' })).not.toBeInTheDocument();
    expect(screen.queryByText(/correction/)).not.toBeInTheDocument();
  });

  it('closes once with « C’est noté »', async () => {
    const onClose = renderSheet(singleDigest);
    await userEvent.click(await screen.findByRole('button', { name: "C'est noté" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes once with Escape', async () => {
    const onClose = renderSheet(singleDigest);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes and navigates to the history with « Tout l’historique »', async () => {
    const onClose = renderSheet(singleDigest);
    await userEvent.click(await screen.findByRole('button', { name: "Tout l'historique" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Page historique')).toBeInTheDocument();
  });

  it('moves focus inside on open and restores it on close', async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Ouvrir
          </button>
          <WhatsNewSheet digest={singleDigest} open={open} onClose={() => setOpen(false)} />
        </>
      );
    };
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: 'Ouvrir' });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    await userEvent.click(screen.getByRole('button', { name: "C'est noté" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('renders identical texts from different releases without key collisions', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSheet({ ...rangeDigest, improvements: ['Même texte', 'Même texte'] });

    expect(await screen.findAllByText('Même texte')).toHaveLength(2);
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes('same key'))).toBe(false);
    errorSpy.mockRestore();
  });
});
