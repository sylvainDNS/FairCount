import { and, count, eq, gt, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../../../db';
import * as schema from '../../../db/schema';
import type { Auth } from '../../../lib/auth';
import { isValidEmail, isValidUUID } from '../../../lib/validation';
import type { Env } from '../../types';
import { sendInvitationEmail } from '../utils/email';

interface RouteContext {
  readonly db: Database;
  readonly auth: Auth;
  readonly env: Env;
}

// Verify user is an active member of the group
async function verifyMembership(
  db: Database,
  groupId: string,
  userId: string,
): Promise<schema.GroupMember | null> {
  const [member] = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId),
        isNull(schema.groupMembers.leftAt),
      ),
    );
  return member ?? null;
}

// Safe JSON parsing
async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// List user's groups
async function listGroups(ctx: RouteContext, userId: string): Promise<Response> {
  // Get user's groups
  const userGroups = await ctx.db
    .select({
      id: schema.groups.id,
      name: schema.groups.name,
      description: schema.groups.description,
      currency: schema.groups.currency,
      archivedAt: schema.groups.archivedAt,
      createdAt: schema.groups.createdAt,
    })
    .from(schema.groups)
    .innerJoin(schema.groupMembers, eq(schema.groups.id, schema.groupMembers.groupId))
    .where(and(eq(schema.groupMembers.userId, userId), isNull(schema.groupMembers.leftAt)));

  if (userGroups.length === 0) {
    return Response.json([]);
  }

  // Get member counts for all groups in a single query
  const groupIds = userGroups.map((g) => g.id);
  const memberCounts = await ctx.db
    .select({
      groupId: schema.groupMembers.groupId,
      count: count(),
    })
    .from(schema.groupMembers)
    .where(and(inArray(schema.groupMembers.groupId, groupIds), isNull(schema.groupMembers.leftAt)))
    .groupBy(schema.groupMembers.groupId);

  const countMap = new Map(memberCounts.map((mc) => [mc.groupId, mc.count]));

  const groupsWithMeta = userGroups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    memberCount: countMap.get(group.id) ?? 0,
    myBalance: 0, // Placeholder - will be calculated in Phase 5
    isArchived: group.archivedAt !== null,
    createdAt: group.createdAt,
  }));

  return Response.json(groupsWithMeta);
}

// Create a new group
async function createGroup(
  ctx: RouteContext,
  user: { id: string; name?: string | null; email: string },
  data: { name?: string; description?: string; currency?: string },
): Promise<Response> {
  if (!data.name?.trim()) {
    return Response.json({ error: 'INVALID_NAME' }, { status: 400 });
  }

  const groupId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const now = new Date();
  const memberName = user.name || user.email.split('@')[0] || user.email;

  // Use batch for atomic operations (D1 doesn't support transactions)
  await ctx.db.batch([
    ctx.db.insert(schema.groups).values({
      id: groupId,
      name: data.name?.trim() || '',
      description: data.description?.trim() || null,
      currency: data.currency || 'EUR',
      createdBy: user.id,
      createdAt: now,
    }),
    ctx.db.insert(schema.groupMembers).values({
      id: memberId,
      groupId,
      userId: user.id,
      name: memberName,
      email: user.email,
      income: 0,
      coefficient: 0,
      joinedAt: now,
    }),
  ]);

  return Response.json({ id: groupId }, { status: 201 });
}

// Get group details
async function getGroup(ctx: RouteContext, groupId: string, userId: string): Promise<Response> {
  const [group] = await ctx.db.select().from(schema.groups).where(eq(schema.groups.id, groupId));

  if (!group) {
    return Response.json({ error: 'GROUP_NOT_FOUND' }, { status: 404 });
  }

  const members = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, groupId), isNull(schema.groupMembers.leftAt)));

  const myMember = members.find((m) => m.userId === userId);

  return Response.json({
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    archivedAt: group.archivedAt,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      userId: m.userId,
      income: m.income,
      coefficient: m.coefficient,
      joinedAt: m.joinedAt,
    })),
    memberCount: members.length,
    myMemberId: myMember?.id,
  });
}

// Update group
async function updateGroup(
  ctx: RouteContext,
  groupId: string,
  data: { name?: string; description?: string },
): Promise<Response> {
  if (data.name !== undefined && !data.name.trim()) {
    return Response.json({ error: 'INVALID_NAME' }, { status: 400 });
  }

  const updates: { name?: string; description?: string | null } = {};
  if (data.name) updates.name = data.name.trim();
  if (data.description !== undefined) updates.description = data.description?.trim() || null;

  if (Object.keys(updates).length > 0) {
    await ctx.db.update(schema.groups).set(updates).where(eq(schema.groups.id, groupId));
  }

  return Response.json({ success: true });
}

// Delete group (only creator can delete)
async function deleteGroup(ctx: RouteContext, groupId: string, userId: string): Promise<Response> {
  const [group] = await ctx.db.select().from(schema.groups).where(eq(schema.groups.id, groupId));

  if (!group) {
    return Response.json({ error: 'GROUP_NOT_FOUND' }, { status: 404 });
  }

  if (group.createdBy !== userId) {
    return Response.json({ error: 'NOT_AUTHORIZED' }, { status: 403 });
  }

  await ctx.db.delete(schema.groups).where(eq(schema.groups.id, groupId));

  return Response.json({ success: true });
}

// Archive/unarchive group
async function toggleArchive(ctx: RouteContext, groupId: string): Promise<Response> {
  const [group] = await ctx.db.select().from(schema.groups).where(eq(schema.groups.id, groupId));

  if (!group) {
    return Response.json({ error: 'GROUP_NOT_FOUND' }, { status: 404 });
  }

  const newArchivedAt = group.archivedAt ? null : new Date();

  await ctx.db
    .update(schema.groups)
    .set({ archivedAt: newArchivedAt })
    .where(eq(schema.groups.id, groupId));

  return Response.json({ success: true, isArchived: newArchivedAt !== null });
}

// Leave group
async function leaveGroup(ctx: RouteContext, groupId: string, userId: string): Promise<Response> {
  // Check if user is the only member
  const [memberCount] = await ctx.db
    .select({ count: count() })
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, groupId), isNull(schema.groupMembers.leftAt)));

  if ((memberCount?.count ?? 0) <= 1) {
    return Response.json({ error: 'CANNOT_LEAVE_ALONE' }, { status: 400 });
  }

  await ctx.db
    .update(schema.groupMembers)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  return Response.json({ success: true });
}

// Send invitation
async function sendInvitation(
  ctx: RouteContext,
  groupId: string,
  inviter: { id: string; name?: string | null; email: string },
  data: { email?: string },
): Promise<Response> {
  const email = data.email?.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: 'INVALID_EMAIL' }, { status: 400 });
  }

  // Check if already a member
  const existingMember = await ctx.db
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

  if (existingMember.length > 0) {
    return Response.json({ error: 'ALREADY_MEMBER' }, { status: 400 });
  }

  // Check if already invited (pending)
  const existingInvitation = await ctx.db
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
    return Response.json({ error: 'ALREADY_INVITED' }, { status: 400 });
  }

  // Get group name for email
  const [group] = await ctx.db
    .select({ name: schema.groups.name })
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId));

  if (!group) {
    return Response.json({ error: 'GROUP_NOT_FOUND' }, { status: 404 });
  }

  // Create invitation
  const invitationId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await ctx.db.insert(schema.groupInvitations).values({
    id: invitationId,
    groupId,
    email,
    token,
    createdBy: inviter.id,
    expiresAt,
    createdAt: now,
  });

  // Send invitation email
  await sendInvitationEmail(ctx.env, {
    to: email,
    groupName: group.name,
    inviterName: inviter.name ?? inviter.email,
    inviteUrl: `${ctx.env.APP_URL}/invite/${token}`,
  });

  return Response.json({ id: invitationId }, { status: 201 });
}

// List pending invitations
async function listInvitations(ctx: RouteContext, groupId: string): Promise<Response> {
  const invitations = await ctx.db
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

  return Response.json(
    invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      createdByName: inv.createdByName || 'Inconnu',
    })),
  );
}

// Cancel invitation
async function cancelInvitation(
  ctx: RouteContext,
  groupId: string,
  invitationId: string,
): Promise<Response> {
  await ctx.db
    .delete(schema.groupInvitations)
    .where(
      and(
        eq(schema.groupInvitations.id, invitationId),
        eq(schema.groupInvitations.groupId, groupId),
      ),
    );

  return Response.json({ success: true });
}

// Resend invitation
async function resendInvitation(
  ctx: RouteContext,
  groupId: string,
  invitationId: string,
  inviter: { id: string; name?: string | null; email: string },
): Promise<Response> {
  const [invitation] = await ctx.db
    .select()
    .from(schema.groupInvitations)
    .where(
      and(
        eq(schema.groupInvitations.id, invitationId),
        eq(schema.groupInvitations.groupId, groupId),
      ),
    );

  if (!invitation) {
    return Response.json({ error: 'INVITATION_NOT_FOUND' }, { status: 404 });
  }

  // Get group name for email
  const [group] = await ctx.db
    .select({ name: schema.groups.name })
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId));

  if (!group) {
    return Response.json({ error: 'GROUP_NOT_FOUND' }, { status: 404 });
  }

  // Update expiration and resend
  const newToken = crypto.randomUUID();
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await ctx.db
    .update(schema.groupInvitations)
    .set({ token: newToken, expiresAt: newExpiresAt })
    .where(eq(schema.groupInvitations.id, invitationId));

  await sendInvitationEmail(ctx.env, {
    to: invitation.email,
    groupName: group.name,
    inviterName: inviter.name ?? inviter.email,
    inviteUrl: `${ctx.env.APP_URL}/invite/${newToken}`,
  });

  return Response.json({ success: true });
}

// Main handler
export async function handleGroupsRoutes(request: Request, ctx: RouteContext): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  // Get session first
  const session = await ctx.auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user;
  const pathParts = url.pathname.replace('/api/groups', '').split('/').filter(Boolean);

  // GET /api/groups - List groups
  if (method === 'GET' && pathParts.length === 0) {
    return listGroups(ctx, user.id);
  }

  // POST /api/groups - Create group
  if (method === 'POST' && pathParts.length === 0) {
    const body = await parseJsonBody<{ name?: string; description?: string; currency?: string }>(
      request,
    );
    if (!body) {
      return Response.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }
    return createGroup(ctx, user, body);
  }

  // Routes with :id
  const groupId = pathParts[0];
  if (!groupId || !isValidUUID(groupId)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const action = pathParts[1];
  const subId = pathParts[2];
  const subAction = pathParts[3];

  // Verify membership for group-specific routes
  const membership = await verifyMembership(ctx.db, groupId, user.id);
  if (!membership) {
    return Response.json({ error: 'NOT_A_MEMBER' }, { status: 403 });
  }

  // GET /api/groups/:id - Get group
  if (method === 'GET' && !action) {
    return getGroup(ctx, groupId, user.id);
  }

  // PATCH /api/groups/:id - Update group
  if (method === 'PATCH' && !action) {
    const body = await parseJsonBody<{ name?: string; description?: string }>(request);
    if (!body) {
      return Response.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }
    return updateGroup(ctx, groupId, body);
  }

  // DELETE /api/groups/:id - Delete group
  if (method === 'DELETE' && !action) {
    return deleteGroup(ctx, groupId, user.id);
  }

  // POST /api/groups/:id/archive - Archive/unarchive
  if (method === 'POST' && action === 'archive') {
    return toggleArchive(ctx, groupId);
  }

  // POST /api/groups/:id/leave - Leave group
  if (method === 'POST' && action === 'leave') {
    return leaveGroup(ctx, groupId, user.id);
  }

  // POST /api/groups/:id/invite - Send invitation
  if (method === 'POST' && action === 'invite') {
    const body = await parseJsonBody<{ email?: string }>(request);
    if (!body) {
      return Response.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }
    return sendInvitation(ctx, groupId, user, body);
  }

  // GET /api/groups/:id/invitations - List invitations
  if (method === 'GET' && action === 'invitations' && !subId) {
    return listInvitations(ctx, groupId);
  }

  // DELETE /api/groups/:id/invitations/:invitationId - Cancel invitation
  if (method === 'DELETE' && action === 'invitations' && subId) {
    if (!isValidUUID(subId)) {
      return Response.json({ error: 'INVITATION_NOT_FOUND' }, { status: 404 });
    }
    return cancelInvitation(ctx, groupId, subId);
  }

  // POST /api/groups/:id/invitations/:invitationId/resend - Resend invitation
  if (method === 'POST' && action === 'invitations' && subId && subAction === 'resend') {
    if (!isValidUUID(subId)) {
      return Response.json({ error: 'INVITATION_NOT_FOUND' }, { status: 404 });
    }
    return resendInvitation(ctx, groupId, subId, user);
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
