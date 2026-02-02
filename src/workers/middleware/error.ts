import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { API_ERROR_CODES } from '@/shared/constants/errors';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Error:', err);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  return c.json({ error: API_ERROR_CODES.INTERNAL_ERROR }, 500);
};
