import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { Database } from '@/db';
import type { GroupInvitation } from '@/db/schema';
import * as schema from '@/db/schema';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import { isValidUUID } from '../../lib/validation';
import { recalculateCoefficients } from './members';
import { resolveInitialMemberName } from './shared/sql-helpers';

// ── Types ──────────────────────────────────────────────────────────

interface InvitationUser {
  readonly id: string;
  readonly email: string;
  readonly name?: string | null | undefined;
}

interface MembershipConflict {
  readonly type: 'ALREADY_MEMBER' | 'ALREADY_INVITED';
}

interface SendInvitationParams {
  readonly db: Database;
  readonly groupId: string;
  readonly email: string;
  readonly inviterId: string;
  readonly memberName?: string | undefined;
}

interface AcceptResult {
  readonly groupId: string;
}

type InvitationError =
  | typeof API_ERROR_CODES.NOT_FOUND
  | typeof API_ERROR_CODES.INVITATION_NOT_FOUND
  | typeof API_ERROR_CODES.INVITATION_EXPIRED
  | typeof API_ERROR_CODES.FORBIDDEN
  | typeof API_ERROR_CODES.ALREADY_MEMBER
  | typeof API_ERROR_CODES.INTERNAL_ERROR;

type ErrorStatus = 400 | 403 | 404 | 500;

// ── Validation ─────────────────────────────────────────────────────

/**
 * Find a valid (pending, non-expired) invitation by token.
 * Returns the invitation or an error code.
 */
export async function findValidInvitation(
  db: Database,
  token: string,
): Promise<{ invitation: GroupInvitation } | { error: InvitationError; status: ErrorStatus }> {
  if (!token || !isValidUUID(token)) {
    return { error: API_ERROR_CODES.NOT_FOUND, status: 404 };
  }

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
    return { error: API_ERROR_CODES.INVITATION_NOT_FOUND, status: 404 };
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    return { error: API_ERROR_CODES.INVITATION_EXPIRED, status: 400 };
  }

  return { invitation };
}

/**
 * Check if a user is already a member or already invited to a group.
 * Email must be pre-normalized to lowercase.
 */
export async function checkMembershipConflicts(
  db: Database,
  groupId: string,
  email: string,
): Promise<MembershipConflict | null> {
  // Check if already a member by email in groupMembers
  const [memberByEmail] = await db
    .select({ id: schema.groupMembers.id })
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.email, email),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (memberByEmail) {
    return { type: 'ALREADY_MEMBER' };
  }

  // Check if already a member via linked user account
  const [memberByUser] = await db
    .select({ id: schema.groupMembers.id })
    .from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(sql`lower(${schema.users.email})`, email),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (memberByUser) {
    return { type: 'ALREADY_MEMBER' };
  }

  // Check if already invited (pending, non-expired)
  const [pendingInvitation] = await db
    .select({ id: schema.groupInvitations.id })
    .from(schema.groupInvitations)
    .where(
      and(
        eq(schema.groupInvitations.groupId, groupId),
        eq(schema.groupInvitations.email, email),
        isNull(schema.groupInvitations.acceptedAt),
        isNull(schema.groupInvitations.declinedAt),
        gt(schema.groupInvitations.expiresAt, new Date()),
      ),
    );

  if (pendingInvitation) {
    return { type: 'ALREADY_INVITED' };
  }

  return null;
}

// ── Mutations ──────────────────────────────────────────────────────

/**
 * Create an invitation and its associated pending member.
 * Returns the IDs and token. Does NOT send the email (caller handles that).
 */
export async function createInvitation(
  params: SendInvitationParams,
): Promise<{ invitationId: string; memberId: string; token: string }> {
  const { db, groupId, email, inviterId, memberName } = params;

  const invitationId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const resolvedName = resolveInitialMemberName(memberName ?? null, email);

  await db.batch([
    db.insert(schema.groupInvitations).values({
      id: invitationId,
      groupId,
      email,
      token,
      createdBy: inviterId,
      expiresAt,
      createdAt: now,
    }),
    db.insert(schema.groupMembers).values({
      id: memberId,
      groupId,
      userId: null,
      name: resolvedName,
      email,
      income: 0,
      coefficient: 0,
      joinedAt: now,
    }),
  ]);

  await recalculateCoefficients(db, groupId);

  return { invitationId, memberId, token };
}

/**
 * Rollback a failed invitation creation (e.g. after email send failure).
 * Deletes the invitation and pending member, then recalculates coefficients.
 */
export async function rollbackInvitation(
  db: Database,
  groupId: string,
  invitationId: string,
  memberId: string,
): Promise<void> {
  await db.batch([
    db.delete(schema.groupInvitations).where(eq(schema.groupInvitations.id, invitationId)),
    db.delete(schema.groupMembers).where(eq(schema.groupMembers.id, memberId)),
  ]);
  await recalculateCoefficients(db, groupId);
}

/**
 * Accept an invitation: link the pending member to the user account.
 * Verifies email ownership and prevents duplicate membership.
 */
export async function acceptInvitation(
  db: Database,
  invitation: GroupInvitation,
  user: InvitationUser,
): Promise<AcceptResult | { error: InvitationError; status: ErrorStatus }> {
  // Verify the invitation belongs to the authenticated user
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: API_ERROR_CODES.FORBIDDEN, status: 403 };
  }

  // Check if user is already a member (by userId)
  const [existingMember] = await db
    .select({ id: schema.groupMembers.id })
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, invitation.groupId),
        eq(schema.groupMembers.userId, user.id),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (existingMember) {
    return { error: API_ERROR_CODES.ALREADY_MEMBER, status: 400 };
  }

  // Find the pending member created when the invitation was sent
  const [pendingMember] = await db
    .select({ id: schema.groupMembers.id })
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, invitation.groupId),
        eq(schema.groupMembers.email, invitation.email),
        isNull(schema.groupMembers.userId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (!pendingMember) {
    console.error(
      `Pending member not found for invitation ${invitation.id} in group ${invitation.groupId}`,
    );
    return { error: API_ERROR_CODES.INTERNAL_ERROR, status: 500 };
  }

  const now = new Date();
  const memberName = resolveInitialMemberName(user.name, user.email);

  // Mark invitation as accepted and link the pending member atomically
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
      .set({ userId: user.id, name: memberName })
      .where(eq(schema.groupMembers.id, pendingMember.id)),
  ]);

  // Verify the invitation was actually marked as accepted (race condition guard)
  const [updated] = await db
    .select({ acceptedAt: schema.groupInvitations.acceptedAt })
    .from(schema.groupInvitations)
    .where(eq(schema.groupInvitations.id, invitation.id));

  if (!updated?.acceptedAt) {
    return { error: API_ERROR_CODES.ALREADY_MEMBER, status: 400 };
  }

  await recalculateCoefficients(db, invitation.groupId);

  return { groupId: invitation.groupId };
}

/**
 * Decline an invitation: mark it as declined and remove the pending member.
 * Verifies email ownership.
 */
export async function declineInvitation(
  db: Database,
  invitation: GroupInvitation,
  user: InvitationUser,
): Promise<{ success: true } | { error: InvitationError; status: ErrorStatus }> {
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: API_ERROR_CODES.FORBIDDEN, status: 403 };
  }

  await removePendingMember(db, invitation, { markDeclined: true });

  return { success: true };
}

/**
 * Cancel an invitation (admin action): delete it and remove the pending member.
 */
export async function cancelInvitation(
  db: Database,
  groupId: string,
  invitationId: string,
): Promise<{ success: true } | { error: InvitationError; status: ErrorStatus }> {
  if (!isValidUUID(invitationId)) {
    return { error: API_ERROR_CODES.INVITATION_NOT_FOUND, status: 404 };
  }

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
    return { error: API_ERROR_CODES.INVITATION_NOT_FOUND, status: 404 };
  }

  await removePendingMember(
    db,
    { id: invitationId, groupId, email: invitation.email },
    { markDeclined: false },
  );

  return { success: true };
}

/**
 * Resend an invitation: generate a new token and update expiry.
 * Returns the new token and invitation email for the caller to send the email.
 */
/**
 * Prepare a token refresh for resending an invitation.
 * Validates the invitation and generates a new token WITHOUT persisting it.
 * Call `commitTokenRefresh` after the email is sent successfully.
 */
export async function refreshInvitationToken(
  db: Database,
  groupId: string,
  invitationId: string,
): Promise<
  | { token: string; email: string; expiresAt: Date }
  | { error: InvitationError; status: ErrorStatus }
> {
  if (!isValidUUID(invitationId)) {
    return { error: API_ERROR_CODES.INVITATION_NOT_FOUND, status: 404 };
  }

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
    return { error: API_ERROR_CODES.INVITATION_NOT_FOUND, status: 404 };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return { token, email: invitation.email, expiresAt };
}

/**
 * Persist a new token and expiry for a resent invitation.
 * Should only be called after the email was sent successfully.
 */
export async function commitTokenRefresh(
  db: Database,
  invitationId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  await db
    .update(schema.groupInvitations)
    .set({ token, expiresAt })
    .where(eq(schema.groupInvitations.id, invitationId));
}

// ── Internal helpers ───────────────────────────────────────────────

/**
 * Remove a pending member associated with an invitation.
 * Used by both decline (mark as declined) and cancel (delete invitation).
 */
async function removePendingMember(
  db: Database,
  invitation: Pick<GroupInvitation, 'id' | 'groupId' | 'email'>,
  options: { markDeclined: boolean },
): Promise<void> {
  const now = new Date();

  await db.batch([
    options.markDeclined
      ? db
          .update(schema.groupInvitations)
          .set({ declinedAt: now })
          .where(
            and(
              eq(schema.groupInvitations.id, invitation.id),
              isNull(schema.groupInvitations.declinedAt),
            ),
          )
      : db.delete(schema.groupInvitations).where(eq(schema.groupInvitations.id, invitation.id)),
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

  await recalculateCoefficients(db, invitation.groupId);
}
