import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetForTests } from '@/features/changelog/store/changelog-storage';
import { Layout } from './Layout';

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const seed = (lastSeen: string, lastConsulted: string) => {
  localStorage.clear();
  localStorage.setItem('faircount.changelog.lastSeen', lastSeen);
  localStorage.setItem('faircount.changelog.lastConsulted', lastConsulted);
  resetForTests();
};

const renderLayout = () =>
  render(
    <MemoryRouter>
      <Layout>
        <p>Contenu</p>
      </Layout>
    </MemoryRouter>,
  );

describe('Layout', () => {
  beforeEach(() => seed('0.2.0', '0.2.0'));

  describe('changelog summary', () => {
    it('shows the summary after an update', async () => {
      seed('0.1.0', '0.1.0');
      renderLayout();
      expect(await screen.findByRole('dialog', { name: 'Quoi de neuf' })).toBeInTheDocument();
    });

    it('shows no summary when the version was already seen', () => {
      renderLayout();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('sidebar unread dot', () => {
    it('flags unread changelog entries on the Profil link', () => {
      seed('0.2.0', '0.1.0');
      renderLayout();
      const sidebar = screen.getByRole('complementary');
      const link = within(sidebar).getByRole('link', { name: 'Profil, nouveautés non lues' });
      expect(link.querySelector('[data-unread-dot]')).toHaveAttribute('aria-hidden', 'true');
    });

    it('shows a plain Profil link once consulted', () => {
      renderLayout();
      const sidebar = screen.getByRole('complementary');
      const link = within(sidebar).getByRole('link', { name: 'Profil' });
      expect(link.querySelector('[data-unread-dot]')).toBeNull();
    });
  });
});
