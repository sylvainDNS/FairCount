import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/routes';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

const router = createBrowserRouter([...routes]);

export const App = () => {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
};
