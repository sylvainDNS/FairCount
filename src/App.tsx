import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { queryClient } from '@/lib/query-client';
import { routes } from '@/routes';
import { ErrorBoundary, ToastOutlet } from '@/shared/components';

const router = createBrowserRouter([...routes]);

export const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        <ToastOutlet />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
