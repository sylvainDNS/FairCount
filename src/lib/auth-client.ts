import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;
