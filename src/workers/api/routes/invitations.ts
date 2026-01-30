import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../../db';
import * as schema from '../../../db/schema';
import type { Auth } from '../../../lib/auth';
import { isValidUUID } from '../../../lib/validation';
import type { Env } from '../../types';

interface RouteContext {
  readonly db: Database;
  readonly auth: Auth;
  readonly env: Env;
}

// Get invitation details by token (public - no auth required)
async function getInvitationByToken(ctx: RouteContext, token: string): Promise<Response> {
  const [invitation] = await ctx.db
    .select({
      id: schema.groupInvitations.id,
      groupId: schema.groupInvitations.groupId,
      email: schema.groupInvitations.email,
      expiresAt: schema.groupInvitations.expiresAt,
      acceptedAt: schema.groupInvitations.acceptedAt,
      groupName: schema.groups.name,
      inviterName: schema.users.name,
      inviterEmail: schema.users.email,
    })
    .from(schema.groupInvitations)
    .innerJoin(schema.groups, eq(schema.groupInvitations.groupId, schema.groups.id))
    .innerJoin(schema.users, eq(schema.groupInvitations.createdBy, schema.users.id))
    .where(eq(schema.groupInvitations.token, token));

  if (!invitation) {
    return Response.json({ error: 'INVITATION_NOT_FOUND' }, { status: 404 });
  }

  if (invitation.acceptedAt) {
    return Response.json({ error: 'INVITATION_NOT_FOUND' }, { status: 404 });
  }

  if (invitation.expiresAt < new Date()) {
    return Response.json({ error: 'INVITATION_EXPIRED' }, { status: 400 });
  }

  return Response.json({
    group: {
      id: invitation.groupId,
      name: invitation.groupName,
    },
    inviterName: invitation.inviterName || invitation.inviterEmail,
    expiresAt: invitation.expiresAt,
  });
}

// Accept invitation (auth required)
async function acceptInvitation(
  ctx: RouteContext,
  token: string,
  user: { id: string; name?: string | null; email: string },
): Promise<Response> {
  // Find valid invitation (must not be accepted yet)
  const [invitation] = await ctx.db
    .select()
    .from(schema.groupInvitations)
    .where(
      and(eq(schema.groupInvitations.token, token), isNull(schema.groupInvitations.acceptedAt)),
    );

  if (!invitation) {
    return Response.json({ error: 'INVITATION_NOT_FOUND' }, { status: 404 });
  }

  if (invitation.expiresAt < new Date()) {
    return Response.json({ error: 'INVITATION_EXPIRED' }, { status: 400 });
  }

  // Check if already a member
  const [existingMember] = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, invitation.groupId),
        eq(schema.groupMembers.userId, user.id),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (existingMember) {
    return Response.json({ error: 'ALREADY_MEMBER' }, { status: 400 });
  }

  const memberId = crypto.randomUUID();
  const now = new Date();
  const memberName = user.name || user.email.split('@')[0] || user.email;

  // Mark invitation as accepted first (with conditional WHERE to prevent race condition)
  // Only update if still not accepted
  await ctx.db
    .update(schema.groupInvitations)
    .set({ acceptedAt: now })
    .where(
      and(eq(schema.groupInvitations.id, invitation.id), isNull(schema.groupInvitations.acceptedAt)),
    );

  // Verify the invitation was actually marked as accepted by us (not by another concurrent request)
  const [updatedInvitation] = await ctx.db
    .select({ acceptedAt: schema.groupInvitations.acceptedAt })
    .from(schema.groupInvitations)
    .where(eq(schema.groupInvitations.id, invitation.id));

  // If acceptedAt doesn't match our timestamp, another request won the race
  if (!updatedInvitation || updatedInvitation.acceptedAt?.getTime() !== now.getTime()) {
    return Response.json({ error: 'INVITATION_NOT_FOUND' }, { status: 404 });
  }

  // Now safely add the member
  await ctx.db.insert(schema.groupMembers).values({
    id: memberId,
    groupId: invitation.groupId,
    userId: user.id,
    name: memberName,
    email: user.email,
    income: 0,
    coefficient: 0,
    joinedAt: now,
  });

  return Response.json({ groupId: invitation.groupId });
}

// Main handler
export async function handleInvitationsRoutes(
  request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  const pathParts = url.pathname.replace('/api/invitations', '').split('/').filter(Boolean);
  const token = pathParts[0];
  const action = pathParts[1];

  if (!token || !isValidUUID(token)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // GET /api/invitations/:token - Get invitation details (no auth)
  if (method === 'GET' && !action) {
    return getInvitationByToken(ctx, token);
  }

  // POST /api/invitations/:token/accept - Accept invitation (auth required)
  if (method === 'POST' && action === 'accept') {
    const session = await ctx.auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return acceptInvitation(ctx, token, session.user);
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
