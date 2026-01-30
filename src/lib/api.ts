export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const fetchApi = async (path: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

export const fetchWithAuth = async (path: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};
