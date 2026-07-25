const crypto = require('crypto');

const initializedDatabases = new WeakSet();

function readPositiveInt(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getLimits() {
  return {
    cooldownSeconds: readPositiveInt('EMAIL_RATE_LIMIT_COOLDOWN_SECONDS', 60),
    perEmailPerHour: readPositiveInt('EMAIL_RATE_LIMIT_PER_EMAIL_HOUR', 5),
    perEmailPerDay: readPositiveInt('EMAIL_RATE_LIMIT_PER_EMAIL_DAY', 20),
    perIpPerHour: readPositiveInt('EMAIL_RATE_LIMIT_PER_IP_HOUR', 30),
  };
}

function hashIdentifier(value) {
  const secret = process.env.EMAIL_RATE_LIMIT_HASH_SECRET || process.env.JWT_SECRET || 'eu-doc-email-rate-limit';
  return crypto.createHmac('sha256', secret).update(String(value || '').trim().toLowerCase()).digest('hex');
}

function ensureEmailRateLimitTable(db) {
  if (initializedDatabases.has(db)) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_send_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_hash TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      mail_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_email_send_events_email
      ON email_send_events(email_hash, mail_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_email_send_events_ip
      ON email_send_events(ip_hash, created_at);
  `);
  initializedDatabases.add(db);
}

function retryAfterFromOldest(oldestTimestamp, windowSeconds, nowSeconds) {
  return Math.max(1, oldestTimestamp + windowSeconds - nowSeconds);
}

function consumeEmailSendLimit({ db, email, ipAddress, mailType, nowMs = Date.now() }) {
  ensureEmailRateLimitTable(db);

  const limits = getLimits();
  const nowSeconds = Math.floor(nowMs / 1000);
  const hourStart = nowSeconds - 60 * 60;
  const dayStart = nowSeconds - 24 * 60 * 60;
  const emailHash = hashIdentifier(email);
  const ipHash = hashIdentifier(ipAddress || 'unknown');

  const checkAndRecord = db.transaction(() => {
    // Keep the table bounded while retaining enough history for the daily window.
    db.prepare('DELETE FROM email_send_events WHERE created_at < ?').run(nowSeconds - 48 * 60 * 60);

    const latestEmailEvent = db.prepare(`
      SELECT created_at FROM email_send_events
      WHERE email_hash = ? AND mail_type = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(emailHash, mailType);

    if (latestEmailEvent && nowSeconds - latestEmailEvent.created_at < limits.cooldownSeconds) {
      return {
        allowed: false,
        retryAfterSeconds: limits.cooldownSeconds - (nowSeconds - latestEmailEvent.created_at),
      };
    }

    const emailHourEvents = db.prepare(`
      SELECT created_at FROM email_send_events
      WHERE email_hash = ? AND mail_type = ? AND created_at > ?
      ORDER BY created_at ASC
    `).all(emailHash, mailType, hourStart);
    if (emailHourEvents.length >= limits.perEmailPerHour) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterFromOldest(emailHourEvents[0].created_at, 60 * 60, nowSeconds),
      };
    }

    const emailDayEvents = db.prepare(`
      SELECT created_at FROM email_send_events
      WHERE email_hash = ? AND mail_type = ? AND created_at > ?
      ORDER BY created_at ASC
    `).all(emailHash, mailType, dayStart);
    if (emailDayEvents.length >= limits.perEmailPerDay) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterFromOldest(emailDayEvents[0].created_at, 24 * 60 * 60, nowSeconds),
      };
    }

    const ipHourEvents = db.prepare(`
      SELECT created_at FROM email_send_events
      WHERE ip_hash = ? AND created_at > ?
      ORDER BY created_at ASC
    `).all(ipHash, hourStart);
    if (ipHourEvents.length >= limits.perIpPerHour) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterFromOldest(ipHourEvents[0].created_at, 60 * 60, nowSeconds),
      };
    }

    db.prepare(`
      INSERT INTO email_send_events (email_hash, ip_hash, mail_type, created_at)
      VALUES (?, ?, ?, ?)
    `).run(emailHash, ipHash, mailType, nowSeconds);

    return { allowed: true, retryAfterSeconds: 0 };
  });

  return checkAndRecord();
}

module.exports = {
  consumeEmailSendLimit,
  ensureEmailRateLimitTable,
  getLimits,
};
