const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');

const router = Router();

function toCamelCaseKey(key) {
  return key.replace(/_([a-z])/g, (_match, char) => char.toUpperCase());
}

function toCamelCase(value) {
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (!value || typeof value !== 'object') return value;
  return Object.entries(value).reduce((acc, [key, item]) => {
    acc[toCamelCaseKey(key)] = toCamelCase(item);
    return acc;
  }, {});
}

function getRequiredCamelField(source, field) {
  const value = source?.[field];
  if (value === undefined || value === null || value === '') {
    const snake = field.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
    if (source && Object.prototype.hasOwnProperty.call(source, snake)) {
      throw new Error(`接口字段已统一为 ${field}，请不要再使用 ${snake}`);
    }
  }
  return value;
}


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

  const ensureColumns = (table, definitions) => {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
    Object.entries(definitions).forEach(([name, definition]) => {
      if (!existing.includes(name)) db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
    });
  };

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      item_id INTEGER,
      title TEXT NOT NULL,
      meta TEXT,
      description TEXT,
      note TEXT,
      status TEXT DEFAULT '正常',
      deleted_at DATETIME,
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

  ensureColumns('user_favorites', {
    item_id: 'INTEGER',
    meta: 'TEXT',
    description: 'TEXT',
    note: 'TEXT',
    status: "TEXT DEFAULT '正常'",
    deleted_at: 'DATETIME',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  });

  ensureColumns('user_history', {
    item_id: 'INTEGER',
    company: 'TEXT',
    action_label: "TEXT DEFAULT '查看'",
    viewed_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  });

  ensureColumns('user_notification_settings', {
    history_enabled: 'INTEGER DEFAULT 1',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  });

  ensureColumns('user_notifications', {
    description: 'TEXT',
    status: "TEXT DEFAULT '未读'",
    tone: "TEXT DEFAULT 'blue'",
    pinned: 'INTEGER DEFAULT 0',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  });
}


function tableExists(name) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name));
}

function getFavoriteLiveStatus(favorite) {
  const originalStatus = favorite.status || '正常';
  const itemId = Number(favorite.item_id);
  if (!favorite.item_type || !itemId) return { status: '需注意', reason: '缺少关联对象' };

  if (favorite.item_type === '公司') {
    if (!tableExists('companies')) return { status: '已失效', reason: '公司数据表不存在' };
    const company = db.prepare('SELECT id, status, verification_status, public_visible FROM companies WHERE id = ?').get(itemId);
    if (!company) return { status: '已失效', reason: '公司已不存在' };
    if (company.status === 'deleted') return { status: '已失效', reason: '公司已删除' };
    if (company.verification_status !== 'verified' || company.public_visible === 0) return { status: '暂未公开', reason: '公司未公开或未认证' };
    return { status: originalStatus === '正常' ? '正常' : originalStatus, reason: '' };
  }

  if (favorite.item_type === '产品') {
    if (!tableExists('products')) return { status: '已失效', reason: '产品数据表不存在' };
    const product = db.prepare(`
      SELECT p.id, p.status, c.verification_status, c.public_visible, c.status as company_status
      FROM products p
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.id = ?
    `).get(itemId);
    if (!product) return { status: '已失效', reason: '产品已不存在' };
    if (product.status === 'deleted' || product.status === 'inactive') return { status: '已失效', reason: '产品已下架或删除' };
    if (product.company_status === 'deleted') return { status: '已失效', reason: '所属公司已删除' };
    if (product.verification_status !== 'verified' || product.public_visible === 0) return { status: '暂未公开', reason: '所属公司未公开或未认证' };
    return { status: originalStatus === '正常' ? '正常' : originalStatus, reason: '' };
  }

  if (favorite.item_type === '文件') {
    if (!tableExists('documents')) return { status: '已失效', reason: '文件数据表不存在' };
    const document = db.prepare(`
      SELECT d.id, d.status, d.review_status, c.verification_status, c.public_visible, c.status as company_status
      FROM documents d
      LEFT JOIN companies c ON c.id = d.company_id
      WHERE d.id = ?
    `).get(itemId);
    if (!document) return { status: '已失效', reason: '文件已不存在' };
    if (document.status === 'deleted' || document.status === 'inactive') return { status: '已失效', reason: '文件已删除或下架' };
    if (document.company_status === 'deleted') return { status: '已失效', reason: '所属公司已删除' };
    if (document.review_status && document.review_status !== 'approved') return { status: '暂未公开', reason: '文件尚未审核公开' };
    if (document.verification_status !== 'verified' || document.public_visible === 0) return { status: '暂未公开', reason: '所属公司未公开或未认证' };
    return { status: originalStatus === '正常' ? '正常' : originalStatus, reason: '' };
  }

  return { status: originalStatus, reason: '' };
}


function getFavoriteContext(favorite) {
  const itemId = Number(favorite.item_id);
  if (!favorite.item_type || !itemId) return {};

  if (favorite.item_type === '公司' && tableExists('companies')) {
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(itemId);
    if (!company) return {};
    return { company_id: company.id, company_name: company.name };
  }

  if (favorite.item_type === '产品' && tableExists('products')) {
    const product = db.prepare(`
      SELECT p.id, p.name, p.company_id, c.name as company_name
      FROM products p
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.id = ?
    `).get(itemId);
    if (!product) return {};
    return {
      company_id: product.company_id,
      company_name: product.company_name,
      product_id: product.id,
      product_name: product.name,
    };
  }

  if (favorite.item_type === '文件' && tableExists('documents')) {
    const document = db.prepare(`
      SELECT d.id, d.title, d.document_type, d.product_id, d.company_id,
             p.name as product_name, c.name as company_name
      FROM documents d
      LEFT JOIN products p ON p.id = d.product_id
      LEFT JOIN companies c ON c.id = d.company_id
      WHERE d.id = ?
    `).get(itemId);
    if (!document) return {};
    return {
      company_id: document.company_id,
      company_name: document.company_name,
      product_id: document.product_id,
      product_name: document.product_name,
      document_type: document.document_type,
    };
  }

  return {};
}

function enrichFavorite(favorite) {
  const live = getFavoriteLiveStatus(favorite);
  const context = getFavoriteContext(favorite);
  return { ...favorite, ...context, status: live.status, status_reason: live.reason };
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
  // 收藏和浏览记录必须反映用户真实操作，不能再自动填充演示数据。
  db.prepare('INSERT OR IGNORE INTO user_notification_settings (user_id, history_enabled) VALUES (?, 1)').run(userId);

  const notificationCount = db.prepare('SELECT COUNT(*) as cnt FROM user_notifications WHERE user_id = ?').get(userId).cnt;
  if (notificationCount === 0) {
    const insertNotification = db.prepare(`
      INSERT INTO user_notifications (user_id, title, description, status, tone, pinned)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    [
      ['企业邀请', 'Guangzhou Safety Equipment Co., Ltd. 邀请你成为企业管理员。', '待处理', 'blue', 1],
      ['文件更新', '你收藏的产品有新资料时会在这里提醒。', '已读', 'gray', 0],
      ['安全提醒', '你的账号刚刚在当前浏览器登录。', '已读', 'green', 0],
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
  const favorites = db.prepare('SELECT * FROM user_favorites WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC, id DESC').all(req.admin.id).map(enrichFavorite);
  const recentlyDeleted = db.prepare('SELECT * FROM user_favorites WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 20').all(req.admin.id).map(enrichFavorite);
  const history = db.prepare('SELECT * FROM user_history WHERE user_id = ? ORDER BY viewed_at DESC, id DESC LIMIT 50').all(req.admin.id);
  const notifications = db.prepare('SELECT * FROM user_notifications WHERE user_id = ? ORDER BY pinned DESC, created_at DESC, id DESC').all(req.admin.id);
  const loginRecords = db.prepare(`
    SELECT created_at, ip_address
    FROM audit_logs
    WHERE admin_id = ? AND action = 'login'
    ORDER BY created_at DESC
    LIMIT 10
  `).all(req.admin.id);
  res.json({ success: true, data: toCamelCase({ user, settings, favorites, recentlyDeleted, history, notifications, loginRecords }) });
});

router.put('/profile', (req, res) => {
  ensurePersonalTables();
  let displayName;
  let realName;
  try {
    displayName = getRequiredCamelField(req.body, 'displayName');
    realName = getRequiredCamelField(req.body, 'realName');
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  const { position, department, bio } = req.body;
  db.prepare(`
    UPDATE users SET display_name = ?, real_name = ?, position = ?, department = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(displayName || null, realName || null, position || null, department || null, bio || null, req.admin.id);
  db.prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.admin.id, 'update_profile', 'user', req.admin.id, JSON.stringify({ displayName }), req.ip);
  const user = db.prepare('SELECT id, email, phone, display_name, real_name, position, department, bio, avatar_path, email_verified, phone_verified FROM users WHERE id = ?').get(req.admin.id);
  res.json({ success: true, data: toCamelCase(user), message: '个人资料已保存' });
});

router.post('/avatar', avatarUpload.single('avatar'), (req, res) => {
  ensurePersonalTables();
  if (!req.file) return res.status(400).json({ success: false, message: '请选择头像文件' });
  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(avatarPath, req.admin.id);
  res.json({ success: true, data: { avatarPath }, message: '头像已上传' });
});

// 添加收藏（基于实体ID）
router.post('/favorites', (req, res) => {
  ensurePersonalTables();
  let itemType;
  let itemId;
  try {
    itemType = getRequiredCamelField(req.body, 'itemType');
    itemId = getRequiredCamelField(req.body, 'itemId');
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  const { title, meta, description } = req.body;

  if (!itemType || !itemId || !title) {
    return res.status(400).json({ success: false, message: '请提供完整的收藏信息' });
  }

  // 检查是否已收藏（包括已删除的）
  const existing = db.prepare('SELECT id, deleted_at FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ?')
    .get(req.admin.id, itemType, Number(itemId));

  if (existing) {
    if (existing.deleted_at) {
      // 如果之前删除过，恢复收藏
      db.prepare('UPDATE user_favorites SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
      const favorite = enrichFavorite(db.prepare('SELECT * FROM user_favorites WHERE id = ?').get(existing.id));
      return res.json({ success: true, data: toCamelCase(favorite), message: '已重新添加到收藏' });
    } else {
      return res.status(409).json({ success: false, message: '该项已在收藏列表中' });
    }
  }

  const result = db.prepare(`
    INSERT INTO user_favorites (user_id, item_type, item_id, title, meta, description, status)
    VALUES (?, ?, ?, ?, ?, ?, '正常')
  `).run(req.admin.id, itemType, Number(itemId), title, meta || '', description || '');

  const favorite = enrichFavorite(db.prepare('SELECT * FROM user_favorites WHERE id = ?').get(result.lastInsertRowid));

  res.json({ success: true, data: toCamelCase(favorite), message: '已添加到收藏' });
});

// 检查收藏状态
router.get('/favorites/check', (req, res) => {
  ensurePersonalTables();
  let itemType;
  let itemId;
  try {
    itemType = getRequiredCamelField(req.query, 'itemType');
    itemId = getRequiredCamelField(req.query, 'itemId');
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (!itemType || !itemId) {
    return res.status(400).json({ success: false, message: '请提供 itemType 和 itemId' });
  }

  const favorite = db.prepare(
    'SELECT id FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ? AND deleted_at IS NULL'
  ).get(req.admin.id, itemType, Number(itemId));

  res.json({
    success: true,
    data: {
      isFavorited: !!favorite,
      favoriteId: favorite?.id || null
    }
  });
});


router.put('/favorites/:id/restore', (req, res) => {
  ensurePersonalTables();
  const favoriteId = Number(req.params.id);
  if (!favoriteId) return res.status(400).json({ success: false, message: '收藏ID无效' });

  const favorite = db.prepare('SELECT * FROM user_favorites WHERE id = ? AND user_id = ?').get(favoriteId, req.admin.id);
  if (!favorite) return res.status(404).json({ success: false, message: '收藏不存在或已被删除' });

  const activeDuplicate = favorite.item_id ? db.prepare(`
    SELECT id FROM user_favorites
    WHERE user_id = ? AND item_type = ? AND item_id = ? AND deleted_at IS NULL AND id != ?
  `).get(req.admin.id, favorite.item_type, favorite.item_id, favorite.id) : null;
  if (activeDuplicate) {
    db.prepare('DELETE FROM user_favorites WHERE id = ? AND user_id = ?').run(favorite.id, req.admin.id);
    const duplicate = enrichFavorite(db.prepare('SELECT * FROM user_favorites WHERE id = ?').get(activeDuplicate.id));
    return res.json({ success: true, data: toCamelCase(duplicate), message: '该项已在收藏中，已合并重复记录' });
  }

  db.prepare('UPDATE user_favorites SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
    .run(favoriteId, req.admin.id);
  const restored = enrichFavorite(db.prepare('SELECT * FROM user_favorites WHERE id = ? AND user_id = ?').get(favoriteId, req.admin.id));
  res.json({ success: true, data: toCamelCase(restored), message: '已恢复收藏' });
});

// 软删除收藏
router.delete('/favorites/:id', (req, res) => {
  ensurePersonalTables();
  const favoriteId = Number(req.params.id);
  if (!favoriteId) return res.status(400).json({ success: false, message: '收藏ID无效' });
  const result = db.prepare('UPDATE user_favorites SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
    .run(favoriteId, req.admin.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: '收藏不存在或已被删除' });
  res.json({ success: true, message: '收藏已取消' });
});

// 永久删除收藏
router.delete('/favorites/:id/permanent', (req, res) => {
  ensurePersonalTables();
  const favoriteId = Number(req.params.id);
  if (!favoriteId) return res.status(400).json({ success: false, message: '收藏ID无效' });
  const result = db.prepare('DELETE FROM user_favorites WHERE id = ? AND user_id = ?').run(favoriteId, req.admin.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: '收藏不存在或已被删除' });
  res.json({ success: true, message: '已永久删除' });
});

router.put('/favorites/:id/note', (req, res) => {
  ensurePersonalTables();
  db.prepare('UPDATE user_favorites SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
    .run(req.body.note || '', req.params.id, req.admin.id);
  res.json({ success: true, message: '备注已保存' });
});

router.put('/history/settings', (req, res) => {
  ensurePersonalTables();
  let historyEnabled;
  try {
    historyEnabled = getRequiredCamelField(req.body, 'historyEnabled');
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  const enabled = historyEnabled ? 1 : 0;
  db.prepare(`
    INSERT INTO user_notification_settings (user_id, history_enabled, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET history_enabled = excluded.history_enabled, updated_at = CURRENT_TIMESTAMP
  `).run(req.admin.id, enabled);
  res.json({ success: true, data: { historyEnabled: Boolean(enabled) }, message: enabled ? '浏览历史已开启' : '浏览历史已关闭' });
});


router.post('/history', (req, res) => {
  ensurePersonalTables();
  let itemType;
  let itemId;
  try {
    itemType = getRequiredCamelField(req.body, 'itemType');
    itemId = getRequiredCamelField(req.body, 'itemId');
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  const title = String(req.body.title || '').trim();
  const company = String(req.body.company || '').trim();
  let requestedActionLabel;
  try {
    requestedActionLabel = getRequiredCamelField(req.body, 'actionLabel');
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  const actionLabel = String(requestedActionLabel || '查看').trim() || '查看';

  if (!itemType || !itemId || !title) {
    return res.status(400).json({ success: false, message: '请提供完整的浏览记录信息' });
  }

  db.prepare('INSERT OR IGNORE INTO user_notification_settings (user_id, history_enabled) VALUES (?, 1)').run(req.admin.id);
  const settings = db.prepare('SELECT history_enabled FROM user_notification_settings WHERE user_id = ?').get(req.admin.id);
  if (settings && Number(settings.history_enabled) === 0) {
    return res.json({ success: true, data: { skipped: true }, message: '浏览历史已关闭' });
  }

  const existing = db.prepare('SELECT id FROM user_history WHERE user_id = ? AND item_type = ? AND item_id = ?')
    .get(req.admin.id, itemType, Number(itemId));

  let historyId = existing?.id;
  if (historyId) {
    db.prepare(`
      UPDATE user_history
      SET title = ?, company = ?, action_label = ?, viewed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(title, company, actionLabel, historyId, req.admin.id);
  } else {
    const result = db.prepare(`
      INSERT INTO user_history (user_id, item_type, item_id, title, company, action_label)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.admin.id, itemType, Number(itemId), title, company, actionLabel);
    historyId = result.lastInsertRowid;
  }

  db.prepare(`
    DELETE FROM user_history
    WHERE user_id = ? AND id NOT IN (
      SELECT id FROM user_history WHERE user_id = ? ORDER BY viewed_at DESC, id DESC LIMIT 200
    )
  `).run(req.admin.id, req.admin.id);

  const history = db.prepare('SELECT * FROM user_history WHERE id = ? AND user_id = ?').get(historyId, req.admin.id);
  res.json({ success: true, data: toCamelCase(history), message: '浏览记录已更新' });
});

router.delete('/history/:id', (req, res) => {
  ensurePersonalTables();
  db.prepare('DELETE FROM user_history WHERE id = ? AND user_id = ?').run(req.params.id, req.admin.id);
  res.json({ success: true, message: '浏览记录已删除' });
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
