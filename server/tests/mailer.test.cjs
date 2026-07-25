const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../utils/mailer.cjs');

const ENV_KEYS = ['RESEND_API_KEY', 'RESEND_FROM', 'SMTP_FROM', 'FRONTEND_URL'];

function saveEnvironment() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(saved) {
  ENV_KEYS.forEach((key) => {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  });
}

test('mailer skips delivery when Resend is not configured', async () => {
  const saved = saveEnvironment();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM;
  delete process.env.SMTP_FROM;

  try {
    const result = await sendEmail({
      to: 'person@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });
    assert.deepEqual(result, { sent: false, skipped: true, reason: 'mail_not_configured' });
  } finally {
    restoreEnvironment(saved);
  }
});

test('verification email uses Resend and builds the EU-DOC verification URL', async () => {
  const saved = saveEnvironment();
  const originalFetch = global.fetch;
  let request;

  process.env.RESEND_API_KEY = 're_test_key';
  process.env.RESEND_FROM = 'EU-DOC <noreply@auth.example.com>';
  process.env.FRONTEND_URL = 'https://example.com/eu-doc/';
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: 'email_123' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await sendVerificationEmail({
      to: 'person@example.com',
      token: 'verify token',
      displayName: '<Person>',
    });
    const body = JSON.parse(request.options.body);

    assert.deepEqual(result, { sent: true, id: 'email_123' });
    assert.equal(request.url, 'https://api.resend.com/emails');
    assert.equal(request.options.headers.Authorization, 'Bearer re_test_key');
    assert.equal(body.from, 'EU-DOC <noreply@auth.example.com>');
    assert.deepEqual(body.to, ['person@example.com']);
    assert.match(body.html, /https:\/\/example\.com\/eu-doc\/verify-email\?token=verify%20token/);
    assert.match(body.html, /&lt;Person&gt;/);
    assert.doesNotMatch(body.html, /<Person>/);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(saved);
  }
});

test('password reset email builds a one-hour reset link', async () => {
  const saved = saveEnvironment();
  const originalFetch = global.fetch;
  let body;

  process.env.RESEND_API_KEY = 're_test_key';
  process.env.RESEND_FROM = 'EU-DOC <noreply@auth.example.com>';
  process.env.FRONTEND_URL = 'https://example.com/eu-doc';
  global.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: 'email_456' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await sendPasswordResetEmail({ to: 'person@example.com', token: 'reset-token' });
    assert.equal(result.sent, true);
    assert.match(body.text, /https:\/\/example\.com\/eu-doc\/reset-password\?token=reset-token/);
    assert.match(body.text, /1 小时/);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(saved);
  }
});
