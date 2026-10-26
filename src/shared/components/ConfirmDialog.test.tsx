import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { focusOutside } from '@/test/focus-outside';
import { ConfirmDialog } from './ConfirmDialog';

const renderDialog = (props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <>
      <button type="button">Dehors</button>
      <ConfirmDialog
        open
        title="Supprimer la dépense"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    </>,
  );
  return { onConfirm, onCancel };
};

describe('ConfirmDialog', () => {
  it('stays open when focus moves outside programmatically', async () => {
    const { onCancel } = renderDialog();
    await screen.findByRole('dialog', { name: 'Supprimer la dépense' });

    await focusOutside(screen.getByRole('button', { name: 'Dehors', hidden: true }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Supprimer la dépense' })).toBeInTheDocument();
  });

  it('cancels from the cancel button', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Annuler' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels on Escape', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();
    await screen.findByRole('dialog', { name: 'Supprimer la dépense' });

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirms from the confirm button', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Supprimer' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows the loading text while confirming', async () => {
    renderDialog({ isLoading: true, loadingText: 'Suppression...' });

    expect(await screen.findByText('Suppression...')).toBeInTheDocument();
  });
});
