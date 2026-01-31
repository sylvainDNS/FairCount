import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

// Mock useAuth hook
vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/features/auth';

const mockedUseAuth = vi.mocked(useAuth);

const mockAuthValue = () => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
});

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test',
  image: null,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const renderWithRouter = (initialEntries: string[] = ['/protected']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while checking authentication', () => {
    mockedUseAuth.mockReturnValue({
      ...mockAuthValue(),
      isLoading: true,
    });

    const { container } = renderWithRouter();

    expect(container.querySelector('output')).toBeInTheDocument();
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    mockedUseAuth.mockReturnValue(mockAuthValue());

    renderWithRouter();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when authenticated', () => {
    mockedUseAuth.mockReturnValue({
      ...mockAuthValue(),
      isAuthenticated: true,
      user: mockUser,
    });

    renderWithRouter();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
