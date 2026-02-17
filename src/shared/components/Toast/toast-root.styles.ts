import type { CSSProperties } from 'react';

export const toastRootStyle: CSSProperties = {
  translate: 'var(--x) var(--y)',
  scale: 'var(--scale)',
  zIndex: 'var(--z-index)',
  height: 'var(--height)',
  opacity: 'var(--opacity)',
  willChange: 'translate, opacity, scale',
  transition: [
    'translate 400ms cubic-bezier(0.21, 1.02, 0.73, 1)',
    'scale 400ms cubic-bezier(0.21, 1.02, 0.73, 1)',
    'opacity 400ms cubic-bezier(0.21, 1.02, 0.73, 1)',
    'height 400ms cubic-bezier(0.21, 1.02, 0.73, 1)',
  ].join(', '),
};
