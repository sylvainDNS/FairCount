import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Loading, Skeleton } from './Loading';

describe('Loading', () => {
  it('renders spinner', () => {
    const { container } = render(<Loading />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('displays message when provided', () => {
    render(<Loading message="Chargement en cours..." />);
    expect(screen.getByText('Chargement en cours...')).toBeInTheDocument();
  });

  it('has aria-live for accessibility', () => {
    const { container } = render(<Loading />);
    const output = container.querySelector('output');
    expect(output).toHaveAttribute('aria-live', 'polite');
  });

  it('renders fullPage variant with min-height', () => {
    const { container } = render(<Loading fullPage />);
    const output = container.querySelector('output');
    expect(output).toHaveClass('min-h-[50vh]');
  });

  it('applies size variant to spinner', () => {
    const { container } = render(<Loading size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('applies custom className', () => {
    const { container } = render(<Loading className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('renders with default classes', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse', 'rounded', 'bg-slate-200');
  });

  it('is hidden from screen readers', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-32" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('h-10', 'w-32');
  });
});
