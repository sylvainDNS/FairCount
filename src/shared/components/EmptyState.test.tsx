import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, EmptyStateIcons } from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Aucun résultat" />);
    expect(screen.getByRole('heading', { name: 'Aucun résultat' })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Aucun résultat" description="Essayez une autre recherche" />);
    expect(screen.getByText('Essayez une autre recherche')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Aucun résultat" icon={<EmptyStateIcons.Search />} />);
    // Icon is wrapped in a div with aria-hidden
    const iconContainer = document.querySelector('[aria-hidden="true"]');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders action button with onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <EmptyState
        title="Aucun groupe"
        action={{ label: 'Créer un groupe', onClick: handleClick }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Créer un groupe' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders action link with to', () => {
    render(
      <MemoryRouter>
        <EmptyState title="Aucun groupe" action={{ label: 'Créer un groupe', to: '/groups/new' }} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Créer un groupe' });
    expect(link).toHaveAttribute('href', '/groups/new');
  });

  it('does not render action when not provided', () => {
    render(<EmptyState title="Aucun résultat" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('EmptyStateIcons', () => {
  it.each([
    ['Users', EmptyStateIcons.Users],
    ['Receipt', EmptyStateIcons.Receipt],
    ['Scale', EmptyStateIcons.Scale],
    ['Search', EmptyStateIcons.Search],
    ['ArrowsExchange', EmptyStateIcons.ArrowsExchange],
  ])('renders %s icon', (_name, Icon) => {
    const { container } = render(<Icon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
