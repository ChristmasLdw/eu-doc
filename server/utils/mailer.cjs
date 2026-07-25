const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

function getMailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.RESEND_FROM || process.env.SMTP_FROM || '',
    frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173/eu-doc').replace(/\/+$/, ''),
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderEmail({ title, greeting, description, actionLabel, actionUrl, expiresText }) {
  const safeTitle = escapeHtml(title);
  const safeGreeting = escapeHtml(greeting);
  const safeDescription = escapeHtml(description);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeExpiresText = escapeHtml(expiresText);

  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f1ea;color:#18201d;font-family:Arial,'Noto Sans SC',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border:1px solid #dedbd2;border-radius:18px;overflow:hidden;">
      <div style="padding:26px 32px;background:#173f35;color:#ffffff;">
        <div style="font-size:13px;letter-spacing:.16em;opacity:.72;">EU-DOC</div>
        <h1 style="margin:10px 0 0;font-size:26px;line-height:1.3;">${safeTitle}</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">${safeGreeting}</p>
        <p style="margin:0 0 26px;color:#4b5551;font-size:15px;line-height:1.75;">${safeDescription}</p>
        <p style="margin:0 0 28px;">
          <a href="${safeActionUrl}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#d9a441;color:#14201c;text-decoration:none;font-weight:700;">${safeActionLabel}</a>
        </p>
        <p style="margin:0 0 12px;color:#6d7672;font-size:13px;line-height:1.65;">${safeExpiresText}</p>
        <p style="margin:0;color:#8a918e;font-size:12px;line-height:1.65;word-break:break-all;">如果按钮无法打开，请复制此链接：<br>${safeActionUrl}</p>
      </div>
    </div>
    <p style="margin:18px 0 0;text-align:center;color:#7c837f;font-size:12px;">EU-DOC · Product documentation you can trust</p>
  </div>
</body>
</html>`;
}

async function sendEmail({ to, subject, html, text }) {
  const { apiKey, from } = getMailConfig();
  if (!apiKey || !from) {
    return { sent: false, skipped: true, reason: 'mail_not_configured' };
  }

  const response = await fetch(RESEND_EMAILS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  const rawBody = await response.text();
  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload.message || `Resend request failed with status ${response.status}`;
    throw new Error(message);
  }

  return { sent: true, id: payload.id || null };
}

async function sendVerificationEmail({ to, token, displayName }) {
  const { frontendUrl } = getMailConfig();
  const actionUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const greeting = displayName ? `${displayName}，你好：` : '你好：';

  return sendEmail({
    to,
    subject: '验证你的 EU-DOC 邮箱 / Verify your EU-DOC email',
    html: renderEmail({
      title: '验证你的邮箱',
      greeting,
      description: '请点击下面的按钮完成邮箱验证。验证后，你可以继续使用 EU-DOC 的企业与产品资料功能。',
      actionLabel: '验证邮箱',
      actionUrl,
      expiresText: '此验证链接将在 24 小时后失效。如果不是你创建了该账号，可以忽略此邮件。',
    }),
    text: `请验证你的 EU-DOC 邮箱：${actionUrl}\n\n此链接将在 24 小时后失效。`,
  });
}

async function sendPasswordResetEmail({ to, token }) {
  const { frontendUrl } = getMailConfig();
  const actionUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to,
    subject: '重置你的 EU-DOC 密码 / Reset your EU-DOC password',
    html: renderEmail({
      title: '重置你的密码',
      greeting: '你好：',
      description: '我们收到了重置 EU-DOC 密码的请求。请点击下面的按钮设置新密码。',
      actionLabel: '重置密码',
      actionUrl,
      expiresText: '此重置链接将在 1 小时后失效。如果不是你发起的请求，可以忽略此邮件。',
    }),
    text: `请通过以下链接重置 EU-DOC 密码：${actionUrl}\n\n此链接将在 1 小时后失效。`,
  });
}

module.exports = {
  getMailConfig,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
