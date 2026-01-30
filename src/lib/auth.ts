import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { WorkerMailer } from 'worker-mailer';
import type { Database } from '../db';
import type { Env } from '../workers';

interface CreateAuthOptions {
  readonly db: Database;
  readonly env: Env;
}

export const createAuth = ({ db, env }: CreateAuthOptions) => {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
    }),
    baseURL: env.APP_URL,
    secret: env.AUTH_SECRET,
    appName: env.APP_NAME,
    emailAndPassword: {
      enabled: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 15, // 15 minutes
        sendMagicLink: async ({ email, url }) => {
          const mailer = await WorkerMailer.connect({
            host: env.SMTP_HOST,
            port: Number(env.SMTP_PORT),
            secure: false,
            startTls: true,
            credentials: {
              username: env.SMTP_USER,
              password: env.SMTP_PASS,
            },
            authType: 'plain',
          });

          await mailer.send({
            from: { name: env.APP_NAME, email: env.SMTP_FROM },
            to: { email },
            subject: `Votre lien de connexion ${env.APP_NAME}`,
            text: `Bonjour,

Cliquez sur le lien ci-dessous pour vous connecter :

${url}

Ce lien expire dans 15 minutes.

Si vous n'avez pas demande ce lien, ignorez cet email.

L'équipe ${env.APP_NAME}`,
            html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">${env.APP_NAME}</h1>
  <p>Bonjour,</p>
  <p>Cliquez sur le bouton ci-dessous pour vous connecter :</p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${url}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Se connecter</a>
  </p>
  <p style="color: #666; font-size: 14px;">Ce lien expire dans 15 minutes.</p>
  <p style="color: #666; font-size: 14px;">Si vous n'avez pas demande ce lien, ignorez cet email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="color: #999; font-size: 12px;">L'équipe ${env.APP_NAME}</p>
</body>
</html>`,
          });
        },
      }),
    ],
  });
};

export type Auth = ReturnType<typeof createAuth>;
