import { and, eq, isNull } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import { groupMembers, users } from '../../db/schema';
import { memberDisplayName } from '../services/shared/sql-helpers';
import type { AppEnv } from '../types';

export const membershipMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id');

  if (!groupId) {
    throw new HTTPException(404, { message: API_ERROR_CODES.NOT_FOUND });
  }

  const [member] = await db
    .select({
      id: groupMembers.id,
      groupId: groupMembers.groupId,
      userId: groupMembers.userId,
      name: memberDisplayName,
      email: groupMembers.email,
      income: groupMembers.income,
      coefficient: groupMembers.coefficient,
      joinedAt: groupMembers.joinedAt,
      leftAt: groupMembers.leftAt,
    })
    .from(groupMembers)
    .leftJoin(users, eq(groupMembers.userId, users.id))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id),
        isNull(groupMembers.leftAt),
      ),
    );

  if (!member) {
    throw new HTTPException(403, { message: API_ERROR_CODES.NOT_A_MEMBER });
  }

  c.set('membership', member);

  await next();
});
