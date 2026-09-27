import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { resetForTests } from '@/features/changelog/store/changelog-storage';
import { BottomNav } from './BottomNav';

const seed = (lastConsulted: string) => {
  localStorage.clear();
  localStorage.setItem('faircount.changelog.lastSeen', '0.2.0');
  localStorage.setItem('faircount.changelog.lastConsulted', lastConsulted);
  resetForTests();
};

const renderNav = () =>
  render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>,
  );

describe('BottomNav', () => {
  it('flags unread changelog entries on the Profil tab', () => {
    seed('0.1.0');
    renderNav();
    const link = screen.getByRole('link', { name: 'Profil, nouveautés non lues' });
    expect(link.querySelector('[data-unread-dot]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a plain Profil tab once the changelog is consulted', () => {
    seed('0.2.0');
    renderNav();
    const link = screen.getByRole('link', { name: 'Profil' });
    expect(link.querySelector('[data-unread-dot]')).toBeNull();
  });
});
