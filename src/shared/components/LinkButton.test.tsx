import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LinkButton } from './LinkButton';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('LinkButton', () => {
  it('renders as a link with correct href', () => {
    renderWithRouter(<LinkButton to="/test">Click me</LinkButton>);
    const link = screen.getByRole('link', { name: 'Click me' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('applies primary variant by default', () => {
    renderWithRouter(<LinkButton to="/test">Primary</LinkButton>);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('bg-blue-600');
  });

  it('applies secondary variant', () => {
    renderWithRouter(
      <LinkButton to="/test" variant="secondary">
        Secondary
      </LinkButton>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveClass('bg-slate-100');
  });

  it('applies outline variant', () => {
    renderWithRouter(
      <LinkButton to="/test" variant="outline">
        Outline
      </LinkButton>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveClass('border');
  });

  it('applies size variants', () => {
    const { rerender } = renderWithRouter(
      <LinkButton to="/test" size="sm">
        Small
      </LinkButton>,
    );
    expect(screen.getByRole('link')).toHaveClass('text-sm');

    rerender(
      <BrowserRouter>
        <LinkButton to="/test" size="lg">
          Large
        </LinkButton>
      </BrowserRouter>,
    );
    expect(screen.getByRole('link')).toHaveClass('py-3');
  });

  it('applies custom className', () => {
    renderWithRouter(
      <LinkButton to="/test" className="custom-class">
        Custom
      </LinkButton>,
    );
    expect(screen.getByRole('link')).toHaveClass('custom-class');
  });

  it('renders children correctly', () => {
    renderWithRouter(
      <LinkButton to="/test">
        <span data-testid="child">Child content</span>
      </LinkButton>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
