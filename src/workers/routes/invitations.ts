import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import * as schema from '../../db/schema';
import { authMiddleware } from '../middleware';
import * as invitationService from '../services/invitations';
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

  const result = await invitationService.findValidInvitation(db, token);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status as 400 | 404);
  }

  const { invitation } = result;

  // Fetch group + inviter info for display
  const [details] = await db
    .select({
      groupName: schema.groups.name,
      inviterName: schema.users.name,
      inviterEmail: schema.users.email,
    })
    .from(schema.groupInvitations)
    .innerJoin(schema.groups, eq(schema.groupInvitations.groupId, schema.groups.id))
    .innerJoin(schema.users, eq(schema.groupInvitations.createdBy, schema.users.id))
    .where(eq(schema.groupInvitations.id, invitation.id));

  const response = {
    group: {
      id: invitation.groupId,
      name: details?.groupName ?? '',
    },
    inviterName: details?.inviterName || details?.inviterEmail || '',
    expiresAt: invitation.expiresAt,
  };

  // If the user is authenticated, include whether this invitation is for them
  const auth = c.get('auth');
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session?.user) {
    return c.json({
      ...response,
      isForCurrentUser: invitation.email.toLowerCase() === session.user.email.toLowerCase(),
    });
  }

  return c.json(response);
});

// POST /api/invitations/:token/accept - Accept invitation (auth required)
invitationsRoutes.post('/:token/accept', authMiddleware, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const token = c.req.param('token');

  const validationResult = await invitationService.findValidInvitation(db, token);

  if ('error' in validationResult) {
    return c.json({ error: validationResult.error }, validationResult.status as 400 | 404);
  }

  const result = await invitationService.acceptInvitation(db, validationResult.invitation, user);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status as 400 | 403 | 404 | 500);
  }

  return c.json({ groupId: result.groupId });
});

// POST /api/invitations/:token/decline - Decline invitation (auth required)
invitationsRoutes.post('/:token/decline', authMiddleware, async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const token = c.req.param('token');

  const validationResult = await invitationService.findValidInvitation(db, token);

  if ('error' in validationResult) {
    return c.json({ error: validationResult.error }, validationResult.status as 400 | 404);
  }

  const result = await invitationService.declineInvitation(db, validationResult.invitation, user);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status as 403);
  }

  return c.json({ success: true });
});
