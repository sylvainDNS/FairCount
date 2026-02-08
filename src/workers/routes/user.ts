import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import * as schema from '../../db/schema';
import { authMiddleware } from '../middleware';
import type { AppEnv } from '../types';

export const userRoutes = new Hono<AppEnv>();

// Apply auth middleware on all routes
userRoutes.use('*', authMiddleware);

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

// PATCH /user/profile - Update user profile
userRoutes.patch('/profile', zValidator('json', updateProfileSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const data = c.req.valid('json');

  const trimmedName = data.name.trim();

  await db
    .update(schema.users)
    .set({ name: trimmedName, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  return c.json({ success: true, user: { id: user.id, name: trimmedName, email: user.email } });
});
