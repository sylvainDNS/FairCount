import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExpenseFilters } from './ExpenseFilters';

const members = vi.hoisted(() => ({ list: [] as unknown[] }));

vi.mock('@/features/members/hooks/useMembers', () => ({
  useMembers: () => ({ members: members.list }),
}));

describe('ExpenseFilters — recurring filter', () => {
  it('filters recurring expenses and back', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    const { rerender } = render(
      <ExpenseFilters groupId="g1" filters={{}} onFiltersChange={onFiltersChange} />,
    );

    await user.click(screen.getByText('Filtres'));
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Type' })).getByText('Récurrentes'),
    );
    expect(onFiltersChange).toHaveBeenLastCalledWith({ recurring: true });

    rerender(
      <ExpenseFilters
        groupId="g1"
        filters={{ recurring: true }}
        onFiltersChange={onFiltersChange}
      />,
    );
    await user.click(within(screen.getByRole('radiogroup', { name: 'Type' })).getByText('Toutes'));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ recurring: undefined });
  });

  it('counts the recurring filter as active and clears it', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <ExpenseFilters
        groupId="g1"
        filters={{ recurring: true }}
        onFiltersChange={onFiltersChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Effacer' }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({});
  });
});
