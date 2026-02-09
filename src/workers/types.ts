import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { Database } from '../db';
import type { Auth } from '../lib/auth';

export interface Env {
  // D1 Database
  DB: D1Database;
  // R2 Storage
  STORAGE: R2Bucket;
  // Environment variables
  APP_URL: string;
  FRONTEND_URL: string;
  APP_NAME: string;
  // Build info (injected by CI)
  GIT_SHA?: string;
  BUILD_DATE?: string;
  // Secrets
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  AUTH_SECRET: string;
}

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email: string;
}

export interface GroupMembership {
  id: string;
  groupId: string;
  userId: string | null;
  /** Computed via COALESCE(users.name, group_members.name) -- requires LEFT JOIN on users */
  name: string;
  email: string | null;
  income: number;
  coefficient: number;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface AppEnv {
  Bindings: Env;
  Variables: {
    db: Database;
    auth: Auth;
    user: AuthenticatedUser;
    session: { id: string; expiresAt: Date };
    membership: GroupMembership;
  };
}
