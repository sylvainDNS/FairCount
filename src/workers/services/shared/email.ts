import { WorkerMailer } from 'worker-mailer';
import type { Env } from '../../types';
import { invitationEmail } from './email-templates';

/**
 * Create a connected SMTP mailer instance.
 * Shared between magic link and invitation email sending.
 */
export async function createMailer(env: Env) {
  const port = parseInt(env.SMTP_PORT, 10) || 1025;

  return WorkerMailer.connect({
    host: env.SMTP_HOST || 'localhost',
    port,
    secure: false,
    startTls: true,
    credentials: {
      username: env.SMTP_USER,
      password: env.SMTP_PASS,
    },
    authType: 'plain',
  });
}

interface InvitationEmailData {
  readonly to: string;
  readonly groupName: string;
  readonly inviterName: string;
  readonly inviteUrl: string;
}

export async function sendInvitationEmail(env: Env, data: InvitationEmailData): Promise<void> {
  const mailer = await createMailer(env);
  const content = invitationEmail({
    appName: env.APP_NAME,
    inviterName: data.inviterName,
    groupName: data.groupName,
    inviteUrl: data.inviteUrl,
  });

  await mailer.send({
    from: { name: env.APP_NAME, email: env.SMTP_FROM },
    to: { email: data.to },
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}
