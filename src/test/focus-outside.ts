import { act } from '@testing-library/react';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const flushFrames = async (count: number) => {
  for (let i = 0; i < count; i++) {
    await act(nextFrame);
  }
};

/**
 * Moves focus outside an open Ark UI dialog, the way a dialog being replaced restores focus to
 * its trigger on unmount, then lets Zag's deferred (raf) dismissable handlers run.
 */
export const focusOutside = async (element: HTMLElement) => {
  // Let the dialog set up its focus trap and dismissable listeners first
  await flushFrames(1);
  act(() => element.focus());
  await flushFrames(2);
};
