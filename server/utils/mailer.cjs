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

/**
 * 渲染邮件模板 - 使用 EU-DOC 品牌风格
 * 主色：蓝色渐变 #3b82f6 → #6366f1
 * 风格：现代、专业、科技感
 */
function renderEmail({ title, greeting, description, actionLabel, actionUrl, expiresText, footerNote }) {
  const safeTitle = escapeHtml(title);
  const safeGreeting = escapeHtml(greeting);
  const safeDescription = escapeHtml(description);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeExpiresText = escapeHtml(expiresText);
  const safeFooterNote = footerNote ? escapeHtml(footerNote) : '';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans SC',sans-serif;">
  <!-- 主容器 -->
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:8px;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">EU-DOC</span>
      </div>
    </div>

    <!-- 邮件卡片 -->
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

      <!-- 标题区域 -->
      <div style="padding:32px 32px 24px;border-bottom:1px solid #e2e8f0;">
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#0f172a;line-height:1.3;">${safeTitle}</h1>
      </div>

      <!-- 内容区域 -->
      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;color:#0f172a;line-height:1.6;">${safeGreeting}</p>
        <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.7;">${safeDescription}</p>

        <!-- 操作按钮 -->
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${safeActionUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:12px;box-shadow:0 4px 12px rgba(59,130,246,0.3);">${safeActionLabel}</a>
        </div>

        <!-- 说明文字 -->
        <div style="padding:16px;background:#f8fafc;border-radius:8px;margin-bottom:16px;">
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">${safeExpiresText}</p>
        </div>

        <!-- 备用链接 -->
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;word-break:break-all;">
          如果按钮无法点击，请复制以下链接到浏览器：<br>
          <span style="color:#3b82f6;">${safeActionUrl}</span>
        </p>
      </div>
    </div>

    <!-- 页脚 -->
    <div style="margin-top:32px;text-align:center;">
      ${safeFooterNote ? `<p style="margin:0 0 12px;font-size:13px;color:#64748b;line-height:1.6;">${safeFooterNote}</p>` : ''}
      <p style="margin:0;font-size:12px;color:#94a3b8;">EU-DOC · 产品合规资料管理平台</p>
      <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">Product Documentation You Can Trust</p>
    </div>

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

/**
 * 发送验证邮件
 */
async function sendVerificationEmail({ to, token, displayName }) {
  const { frontendUrl } = getMailConfig();
  const actionUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const greeting = displayName ? `${displayName}，你好！` : '你好！';

  return sendEmail({
    to,
    subject: '验证你的 EU-DOC 账户邮箱',
    html: renderEmail({
      title: '验证邮箱地址',
      greeting,
      description: '感谢注册 EU-DOC 产品合规资料管理平台。为了保障账户安全，请点击下方按钮验证你的邮箱地址。',
      actionLabel: '验证邮箱',
      actionUrl,
      expiresText: '此验证链接有效期为 24 小时。如果不是你本人操作，请忽略此邮件。',
      footerNote: '验证后，你可以使用完整的企业资料管理与证书发布功能。'
    }),
    text: `请验证你的 EU-DOC 邮箱：${actionUrl}\n\n此链接将在 24 小时后失效。`,
  });
}

/**
 * 发送密码重置邮件
 */
async function sendPasswordResetEmail({ to, token }) {
  const { frontendUrl } = getMailConfig();
  const actionUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to,
    subject: '重置你的 EU-DOC 账户密码',
    html: renderEmail({
      title: '重置密码',
      greeting: '你好！',
      description: '我们收到了你的密码重置请求。请点击下方按钮设置新密码。如果不是你本人操作，请立即联系我们。',
      actionLabel: '重置密码',
      actionUrl,
      expiresText: '此重置链接有效期为 1 小时。如果不是你本人操作，请忽略此邮件并检查账户安全。',
      footerNote: '为了账户安全，建议使用包含字母、数字的强密码。'
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
