import { zValidator } from '@hono/zod-validator';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import * as schema from '../../../db/schema';
import * as invitationService from '../../services/invitations';
import { sendInvitationEmail } from '../../services/shared/email';
import type { AppEnv } from '../../types';

export const invitationsRoutes = new Hono<AppEnv>();

// Validation schemas
const sendInvitationSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
});

// POST /api/groups/:id/invitations/invite - Send invitation
invitationsRoutes.post('/invite', zValidator('json', sendInvitationSchema), async (c) => {
  const db = c.get('db');
  const env = c.env;
  const user = c.get('user');
  const groupId = c.req.param('id')!;
  const data = c.req.valid('json');

  const email = data.email.trim().toLowerCase();

  // Check for conflicts (already member or already invited)
  const conflict = await invitationService.checkMembershipConflicts(db, groupId, email);

  if (conflict) {
    return c.json({ error: API_ERROR_CODES[conflict.type] }, 400);
  }

  // Get group name for email
  const [group] = await db
    .select({ name: schema.groups.name })
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId));

  if (!group) {
    return c.json({ error: API_ERROR_CODES.GROUP_NOT_FOUND }, 404);
  }

  // Create invitation and pending member
  const { invitationId, memberId, token } = await invitationService.createInvitation({
    db,
    groupId,
    email,
    inviterId: user.id,
    memberName: data.name,
  });

  // Send invitation email - rollback DB on failure
  try {
    await sendInvitationEmail(env, {
      to: email,
      groupName: group.name,
      inviterName: user.name ?? user.email,
      inviteUrl: `${env.FRONTEND_URL}/invite/${token}`,
    });
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    await invitationService.rollbackInvitation(db, groupId, invitationId, memberId);
    return c.json({ error: API_ERROR_CODES.EMAIL_SEND_FAILED }, 500);
  }

  return c.json({ id: invitationId, memberId }, 201);
});

// GET /api/groups/:id/invitations - List pending invitations
invitationsRoutes.get('/', async (c) => {
  const db = c.get('db');
  const groupId = c.req.param('id')!;

  const invitations = await db
    .select({
      id: schema.groupInvitations.id,
      email: schema.groupInvitations.email,
      createdAt: schema.groupInvitations.createdAt,
      expiresAt: schema.groupInvitations.expiresAt,
      createdByName: schema.users.name,
    })
    .from(schema.groupInvitations)
    .innerJoin(schema.users, eq(schema.groupInvitations.createdBy, schema.users.id))
    .where(
      and(
        eq(schema.groupInvitations.groupId, groupId),
        isNull(schema.groupInvitations.acceptedAt),
        isNull(schema.groupInvitations.declinedAt),
        gt(schema.groupInvitations.expiresAt, new Date()),
      ),
    );

  return c.json(
    invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      createdByName: inv.createdByName || null,
    })),
  );
});

// DELETE /api/groups/:id/invitations/:invitationId - Cancel invitation
invitationsRoutes.delete('/:invitationId', async (c) => {
  const db = c.get('db');
  const groupId = c.req.param('id')!;
  const invitationId = c.req.param('invitationId');

  if (!invitationId) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  const result = await invitationService.cancelInvitation(db, groupId, invitationId);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status as 404);
  }

  return c.json({ success: true });
});

// POST /api/groups/:id/invitations/:invitationId/resend - Resend invitation
invitationsRoutes.post('/:invitationId/resend', async (c) => {
  const db = c.get('db');
  const env = c.env;
  const user = c.get('user');
  const groupId = c.req.param('id')!;
  const invitationId = c.req.param('invitationId');

  if (!invitationId) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  const refreshResult = await invitationService.refreshInvitationToken(db, groupId, invitationId);

  if ('error' in refreshResult) {
    return c.json({ error: refreshResult.error }, refreshResult.status as 404);
  }

  // Get group name for email
  const [group] = await db
    .select({ name: schema.groups.name })
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId));

  if (!group) {
    return c.json({ error: API_ERROR_CODES.GROUP_NOT_FOUND }, 404);
  }

  try {
    await sendInvitationEmail(env, {
      to: refreshResult.email,
      groupName: group.name,
      inviterName: user.name ?? user.email,
      inviteUrl: `${env.FRONTEND_URL}/invite/${refreshResult.token}`,
    });
  } catch (error) {
    console.error('Failed to resend invitation email:', error);
    return c.json({ error: API_ERROR_CODES.EMAIL_SEND_FAILED }, 500);
  }

  return c.json({ success: true });
});
