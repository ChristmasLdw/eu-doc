# EU-DOC v2.5.0 部署指南

## 概述

本指南说明如何将 eu-doc v2.5.0 部署到生产环境。

---

## 环境要求

### 服务器环境
- **Node.js**: v18.x 或更高
- **操作系统**: Linux / macOS / Windows
- **内存**: 至少 512MB
- **磁盘**: 至少 2GB 可用空间

### 依赖服务
- **数据库**: SQLite（内置，无需额外安装）
- **Web 服务器**: Nginx / Apache（可选，用于反向代理）
- **SMTP 服务**: 用于邮件发送（邮箱验证、密码重置）

---

## 部署步骤

### 1. 克隆代码

```bash
git clone <your-repo-url> eu-doc
cd eu-doc
```

### 2. 安装依赖

**前端依赖**:
```bash
npm install
```

**后端依赖**:
```bash
cd server
npm install
cd ..
```

### 3. 配置环境变量

**前端配置** (.env.production):
```bash
cp .env.example .env.production

# 编辑 .env.production
VITE_APP_BASE_PATH=/eu-doc
VITE_API_BASE_URL=https://your-domain.com/api
```

**后端配置** (server/.env):
```bash
cd server
cp .env.example .env

# 编辑 server/.env
PORT=3007
DATABASE_PATH=./data/eu-doc.db
UPLOAD_DIR=./uploads
PUBLIC_FILE_BASE_URL=https://your-domain.com
JWT_SECRET=<生成一个强随机密钥>
APP_ENV=production

# SMTP 配置（必填）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=EU-DOC <noreply@your-domain.com>

# 前端地址（用于邮件链接）
FRONTEND_URL=https://your-domain.com/eu-doc
```

### 4. 构建前端

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 5. 初始化数据库

```bash
cd server
node index.cjs
# 第一次运行会自动创建数据库和默认管理员
# 默认账号：admin / admin123
# Ctrl+C 停止后继续下一步
```

### 6. 配置 Web 服务器

**Nginx 配置示例**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location /eu-doc/ {
        alias /path/to/eu-doc/dist/;
        try_files $uri $uri/ /eu-doc/index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 上传文件访问
    location /uploads/ {
        alias /path/to/eu-doc/server/uploads/;
    }

    location /logos/ {
        alias /path/to/eu-doc/server/public/logos/;
    }
}
```

### 7. 使用 PM2 管理后端进程

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd server
pm2 start index.cjs --name eu-doc-api

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs eu-doc-api

# 重启服务
pm2 restart eu-doc-api
```

---

## 安全配置

### 1. 修改默认管理员密码

首次部署后，立即登录修改默认管理员密码：
- 访问 `/admin/login`
- 使用 `admin / admin123` 登录
- 进入个人设置修改密码

### 2. 生成强 JWT 密钥

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的密钥填入 `server/.env` 的 `JWT_SECRET`。

### 3. 配置 HTTPS

建议使用 Let's Encrypt 免费证书：
```bash
# 使用 Certbot
sudo certbot --nginx -d your-domain.com
```

### 4. 文件上传权限

```bash
cd server
chmod 755 uploads/
chmod 755 public/logos/
```

---

## 数据备份

### 自动备份脚本

创建 `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份数据库
cp server/data/eu-doc.db "$BACKUP_DIR/eu-doc-$DATE.db"

# 备份上传文件
tar -czf "$BACKUP_DIR/uploads-$DATE.tar.gz" server/uploads/

# 保留最近 7 天的备份
find "$BACKUP_DIR" -name "eu-doc-*.db" -mtime +7 -delete
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

设置 cron 定时任务（每天凌晨 2 点）:
```bash
crontab -e
0 2 * * * /path/to/backup.sh >> /var/log/eu-doc-backup.log 2>&1
```

---

## 监控和日志

### 查看后端日志

```bash
# PM2 日志
pm2 logs eu-doc-api

# 实时日志
pm2 logs eu-doc-api --lines 100
```

### 查看 Nginx 日志

```bash
# 访问日志
tail -f /var/log/nginx/access.log

# 错误日志
tail -f /var/log/nginx/error.log
```

---

## 常见问题

### 1. 前端访问 404

检查 Nginx 配置的 `alias` 路径是否正确，确保指向 `dist/` 目录。

### 2. API 请求失败

- 检查后端是否运行：`pm2 status`
- 检查端口是否正确：`netstat -nltp | grep 3007`
- 检查防火墙规则

### 3. 文件上传失败

- 检查上传目录权限：`ls -la server/uploads/`
- 检查磁盘空间：`df -h`

### 4. 邮件发送失败

- 检查 SMTP 配置是否正确
- 测试 SMTP 连接
- 查看后端日志错误信息

---

## 性能优化

### 1. 启用 Gzip 压缩

Nginx 配置：
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 2. 配置缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 限流配置

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20;
    # ... 其他配置
}
```

---

## 版本升级

### 升级步骤

1. **备份数据**：执行备份脚本
2. **拉取新代码**：`git pull origin main`
3. **安装依赖**：`npm install && cd server && npm install`
4. **构建前端**：`npm run build`
5. **重启后端**：`pm2 restart eu-doc-api`
6. **验证功能**：测试关键功能是否正常

---

## 支持

如有问题，请查看：
- 项目文档：`/docs`
- 工作日志：`WORK_LOG.md`
- GitHub Issues

---

**部署完成后，记得修改默认管理员密码并配置 SMTP！**
