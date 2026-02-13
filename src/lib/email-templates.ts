// ── Helpers ─────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Layout helpers ──────────────────────────────────────────────────

function ctaButton(href: string, label: string): string {
  return `<p style="text-align: center; margin: 32px 0;">
    <a href="${escapeHtml(href)}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">${escapeHtml(label)}</a>
  </p>`;
}

function wrapHtml(appName: string, bodyHtml: string): string {
  const safe = escapeHtml(appName);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">${safe}</h1>
  ${bodyHtml}
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="color: #999; font-size: 12px;">L'équipe ${safe}</p>
</body>
</html>`;
}

// ── Email templates ─────────────────────────────────────────────────

interface EmailContent {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export function magicLinkEmail(appName: string, url: string): EmailContent {
  return {
    subject: `Votre lien de connexion ${appName}`,
    text: `Bonjour,

Cliquez sur le lien ci-dessous pour vous connecter :

${url}

Ce lien expire dans 15 minutes.

Si vous n'avez pas demandé ce lien, ignorez cet email.

L'équipe ${appName}`,
    html: wrapHtml(
      appName,
      `<p>Bonjour,</p>
  <p>Cliquez sur le bouton ci-dessous pour vous connecter :</p>
  ${ctaButton(url, 'Se connecter')}
  <p style="color: #666; font-size: 14px;">Ce lien expire dans 15 minutes.</p>
  <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé ce lien, ignorez cet email.</p>`,
    ),
  };
}

interface InvitationEmailParams {
  readonly appName: string;
  readonly inviterName: string;
  readonly groupName: string;
  readonly inviteUrl: string;
}

export function invitationEmail(params: InvitationEmailParams): EmailContent {
  const { appName, inviterName, groupName, inviteUrl } = params;

  return {
    subject: `${inviterName} vous invite à rejoindre "${groupName}" sur ${appName}`,
    text: `Bonjour,

${inviterName} vous invite à rejoindre le groupe "${groupName}" sur ${appName}.

Cliquez sur le lien ci-dessous pour accepter l'invitation :

${inviteUrl}

Ce lien expire dans 7 jours.

L'équipe ${appName}`,
    html: wrapHtml(
      appName,
      `<p>Bonjour,</p>
  <p><strong>${escapeHtml(inviterName)}</strong> vous invite à rejoindre le groupe <strong>"${escapeHtml(groupName)}"</strong>.</p>
  ${ctaButton(inviteUrl, "Accepter l'invitation")}
  <p style="color: #666; font-size: 14px;">Ce lien expire dans 7 jours.</p>`,
    ),
  };
}
