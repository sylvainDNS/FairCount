import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import type { Database } from '../db';
import * as schema from '../db/schema';
import { createMailer } from '../workers/services/shared/email';
import { magicLinkEmail } from '../workers/services/shared/email-templates';
import type { Env } from '../workers/types';

interface CreateAuthOptions {
  readonly db: Database;
  readonly env: Env;
}

export const createAuth = ({ db, env }: CreateAuthOptions) => {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    baseURL: env.APP_URL,
    basePath: '/auth',
    trustedOrigins: [env.FRONTEND_URL],
    secret: env.AUTH_SECRET,
    appName: env.APP_NAME,
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: new URL(env.FRONTEND_URL).hostname,
      },
    },
    emailAndPassword: {
      enabled: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 15, // 15 minutes
        disableSignUp: false,
        sendMagicLink: async ({ email, url }) => {
          const mailer = await createMailer(env);
          const content = magicLinkEmail(env.APP_NAME, url);

          await mailer.send({
            from: { name: env.APP_NAME, email: env.SMTP_FROM },
            to: { email },
            subject: content.subject,
            text: content.text,
            html: content.html,
          });
        },
      }),
    ],
  });
};

export type Auth = ReturnType<typeof createAuth>;
