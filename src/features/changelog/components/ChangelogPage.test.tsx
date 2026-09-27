import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHANGELOG_ROUTE, LAST_CONSULTED_KEY, LAST_SEEN_KEY } from '../constants';
import { APP_VERSION } from '../lib/app-version';
import { resetForTests } from '../store/changelog-storage';
import type { ChangelogRelease } from '../types';
import { ChangelogHistory, ChangelogPage } from './ChangelogPage';

const releases: readonly ChangelogRelease[] = [
  {
    version: '0.3.0',
    date: '2026-10-15',
    changes: [
      { category: 'fix', text: 'Correction B' },
      { category: 'feature', text: 'Nouveauté B' },
    ],
  },
  { version: '0.2.1', date: '2026-10-01', changes: [] },
  {
    version: '0.2.0',
    date: '2026-09-30',
    changes: [
      { category: 'improvement', text: 'Amélioration A' },
      { category: 'feature', text: 'Nouveauté A' },
      { category: 'fix', text: 'Correction A' },
    ],
  },
];

describe('ChangelogHistory', () => {
  it('lists non-empty releases newest first', () => {
    render(<ChangelogHistory releases={releases} currentVersion="0.2.0" />);
    const versions = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(versions).toEqual(['Version 0.3.0', 'Version 0.2.0']);
  });

  it('marks only the current version', () => {
    render(<ChangelogHistory releases={releases} currentVersion="0.2.0" />);
    const badges = screen.getAllByText('Version actuelle');
    expect(badges).toHaveLength(1);
    const current = screen.getByRole('article', { name: 'Version 0.2.0' });
    expect(within(current).getByText('Version actuelle')).toBeInTheDocument();
  });

  it('orders categories Nouveauté → Amélioration → Correction and omits empty ones', () => {
    render(<ChangelogHistory releases={releases} currentVersion="0.2.0" />);
    const v020 = screen.getByRole('article', { name: 'Version 0.2.0' });
    expect(
      within(v020)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Nouveautés', 'Améliorations', 'Corrections']);

    const v030 = screen.getByRole('article', { name: 'Version 0.3.0' });
    expect(
      within(v030)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Nouveautés', 'Corrections']);
  });

  it('renders identical texts within a release without key collisions', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ChangelogHistory
        releases={[
          {
            version: '0.2.0',
            date: '2026-09-30',
            changes: [
              { category: 'fix', text: 'Même texte' },
              { category: 'fix', text: 'Même texte' },
            ],
          },
        ]}
        currentVersion="0.2.0"
      />,
    );

    expect(screen.getAllByText('Même texte')).toHaveLength(2);
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes('same key'))).toBe(false);
    errorSpy.mockRestore();
  });

  it('formats release dates in fr-FR', () => {
    render(<ChangelogHistory releases={releases} currentVersion="0.2.0" />);
    expect(screen.getByText('30 sept. 2026')).toBeInTheDocument();
  });
});

describe('ChangelogPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAST_SEEN_KEY, '0.1.0');
    localStorage.setItem(LAST_CONSULTED_KEY, '0.1.0');
    resetForTests();
  });

  const renderAt = (initialEntries: string[]) =>
    render(
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
        <Routes>
          <Route path={CHANGELOG_ROUTE} element={<ChangelogPage />} />
          <Route path="/groups" element={<p>Page groupes</p>} />
          <Route path="/profile" element={<p>Page profil</p>} />
        </Routes>
      </MemoryRouter>,
    );

  it('shows the heading, the current version and the real changelog', () => {
    renderAt([CHANGELOG_ROUTE]);
    expect(screen.getByRole('heading', { level: 1, name: 'Nouveautés' })).toBeInTheDocument();
    expect(screen.getByText(`Vous utilisez la version ${APP_VERSION}`)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: `Version ${APP_VERSION}` })).toBeInTheDocument();
    expect(screen.getByText('9 févr. 2026')).toBeInTheDocument();
  });

  it('marks the history as consulted on mount', () => {
    renderAt([CHANGELOG_ROUTE]);
    expect(localStorage.getItem(LAST_CONSULTED_KEY)).toBe(APP_VERSION);
  });

  it('goes back to the previous in-app screen', async () => {
    renderAt(['/groups', CHANGELOG_ROUTE]);
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await screen.findByText('Page groupes')).toBeInTheDocument();
  });

  it('falls back to the profile when opened directly', async () => {
    renderAt([CHANGELOG_ROUTE]);
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await screen.findByText('Page profil')).toBeInTheDocument();
  });
});
