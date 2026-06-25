const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');

const router = Router();

function ensurePersonalTables() {
  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((col) => col.name);
  const addColumn = (name, definition) => {
    if (!userColumns.includes(name)) db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${definition}`).run();
  };

  addColumn('real_name', 'TEXT');
  addColumn('position', 'TEXT');
  addColumn('department', 'TEXT');
  addColumn('bio', 'TEXT');
  addColumn('avatar_path', 'TEXT');
  addColumn('user_code', 'TEXT');
  addColumn('session_version', 'INTEGER DEFAULT 0');

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      meta TEXT,
      description TEXT,
      note TEXT,
      status TEXT DEFAULT '正常',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT,
      action_label TEXT DEFAULT '查看',
      viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_notification_settings (
      user_id INTEGER PRIMARY KEY,
      history_enabled INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT '未读',
      tone TEXT DEFAULT 'blue',
      pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

function ensureUserCode(userId) {
  const code = `U-${String(userId).padStart(6, '0')}`;
  db.prepare('UPDATE users SET user_code = COALESCE(user_code, ?) WHERE id = ?').run(code, userId);
  return code;
}

function requireCurrentSession(req, res, next) {
  ensurePersonalTables();
  const user = db.prepare('SELECT session_version FROM users WHERE id = ?').get(req.admin.id);
  if (!user) return res.status(401).json({ success: false, message: '用户不存在，请重新登录' });
  if ((user.session_version || 0) !== (req.admin.session_version || 0)) {
    return res.status(401).json({ success: false, message: '登录状态已失效，请重新登录' });
  }
  next();
}

function seedPersonalData(userId) {
  const favoriteCount = db.prepare('SELECT COUNT(*) as cnt FROM user_favorites WHERE user_id = ?').get(userId).cnt;
  if (favoriteCount === 0) {
    const insertFavorite = db.prepare(`
      INSERT INTO user_favorites (user_id, item_type, title, meta, description, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['产品', 'Equestrian Helmet F20', 'Guangzhou Safety Equipment Co., Ltd.', '资质证书、DoC、说明书已收录', '客户 A 需要核对证书', '正常'],
      ['公司', 'Guangzhou Safety Equipment Co., Ltd.', '公司主页', '常用供应商资料', '后续关注产品更新', '正常'],
      ['文件', 'CE Certificate - F20', '资质证书', '有效期至 2031-01-27', '投标资料可能会用到', '正常'],
      ['文件', 'Old User Manual', '使用说明书', '该文件可能已被替换', '需要确认是否最新版本', '需注意'],
    ].forEach((item) => insertFavorite.run(userId, ...item));
  }

  const historyCount = db.prepare('SELECT COUNT(*) as cnt FROM user_history WHERE user_id = ?').get(userId).cnt;
  if (historyCount === 0) {
    const insertHistory = db.prepare(`
      INSERT INTO user_history (user_id, item_type, title, company, action_label)
      VALUES (?, ?, ?, ?, ?)
    `);
    [
      ['产品', 'Equestrian Helmet F20', 'Guangzhou Safety Equipment Co., Ltd.', '继续查看'],
      ['文件', 'Declaration of Conformity', 'Guangzhou Safety Equipment Co., Ltd.', '打开文件'],
      ['公司', 'EU Riding Gear GmbH', '-', '查看公司'],
      ['文件', 'CE Certificate - F20', 'Guangzhou Safety Equipment Co., Ltd.', '重新打开'],
    ].forEach((item) => insertHistory.run(userId, ...item));
  }

  db.prepare('INSERT OR IGNORE INTO user_notification_settings (user_id, history_enabled) VALUES (?, 1)').run(userId);

  const notificationCount = db.prepare('SELECT COUNT(*) as cnt FROM user_notifications WHERE user_id = ?').get(userId).cnt;
  if (notificationCount === 0) {
    const insertNotification = db.prepare(`
      INSERT INTO user_notifications (user_id, title, description, status, tone, pinned)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    [
      ['企业邀请', 'Guangzhou Safety Equipment Co., Ltd. 邀请你成为企业管理员。', '待处理', 'blue', 1],
      ['文件更新', '你收藏的产品 Equestrian Helmet F20 有新的 DoC 声明文件。', '未读', 'orange', 1],
      ['举报处理', '你提交的“产品型号错误”举报已被平台标记处理。', '未读', 'green', 0],
      ['安全提醒', '你的账号刚刚在当前浏览器登录。', '已读', 'green', 0],
      ['系统公告', '后台 v2 正在完善中，部分按钮暂未接入真实功能。', '已读', 'gray', 0],
    ].forEach((item) => insertNotification.run(userId, ...item));
  }
}

const avatarDir = path.join(__dirname, '../uploads/avatars');
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(avatarDir, { recursive: true });
      cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `user-${req.admin.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('只支持 JPG、PNG、WebP 头像'));
  },
});

router.use(authMiddleware, requireCurrentSession);

router.get('/overview', (req, res) => {
  ensurePersonalTables();
  seedPersonalData(req.admin.id);
  ensureUserCode(req.admin.id);
  const user = db.prepare(`
    SELECT id, email, phone, display_name, real_name, position, department, bio, avatar_path, user_code,
      email_verified, phone_verified, platform_role, status, created_at
    FROM users WHERE id = ?
  `).get(req.admin.id);
  const settings = db.prepare('SELECT history_enabled FROM user_notification_settings WHERE user_id = ?').get(req.admin.id);
  const favorites = db.prepare('SELECT * FROM user_favorites WHERE user_id = ? ORDER BY updated_at DESC, id DESC').all(req.admin.id);
  const history = db.prepare('SELECT * FROM user_history WHERE user_id = ? ORDER BY viewed_at DESC, id DESC LIMIT 50').all(req.admin.id);
  const notifications = db.prepare('SELECT * FROM user_notifications WHERE user_id = ? ORDER BY pinned DESC, created_at DESC, id DESC').all(req.admin.id);
  const loginRecords = db.prepare(`
    SELECT created_at, ip_address
    FROM audit_logs
    WHERE admin_id = ? AND action = 'login'
    ORDER BY created_at DESC
    LIMIT 10
  `).all(req.admin.id);
  res.json({ success: true, data: { user, settings, favorites, history, notifications, loginRecords } });
});

router.put('/profile', (req, res) => {
  ensurePersonalTables();
  const { display_name, real_name, position, department, bio } = req.body;
  db.prepare(`
    UPDATE users SET display_name = ?, real_name = ?, position = ?, department = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(display_name || null, real_name || null, position || null, department || null, bio || null, req.admin.id);
  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.admin.id, 'update_profile', 'user', req.admin.id, JSON.stringify({ display_name }), req.ip);
  const user = db.prepare('SELECT id, email, phone, display_name, real_name, position, department, bio, avatar_path, email_verified, phone_verified FROM users WHERE id = ?').get(req.admin.id);
  res.json({ success: true, data: user, message: '个人资料已保存' });
});

router.post('/avatar', avatarUpload.single('avatar'), (req, res) => {
  ensurePersonalTables();
  if (!req.file) return res.status(400).json({ success: false, message: '请选择头像文件' });
  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(avatarPath, req.admin.id);
  res.json({ success: true, data: { avatar_path: avatarPath }, message: '头像已上传' });
});

router.delete('/favorites/:id', (req, res) => {
  ensurePersonalTables();
  db.prepare('DELETE FROM user_favorites WHERE id = ? AND user_id = ?').run(req.params.id, req.admin.id);
  res.json({ success: true, message: '收藏已取消' });
});

router.put('/favorites/:id/note', (req, res) => {
  ensurePersonalTables();
  db.prepare('UPDATE user_favorites SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
    .run(req.body.note || '', req.params.id, req.admin.id);
  res.json({ success: true, message: '备注已保存' });
});

router.put('/history/settings', (req, res) => {
  ensurePersonalTables();
  const enabled = req.body.history_enabled ? 1 : 0;
  db.prepare(`
    INSERT INTO user_notification_settings (user_id, history_enabled, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET history_enabled = excluded.history_enabled, updated_at = CURRENT_TIMESTAMP
  `).run(req.admin.id, enabled);
  res.json({ success: true, data: { history_enabled: enabled }, message: enabled ? '浏览历史已开启' : '浏览历史已关闭' });
});

router.delete('/history', (req, res) => {
  ensurePersonalTables();
  db.prepare('DELETE FROM user_history WHERE user_id = ?').run(req.admin.id);
  res.json({ success: true, message: '浏览历史已清空' });
});

router.put('/notifications/read-all', (req, res) => {
  ensurePersonalTables();
  db.prepare("UPDATE user_notifications SET status = '已读' WHERE user_id = ? AND status != '待处理'").run(req.admin.id);
  res.json({ success: true, message: '已全部标记为已读' });
});

router.put('/notifications/:id/read', (req, res) => {
  ensurePersonalTables();
  db.prepare("UPDATE user_notifications SET status = '已读' WHERE id = ? AND user_id = ? AND status != '待处理'")
    .run(req.params.id, req.admin.id);
  res.json({ success: true, message: '通知已标记为已读' });
});

router.put('/sessions/revoke-others', (req, res) => {
  ensurePersonalTables();
  db.prepare('UPDATE users SET session_version = COALESCE(session_version, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.admin.id);
  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(req.admin.id, 'revoke_other_sessions', 'user', req.admin.id, req.ip);
  res.json({ success: true, message: '其他设备已退出，请重新登录当前设备以刷新安全状态' });
});

module.exports = router;
