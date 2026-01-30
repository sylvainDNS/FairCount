import { WorkerMailer } from 'worker-mailer';
import type { Env } from '../../types';

interface InvitationEmailData {
  readonly to: string;
  readonly groupName: string;
  readonly inviterName: string;
  readonly inviteUrl: string;
}

export async function sendInvitationEmail(env: Env, data: InvitationEmailData): Promise<void> {
  const port = parseInt(env.SMTP_PORT, 10) || 1025;

  const mailer = await WorkerMailer.connect({
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

  await mailer.send({
    from: { name: env.APP_NAME, email: env.SMTP_FROM },
    to: { email: data.to },
    subject: `${data.inviterName} vous invite à rejoindre "${data.groupName}" sur ${env.APP_NAME}`,
    text: `Bonjour,

${data.inviterName} vous invite à rejoindre le groupe "${data.groupName}" sur ${env.APP_NAME}.

Cliquez sur le lien ci-dessous pour accepter l'invitation :

${data.inviteUrl}

Ce lien expire dans 7 jours.

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
  <p><strong>${data.inviterName}</strong> vous invite à rejoindre le groupe <strong>"${data.groupName}"</strong>.</p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${data.inviteUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Accepter l'invitation</a>
  </p>
  <p style="color: #666; font-size: 14px;">Ce lien expire dans 7 jours.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="color: #999; font-size: 12px;">L'équipe ${env.APP_NAME}</p>
</body>
</html>`,
  });
}
