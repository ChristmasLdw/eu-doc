const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');

const { consumeEmailSendLimit } = require('../utils/emailRateLimit.cjs');

const ENV_KEYS = [
  'EMAIL_RATE_LIMIT_COOLDOWN_SECONDS',
  'EMAIL_RATE_LIMIT_PER_EMAIL_HOUR',
  'EMAIL_RATE_LIMIT_PER_EMAIL_DAY',
  'EMAIL_RATE_LIMIT_PER_IP_HOUR',
  'EMAIL_RATE_LIMIT_HASH_SECRET',
];

function withLimits(overrides, callback) {
  const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  Object.entries(overrides).forEach(([key, value]) => {
    process.env[key] = String(value);
  });

  try {
    return callback();
  } finally {
    ENV_KEYS.forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    });
  }
}

test('same email and mail type is blocked during the cooldown window', () => {
  const db = new Database(':memory:');

  try {
    withLimits({
      EMAIL_RATE_LIMIT_COOLDOWN_SECONDS: 60,
      EMAIL_RATE_LIMIT_PER_EMAIL_HOUR: 5,
      EMAIL_RATE_LIMIT_PER_EMAIL_DAY: 20,
      EMAIL_RATE_LIMIT_PER_IP_HOUR: 30,
      EMAIL_RATE_LIMIT_HASH_SECRET: 'test-secret',
    }, () => {
      const first = consumeEmailSendLimit({
        db,
        email: 'Person@Example.com',
        ipAddress: '127.0.0.1',
        mailType: 'verify',
        nowMs: 1_000_000,
      });
      const second = consumeEmailSendLimit({
        db,
        email: 'person@example.com',
        ipAddress: '127.0.0.1',
        mailType: 'verify',
        nowMs: 1_030_000,
      });

      assert.equal(first.allowed, true);
      assert.equal(second.allowed, false);
      assert.equal(second.retryAfterSeconds, 30);
    });
  } finally {
    db.close();
  }
});

test('different mail types have independent email cooldowns', () => {
  const db = new Database(':memory:');

  try {
    withLimits({ EMAIL_RATE_LIMIT_HASH_SECRET: 'test-secret' }, () => {
      const verification = consumeEmailSendLimit({
        db,
        email: 'person@example.com',
        ipAddress: '127.0.0.1',
        mailType: 'verify',
        nowMs: 1_000_000,
      });
      const reset = consumeEmailSendLimit({
        db,
        email: 'person@example.com',
        ipAddress: '127.0.0.1',
        mailType: 'password_reset',
        nowMs: 1_000_000,
      });

      assert.equal(verification.allowed, true);
      assert.equal(reset.allowed, true);
    });
  } finally {
    db.close();
  }
});

test('IP hourly limit blocks attempts across different email addresses', () => {
  const db = new Database(':memory:');

  try {
    withLimits({
      EMAIL_RATE_LIMIT_COOLDOWN_SECONDS: 1,
      EMAIL_RATE_LIMIT_PER_EMAIL_HOUR: 10,
      EMAIL_RATE_LIMIT_PER_EMAIL_DAY: 20,
      EMAIL_RATE_LIMIT_PER_IP_HOUR: 2,
      EMAIL_RATE_LIMIT_HASH_SECRET: 'test-secret',
    }, () => {
      const first = consumeEmailSendLimit({ db, email: 'one@example.com', ipAddress: '10.0.0.1', mailType: 'verify', nowMs: 1_000_000 });
      const second = consumeEmailSendLimit({ db, email: 'two@example.com', ipAddress: '10.0.0.1', mailType: 'verify', nowMs: 1_002_000 });
      const third = consumeEmailSendLimit({ db, email: 'three@example.com', ipAddress: '10.0.0.1', mailType: 'verify', nowMs: 1_004_000 });

      assert.equal(first.allowed, true);
      assert.equal(second.allowed, true);
      assert.equal(third.allowed, false);
      assert.ok(third.retryAfterSeconds > 0);
    });
  } finally {
    db.close();
  }
});
