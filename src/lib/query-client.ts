import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic refetch on window focus (better mobile UX)
      refetchOnWindowFocus: false,
      // Retry once on error
      retry: 1,
      // Data considered fresh for 30 seconds
      staleTime: 30 * 1000,
      // Cache kept for 5 minutes
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      onError: (error) => {
        if (import.meta.env.DEV) {
          console.error('Mutation error:', error);
        }
      },
    },
  },
});
