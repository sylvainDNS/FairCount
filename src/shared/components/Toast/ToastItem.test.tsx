import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastOutlet } from './ToastOutlet';
import { toaster } from './toaster';

// DESIGN.md « Quiet Toast Rule »: one neutral surface for every toast, only the
// icon takes a hue, actions are always Steady Blue.
const TINTS = /\b(?:dark:)?(?:bg|border)-(?:green|red|amber|positive|negative)-/;

const show = async (type: 'success' | 'info' | 'warning' | 'error', withAction = false) => {
  render(<ToastOutlet />);
  await act(async () => {
    toaster.create({
      type,
      title: `Titre ${type}`,
      description: 'Description',
      ...(withAction ? { action: { label: 'Réessayer', onClick: () => {} } } : {}),
    });
  });
  const title = await screen.findByText(`Titre ${type}`);
  const container = title.closest('[data-toast-surface]');
  if (!(container instanceof HTMLElement)) throw new Error('toast surface not found');
  return container;
};

const iconOf = (container: HTMLElement) => {
  const icon = container.querySelector('[data-toast-icon]');
  if (!(icon instanceof HTMLElement)) throw new Error('toast icon not found');
  return icon;
};

describe('ToastItem — Quiet Toast Rule', () => {
  afterEach(() => {
    act(() => toaster.remove());
  });

  it.each(['success', 'info', 'warning', 'error'] as const)(
    '%s sits on the neutral surface without any tint',
    async (type) => {
      const container = await show(type);
      expect(container.className).toMatch(/\bbg-white\b/);
      expect(container.className).toMatch(/\bborder-slate-200\b/);
      expect(container.className).not.toMatch(TINTS);
    },
  );

  it.each([
    ['success', 'text-blue-600'],
    ['info', 'text-blue-600'],
    ['warning', 'text-amber-600'],
    ['error', 'text-red-600'],
  ] as const)('%s colors only its icon (%s)', async (type, iconColor) => {
    const container = await show(type);
    expect(iconOf(container).className).toContain(iconColor);
    expect(screen.getByText(`Titre ${type}`).className).toContain('text-slate-900');
  });

  it.each(['success', 'error', 'warning'] as const)(
    '%s action button is always Steady Blue',
    async (type) => {
      await show(type, true);
      const action = screen.getByRole('button', { name: 'Réessayer' });
      expect(action.className).toContain('bg-blue-600');
      expect(action.className).not.toMatch(/bg-(?:green|red|amber)-/);
    },
  );
});
