# EU-DOC 生产环境部署指南
**版本**: 1.0  
**更新时间**: 2026年6月13日  
**适用环境**: 腾讯云服务器 / Linux

---

## 📋 部署前准备

### 服务器要求
- **操作系统**: Ubuntu 20.04+ / CentOS 7+
- **Node.js**: v18.0.0+
- **Nginx**: 1.18.0+
- **内存**: 最低 1GB，推荐 2GB+
- **磁盘空间**: 最低 5GB

### 本地准备
- [ ] 代码已推送到 GitHub
- [ ] 测试环境验证通过
- [ ] 数据库文件准备好
- [ ] SSL 证书（如使用 HTTPS）

---

## 🚀 部署步骤

### 1. 连接服务器

```bash
# SSH 连接（替换为你的服务器 IP）
ssh root@your-server-ip

# 或使用其他用户
ssh username@your-server-ip
```

### 2. 安装必要软件

#### 2.1 安装 Node.js (使用 NodeSource)
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v  # 应显示 v18.x.x
npm -v   # 应显示 9.x.x
```

#### 2.2 安装 Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证
sudo nginx -v
```

#### 2.3 安装 PM2（Node.js 进程管理器）
```bash
sudo npm install -g pm2

# 设置开机自启
pm2 startup
# 按照提示执行命令
```

#### 2.4 安装 Git（如果未安装）
```bash
# Ubuntu/Debian
sudo apt install -y git

# CentOS/RHEL
sudo yum install -y git
```

---

### 3. 部署应用代码

#### 3.1 创建应用目录
```bash
# 创建网站根目录
sudo mkdir -p /var/www
cd /var/www

# 克隆代码
sudo git clone https://github.com/ChristmasLdw/eu-doc.git
cd eu-doc

# 设置权限（替换 www-data 为你的用户）
sudo chown -R www-data:www-data /var/www/eu-doc
# 或
sudo chown -R $USER:$USER /var/www/eu-doc
```

#### 3.2 安装前端依赖
```bash
cd /var/www/eu-doc
npm install
```

#### 3.3 安装后端依赖
```bash
cd /var/www/eu-doc/server
npm install
```

---

### 4. 配置环境变量

#### 4.1 创建 .env 文件
```bash
cd /var/www/eu-doc/server
nano .env
```

#### 4.2 填入配置内容
```env
# 生产环境配置
NODE_ENV=production
PORT=3007

# JWT 密钥（使用强密码！）
# 生成方法: openssl rand -base64 32
JWT_SECRET=your-super-secret-key-change-this-in-production

# 数据库路径
DATABASE_PATH=./data/eu-doc.db

# CORS 配置（替换为你的域名）
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# 日志级别
LOG_LEVEL=info

# 文件上传限制（10MB）
MAX_FILE_SIZE=10485760
```

**安全提示**：
```bash
# 生成安全的 JWT_SECRET
openssl rand -base64 32

# 设置文件权限（仅所有者可读写）
chmod 600 .env
```

---

### 5. 构建前端

```bash
cd /var/www/eu-doc
npm run build

# 构建产物在 dist/ 目录
ls -la dist/
```

---

### 6. 配置 Nginx

#### 6.1 创建站点配置文件
```bash
sudo nano /etc/nginx/sites-available/eu-doc
```

#### 6.2 粘贴配置内容

**HTTP 配置**（测试用）：
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 日志
    access_log /var/log/nginx/eu-doc-access.log;
    error_log /var/log/nginx/eu-doc-error.log;

    # 前端静态文件
    location /eu-doc/ {
        alias /var/www/eu-doc/dist/;
        try_files $uri $uri/ /eu-doc/index.html;
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API
    location /eu-doc/api/ {
        proxy_pass http://localhost:3007/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件（缩略图、上传文件）
    location /eu-doc/certificates/ {
        proxy_pass http://localhost:3007/certificates/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # 缓存设置
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /eu-doc/uploads/ {
        proxy_pass http://localhost:3007/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # 文件上传大小限制
    client_max_body_size 10M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
}
```

**HTTPS 配置**（生产推荐）：
```nginx
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 证书（使用 Let's Encrypt 或购买的证书）
    ssl_certificate /etc/nginx/ssl/yourdomain.com.crt;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS (可选，启用后浏览器会强制使用 HTTPS)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 日志
    access_log /var/log/nginx/eu-doc-access.log;
    error_log /var/log/nginx/eu-doc-error.log;

    # 其他配置同 HTTP 版本...
    location /eu-doc/ {
        alias /var/www/eu-doc/dist/;
        try_files $uri $uri/ /eu-doc/index.html;
    }
    
    location /eu-doc/api/ {
        proxy_pass http://localhost:3007/api/;
        # ... 其他配置
    }
    
    # ... 其他 location 块
}
```

#### 6.3 启用站点配置
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/eu-doc /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 应该看到：
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# 重启 Nginx
sudo systemctl reload nginx
```

---

### 7. 准备数据库和上传目录

#### 7.1 确保数据库文件存在
```bash
cd /var/www/eu-doc/server
ls -la data/eu-doc.db

# 如果文件不存在，从开发环境复制
# scp user@dev-server:/path/to/eu-doc.db ./data/
```

#### 7.2 确保上传目录存在
```bash
cd /var/www/eu-doc/server
ls -la uploads/certificates/thumbnails/

# 如果需要从开发环境复制
# scp -r user@dev-server:/path/to/uploads ./
```

#### 7.3 设置目录权限
```bash
cd /var/www/eu-doc/server

# 数据目录权限
chmod 755 data
chmod 644 data/eu-doc.db

# 上传目录权限
chmod -R 755 uploads
chmod -R 644 uploads/certificates/thumbnails/*.png
```

---

### 8. 启动后端服务

#### 8.1 使用 PM2 启动
```bash
cd /var/www/eu-doc/server

# 启动应用
pm2 start index.cjs --name eu-doc-api --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs eu-doc-api

# 保存配置（重启后自动恢复）
pm2 save
```

#### 8.2 验证服务运行
```bash
# 检查端口监听
netstat -tlnp | grep 3007
# 或
ss -tlnp | grep 3007

# 测试 API
curl http://localhost:3007/api/health
# 应返回: {"success":true,"message":"EU-DOC API 服务运行中",...}
```

---

### 9. 测试部署

#### 9.1 测试前端访问
```bash
# 在服务器上
curl -I http://yourdomain.com/eu-doc/

# 应返回 HTTP 200
```

#### 9.2 测试 API
```bash
curl http://yourdomain.com/eu-doc/api/health
```

#### 9.3 测试缩略图
```bash
curl -I http://yourdomain.com/eu-doc/certificates/thumbnails/20_100_52_6160-01.png
# 应返回 HTTP 200
```

#### 9.4 浏览器测试
打开浏览器访问：
- 前端首页：`http://yourdomain.com/eu-doc/`
- 测试功能：
  - [ ] 搜索功能
  - [ ] 语言切换
  - [ ] 主题切换
  - [ ] 缩略图显示
  - [ ] 证书详情
  - [ ] 用户登录

---

## 🔒 安全配置

### 1. 配置防火墙

```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### 2. 配置 SSL 证书（推荐使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期（Certbot 会自动添加 cron 任务）
sudo certbot renew --dry-run
```

### 3. 定期备份

#### 3.1 创建备份脚本
```bash
sudo nano /usr/local/bin/backup-eu-doc.sh
```

```bash
#!/bin/bash
# EU-DOC 数据库备份脚本

BACKUP_DIR="/var/backups/eu-doc"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/var/www/eu-doc/server/data/eu-doc.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp $DB_PATH $BACKUP_DIR/eu-doc_$DATE.db

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/eu-doc/server/uploads

# 删除 30 天前的备份
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: eu-doc_$DATE.db"
```

```bash
# 设置执行权限
sudo chmod +x /usr/local/bin/backup-eu-doc.sh

# 添加到 crontab（每天凌晨 2 点备份）
sudo crontab -e
# 添加：
0 2 * * * /usr/local/bin/backup-eu-doc.sh
```

---

## 📊 监控和维护

### 1. 查看应用日志

```bash
# PM2 日志
pm2 logs eu-doc-api
pm2 logs eu-doc-api --lines 100

# Nginx 日志
sudo tail -f /var/log/nginx/eu-doc-access.log
sudo tail -f /var/log/nginx/eu-doc-error.log
```

### 2. 性能监控

```bash
# 实时监控
pm2 monit

# 查看资源使用
pm2 status
htop  # 或 top
```

### 3. 常用维护命令

```bash
# 重启应用
pm2 restart eu-doc-api

# 重新加载（0 downtime）
pm2 reload eu-doc-api

# 停止应用
pm2 stop eu-doc-api

# 删除应用
pm2 delete eu-doc-api

# 重启 Nginx
sudo systemctl reload nginx
sudo systemctl restart nginx

# 查看系统资源
df -h          # 磁盘空间
free -h        # 内存使用
netstat -tlnp  # 端口监听
```

---

## 🔄 更新部署

### 方式1: Git 拉取更新

```bash
cd /var/www/eu-doc

# 拉取最新代码
git pull origin main

# 安装新依赖（如果有）
npm install
cd server && npm install

# 重新构建前端
cd /var/www/eu-doc
npm run build

# 重启后端
pm2 restart eu-doc-api
```

### 方式2: 零停机更新

```bash
cd /var/www/eu-doc

# 拉取代码
git pull origin main
npm install
cd server && npm install

# 构建前端
cd /var/www/eu-doc
npm run build

# 零停机重启
pm2 reload eu-doc-api
```

---

## ❓ 故障排查

### 问题1: 502 Bad Gateway

**可能原因**:
- 后端服务未启动
- 端口 3007 被占用

**解决方法**:
```bash
# 检查后端服务
pm2 status
pm2 logs eu-doc-api

# 检查端口
netstat -tlnp | grep 3007

# 重启服务
pm2 restart eu-doc-api
```

### 问题2: 404 Not Found（前端页面）

**可能原因**:
- Nginx 配置错误
- 静态文件路径不对

**解决方法**:
```bash
# 检查静态文件
ls -la /var/www/eu-doc/dist/

# 测试 Nginx 配置
sudo nginx -t

# 检查 Nginx 日志
sudo tail -50 /var/log/nginx/eu-doc-error.log
```

### 问题3: 缩略图加载失败

**可能原因**:
- 文件不存在
- 权限问题
- Nginx 代理配置错误

**解决方法**:
```bash
# 检查文件
ls -la /var/www/eu-doc/server/uploads/certificates/thumbnails/

# 检查权限
chmod -R 755 /var/www/eu-doc/server/uploads

# 测试直接访问
curl -I http://localhost:3007/certificates/thumbnails/20_100_52_6160-01.png
```

### 问题4: 数据库连接失败

**可能原因**:
- 数据库文件不存在
- 权限问题
- 路径配置错误

**解决方法**:
```bash
# 检查数据库文件
ls -la /var/www/eu-doc/server/data/eu-doc.db

# 检查权限
chmod 644 /var/www/eu-doc/server/data/eu-doc.db

# 查看日志
pm2 logs eu-doc-api --lines 50
```

---

## 📝 部署检查清单

### 部署前
- [ ] 代码已推送到 GitHub
- [ ] 本地测试通过
- [ ] 环境变量已准备
- [ ] SSL 证书已准备（如使用 HTTPS）
- [ ] 数据库文件已备份

### 部署中
- [ ] 服务器软件已安装（Node.js, Nginx, PM2）
- [ ] 代码已克隆
- [ ] 依赖已安装
- [ ] 环境变量已配置
- [ ] 前端已构建
- [ ] Nginx 已配置
- [ ] 后端服务已启动

### 部署后
- [ ] 前端页面可访问
- [ ] API 接口正常
- [ ] 缩略图正常加载
- [ ] 语言切换正常
- [ ] 主题切换正常
- [ ] 搜索功能正常
- [ ] 用户登录正常
- [ ] 防火墙已配置
- [ ] SSL 证书已配置（如使用）
- [ ] 备份脚本已配置
- [ ] PM2 已保存配置

---

## 📞 技术支持

如遇到问题，请检查：
1. 服务器日志：`pm2 logs eu-doc-api`
2. Nginx 日志：`/var/log/nginx/eu-doc-error.log`
3. 浏览器控制台：查看前端错误

常见问题参考故障排查章节。

---

**祝部署顺利！** 🎉
