import { zValidator } from '@hono/zod-validator';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import * as schema from '../../../db/schema';
import { isValidUUID } from '../../../lib/validation';
import * as memberHandlers from '../../services/members';
import { sendInvitationEmail } from '../../services/shared/email';
import { resolveInitialMemberName } from '../../services/shared/sql-helpers';
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

  // Check if already a member (by email in groupMembers or via linked user)
  const existingMemberByEmail = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.email, email),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (existingMemberByEmail.length > 0) {
    return c.json({ error: API_ERROR_CODES.ALREADY_MEMBER }, 400);
  }

  // Also check if already a member via linked user account
  const existingMemberByUser = await db
    .select()
    .from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.users.email, email),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (existingMemberByUser.length > 0) {
    return c.json({ error: API_ERROR_CODES.ALREADY_MEMBER }, 400);
  }

  // Check if already invited (pending)
  const existingInvitation = await db
    .select()
    .from(schema.groupInvitations)
    .where(
      and(
        eq(schema.groupInvitations.groupId, groupId),
        eq(schema.groupInvitations.email, email),
        isNull(schema.groupInvitations.acceptedAt),
        gt(schema.groupInvitations.expiresAt, new Date()),
      ),
    );

  if (existingInvitation.length > 0) {
    return c.json({ error: API_ERROR_CODES.ALREADY_INVITED }, 400);
  }

  // Get group name for email
  const [group] = await db
    .select({ name: schema.groups.name })
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId));

  if (!group) {
    return c.json({ error: API_ERROR_CODES.GROUP_NOT_FOUND }, 404);
  }

  // Create invitation AND member in batch
  const invitationId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Use name from data or derive from email
  const memberName = resolveInitialMemberName(data.name, email);

  await db.batch([
    db.insert(schema.groupInvitations).values({
      id: invitationId,
      groupId,
      email,
      token,
      createdBy: user.id,
      expiresAt,
      createdAt: now,
    }),
    db.insert(schema.groupMembers).values({
      id: memberId,
      groupId,
      userId: null, // Not linked yet - will be linked when invitation is accepted
      name: memberName,
      email,
      income: 0,
      coefficient: 0,
      joinedAt: now,
    }),
  ]);

  // Recalculate coefficients for the group
  await memberHandlers.recalculateCoefficients(db, groupId);

  // Send invitation email
  await sendInvitationEmail(env, {
    to: email,
    groupName: group.name,
    inviterName: user.name ?? user.email,
    inviteUrl: `${env.FRONTEND_URL}/invite/${token}`,
  });

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
      and(eq(schema.groupInvitations.groupId, groupId), isNull(schema.groupInvitations.acceptedAt)),
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

  if (!invitationId || !isValidUUID(invitationId)) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  // Get invitation email before deleting
  const [invitation] = await db
    .select({ email: schema.groupInvitations.email })
    .from(schema.groupInvitations)
    .where(
      and(
        eq(schema.groupInvitations.id, invitationId),
        eq(schema.groupInvitations.groupId, groupId),
      ),
    );

  if (!invitation) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  // Delete invitation and associated pending member in batch
  await db.batch([
    db
      .delete(schema.groupInvitations)
      .where(
        and(
          eq(schema.groupInvitations.id, invitationId),
          eq(schema.groupInvitations.groupId, groupId),
        ),
      ),
    // Remove the pending member (only if not linked to a user account)
    db
      .delete(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.groupId, groupId),
          eq(schema.groupMembers.email, invitation.email),
          isNull(schema.groupMembers.userId),
        ),
      ),
  ]);

  // Recalculate coefficients
  await memberHandlers.recalculateCoefficients(db, groupId);

  return c.json({ success: true });
});

// POST /api/groups/:id/invitations/:invitationId/resend - Resend invitation
invitationsRoutes.post('/:invitationId/resend', async (c) => {
  const db = c.get('db');
  const env = c.env;
  const user = c.get('user');
  const groupId = c.req.param('id')!;
  const invitationId = c.req.param('invitationId');

  if (!invitationId || !isValidUUID(invitationId)) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  const [invitation] = await db
    .select()
    .from(schema.groupInvitations)
    .where(
      and(
        eq(schema.groupInvitations.id, invitationId),
        eq(schema.groupInvitations.groupId, groupId),
      ),
    );

  if (!invitation) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  // Get group name for email
  const [group] = await db
    .select({ name: schema.groups.name })
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId));

  if (!group) {
    return c.json({ error: API_ERROR_CODES.GROUP_NOT_FOUND }, 404);
  }

  // Update expiration and resend
  const newToken = crypto.randomUUID();
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .update(schema.groupInvitations)
    .set({ token: newToken, expiresAt: newExpiresAt })
    .where(eq(schema.groupInvitations.id, invitationId));

  await sendInvitationEmail(env, {
    to: invitation.email,
    groupName: group.name,
    inviterName: user.name ?? user.email,
    inviteUrl: `${env.FRONTEND_URL}/invite/${newToken}`,
  });

  return c.json({ success: true });
});
