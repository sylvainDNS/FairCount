-- Convert all timestamp columns from seconds to milliseconds for consistency
-- This migration multiplies all existing timestamp values by 1000
-- Guard: only converts if value < 10000000000 (approximately Nov 2286 in seconds, or Nov 1970 in milliseconds)

-- Better-Auth Tables
UPDATE users SET
  created_at = created_at * 1000,
  updated_at = updated_at * 1000
WHERE created_at < 10000000000;

UPDATE sessions SET
  expires_at = expires_at * 1000,
  created_at = created_at * 1000,
  updated_at = updated_at * 1000
WHERE created_at < 10000000000;

UPDATE accounts SET
  access_token_expires_at = access_token_expires_at * 1000,
  refresh_token_expires_at = refresh_token_expires_at * 1000,
  created_at = created_at * 1000,
  updated_at = updated_at * 1000
WHERE created_at < 10000000000;

UPDATE verifications SET
  expires_at = expires_at * 1000,
  created_at = created_at * 1000,
  updated_at = updated_at * 1000
WHERE created_at < 10000000000;

-- Groups Tables
UPDATE groups SET
  created_at = created_at * 1000,
  archived_at = CASE WHEN archived_at IS NOT NULL AND archived_at < 10000000000 THEN archived_at * 1000 ELSE archived_at END
WHERE created_at < 10000000000;

UPDATE group_invitations SET
  expires_at = expires_at * 1000,
  accepted_at = CASE WHEN accepted_at IS NOT NULL AND accepted_at < 10000000000 THEN accepted_at * 1000 ELSE accepted_at END,
  created_at = created_at * 1000
WHERE created_at < 10000000000;

-- Expenses Tables
UPDATE expenses SET
  created_at = created_at * 1000,
  updated_at = updated_at * 1000,
  deleted_at = CASE WHEN deleted_at IS NOT NULL AND deleted_at < 10000000000 THEN deleted_at * 1000 ELSE deleted_at END
WHERE created_at < 10000000000;

-- Settlements Table
UPDATE settlements SET
  created_at = created_at * 1000
WHERE created_at < 10000000000;

-- Group Members Table
UPDATE group_members SET
  joined_at = joined_at * 1000,
  left_at = CASE WHEN left_at IS NOT NULL AND left_at < 10000000000 THEN left_at * 1000 ELSE left_at END
WHERE joined_at < 10000000000;
