import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { CHANGELOG_ROUTE, LAST_CONSULTED_KEY, LAST_SEEN_KEY } from '../constants';
import { APP_VERSION } from '../lib/app-version';
import { resetForTests } from '../store/changelog-storage';
import { ChangelogEntryRow } from './ChangelogEntryRow';

const seed = (lastConsulted: string) => {
  localStorage.clear();
  localStorage.setItem(LAST_SEEN_KEY, APP_VERSION);
  localStorage.setItem(LAST_CONSULTED_KEY, lastConsulted);
  resetForTests();
};

const renderRow = () =>
  render(
    <MemoryRouter>
      <ChangelogEntryRow />
    </MemoryRouter>,
  );

describe('ChangelogEntryRow', () => {
  beforeEach(() => seed(APP_VERSION));

  it('links to the history with the current version', () => {
    renderRow();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', CHANGELOG_ROUTE);
    expect(links[0]).toHaveTextContent('Nouveautés');
    expect(links[0]).toHaveTextContent(`Version ${APP_VERSION}`);
  });
});

describe('ChangelogEntryRow unread state', () => {
  it('shows a dot and announces unread entries', () => {
    seed('0.1.0');
    renderRow();
    const link = screen.getByRole('link', { name: /nouveautés non lues/ });
    expect(link.querySelector('[data-unread-dot]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows no dot once consulted', () => {
    seed(APP_VERSION);
    renderRow();
    const link = screen.getByRole('link');
    expect(link).not.toHaveAccessibleName(/non lues/);
    expect(link.querySelector('[data-unread-dot]')).toBeNull();
  });
});
