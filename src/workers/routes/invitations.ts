import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import * as schema from '../../db/schema';
import { isValidUUID } from '../../lib/validation';
import { authMiddleware } from '../middleware';
import * as memberHandlers from '../services/members';
import { resolveInitialMemberName } from '../services/shared/sql-helpers';
import type { AppEnv } from '../types';

export const invitationsRoutes = new Hono<AppEnv>();

// GET /api/invitations/pending - List pending invitations for the authenticated user
invitationsRoutes.get('/pending', authMiddleware, async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  const invitations = await db
    .select({
      id: schema.groupInvitations.id,
      token: schema.groupInvitations.token,
      groupId: schema.groups.id,
      groupName: schema.groups.name,
      inviterName: schema.users.name,
      inviterEmail: schema.users.email,
      createdAt: schema.groupInvitations.createdAt,
      expiresAt: schema.groupInvitations.expiresAt,
    })
    .from(schema.groupInvitations)
    .innerJoin(schema.groups, eq(schema.groupInvitations.groupId, schema.groups.id))
    .innerJoin(schema.users, eq(schema.groupInvitations.createdBy, schema.users.id))
    .where(
      and(
        eq(sql`lower(${schema.groupInvitations.email})`, user.email.toLowerCase()),
        isNull(schema.groupInvitations.acceptedAt),
        isNull(schema.groupInvitations.declinedAt),
        gt(schema.groupInvitations.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(schema.groupInvitations.createdAt));

  return c.json(
    invitations.map((inv) => ({
      id: inv.id,
      token: inv.token,
      group: {
        id: inv.groupId,
        name: inv.groupName,
      },
      inviterName: inv.inviterName || inv.inviterEmail,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    })),
  );
});

// GET /api/invitations/:token - Get invitation details (public - no auth required)
invitationsRoutes.get('/:token', async (c) => {
  const db = c.get('db');
  const token = c.req.param('token');

  if (!token || !isValidUUID(token)) {
    return c.json({ error: API_ERROR_CODES.NOT_FOUND }, 404);
  }

  const [invitation] = await db
    .select({
      id: schema.groupInvitations.id,
      groupId: schema.groupInvitations.groupId,
      email: schema.groupInvitations.email,
      expiresAt: schema.groupInvitations.expiresAt,
      acceptedAt: schema.groupInvitations.acceptedAt,
      declinedAt: schema.groupInvitations.declinedAt,
      groupName: schema.groups.name,
      inviterName: schema.users.name,
      inviterEmail: schema.users.email,
    })
    .from(schema.groupInvitations)
    .innerJoin(schema.groups, eq(schema.groupInvitations.groupId, schema.groups.id))
    .innerJoin(schema.users, eq(schema.groupInvitations.createdBy, schema.users.id))
    .where(eq(schema.groupInvitations.token, token));

  if (!invitation) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  if (invitation.acceptedAt || invitation.declinedAt) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  const expiresAt = new Date(invitation.expiresAt);
  if (expiresAt < new Date()) {
    return c.json({ error: API_ERROR_CODES.INVITATION_EXPIRED }, 400);
  }

  return c.json({
    group: {
      id: invitation.groupId,
      name: invitation.groupName,
    },
    inviterName: invitation.inviterName || invitation.inviterEmail,
    expiresAt: invitation.expiresAt,
  });
});

// POST /api/invitations/:token/accept - Accept invitation (auth required)
invitationsRoutes.post('/:token/accept', authMiddleware, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const token = c.req.param('token');

  if (!token || !isValidUUID(token)) {
    return c.json({ error: API_ERROR_CODES.NOT_FOUND }, 404);
  }

  // Find valid invitation (must not be accepted or declined)
  const [invitation] = await db
    .select()
    .from(schema.groupInvitations)
    .where(
      and(
        eq(schema.groupInvitations.token, token),
        isNull(schema.groupInvitations.acceptedAt),
        isNull(schema.groupInvitations.declinedAt),
      ),
    );

  if (!invitation) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  const expiresAt = new Date(invitation.expiresAt);
  if (expiresAt < new Date()) {
    return c.json({ error: API_ERROR_CODES.INVITATION_EXPIRED }, 400);
  }

  // Check if user is already a member (by userId)
  const [existingMemberByUser] = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, invitation.groupId),
        eq(schema.groupMembers.userId, user.id),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (existingMemberByUser) {
    return c.json({ error: API_ERROR_CODES.ALREADY_MEMBER }, 400);
  }

  const now = new Date();
  const memberName = resolveInitialMemberName(user.name, user.email);

  // Find existing member created when invitation was sent (by email)
  const [pendingMember] = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, invitation.groupId),
        eq(schema.groupMembers.email, invitation.email),
        isNull(schema.groupMembers.userId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  // Use batch for atomic operations
  if (pendingMember) {
    // Link existing member to user account and update name
    await db.batch([
      db
        .update(schema.groupInvitations)
        .set({ acceptedAt: now })
        .where(
          and(
            eq(schema.groupInvitations.id, invitation.id),
            isNull(schema.groupInvitations.acceptedAt),
          ),
        ),
      db
        .update(schema.groupMembers)
        .set({
          userId: user.id,
          name: memberName,
        })
        .where(eq(schema.groupMembers.id, pendingMember.id)),
    ]);
  } else {
    // Fallback: create new member if not found (for backward compatibility with old invitations)
    const memberId = crypto.randomUUID();
    await db.batch([
      db
        .update(schema.groupInvitations)
        .set({ acceptedAt: now })
        .where(
          and(
            eq(schema.groupInvitations.id, invitation.id),
            isNull(schema.groupInvitations.acceptedAt),
          ),
        ),
      db.insert(schema.groupMembers).values({
        id: memberId,
        groupId: invitation.groupId,
        userId: user.id,
        name: memberName,
        email: user.email,
        income: 0,
        coefficient: 0,
        joinedAt: now,
      }),
    ]);
  }

  // Verify the invitation was actually marked as accepted
  const [updatedInvitation] = await db
    .select({ acceptedAt: schema.groupInvitations.acceptedAt })
    .from(schema.groupInvitations)
    .where(eq(schema.groupInvitations.id, invitation.id));

  if (!updatedInvitation?.acceptedAt) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  // Recalculate coefficients after adding new member
  await memberHandlers.recalculateCoefficients(db, invitation.groupId);

  return c.json({ groupId: invitation.groupId });
});

// POST /api/invitations/:token/decline - Decline invitation (auth required)
invitationsRoutes.post('/:token/decline', authMiddleware, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const token = c.req.param('token');

  if (!token || !isValidUUID(token)) {
    return c.json({ error: API_ERROR_CODES.NOT_FOUND }, 404);
  }

  // Find valid invitation (must not be accepted or declined)
  const [invitation] = await db
    .select()
    .from(schema.groupInvitations)
    .where(
      and(
        eq(schema.groupInvitations.token, token),
        isNull(schema.groupInvitations.acceptedAt),
        isNull(schema.groupInvitations.declinedAt),
      ),
    );

  if (!invitation) {
    return c.json({ error: API_ERROR_CODES.INVITATION_NOT_FOUND }, 404);
  }

  const expiresAt = new Date(invitation.expiresAt);
  if (expiresAt < new Date()) {
    return c.json({ error: API_ERROR_CODES.INVITATION_EXPIRED }, 400);
  }

  // Verify the invitation belongs to the authenticated user
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return c.json({ error: API_ERROR_CODES.FORBIDDEN }, 403);
  }

  const now = new Date();

  // Mark invitation as declined and remove pending member in batch
  await db.batch([
    db
      .update(schema.groupInvitations)
      .set({ declinedAt: now })
      .where(
        and(
          eq(schema.groupInvitations.id, invitation.id),
          isNull(schema.groupInvitations.declinedAt),
        ),
      ),
    // Remove the pending member (only if not linked to a user account)
    db
      .delete(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.groupId, invitation.groupId),
          eq(schema.groupMembers.email, invitation.email),
          isNull(schema.groupMembers.userId),
        ),
      ),
  ]);

  // Recalculate coefficients after removing pending member
  await memberHandlers.recalculateCoefficients(db, invitation.groupId);

  return c.json({ success: true });
});
