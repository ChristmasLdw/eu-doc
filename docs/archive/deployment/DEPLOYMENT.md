# EU-DOC 部署指南

## 环境要求

### 服务器配置
- **CPU**: 4核
- **内存**: 8GB
- **存储**: 100GB SSD
- **带宽**: 5Mbps+

### 软件环境
- **操作系统**: Ubuntu 22.04 LTS / CentOS 8+
- **Node.js**: v20.11.1+ (建议使用 v22+)
- **Nginx**: 1.18+
- **SSL证书**: Let's Encrypt 或购买的证书

---

## 部署步骤

### 1. 服务器准备

#### 安装 Node.js
```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

#### 安装 Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

#### 安装 PM2（进程管理）
```bash
npm install -g pm2
```

---

### 2. 项目部署

#### 克隆代码
```bash
cd /var/www
git clone [你的仓库地址] eu-doc
cd eu-doc
```

#### 安装依赖
```bash
# 前端依赖
npm install

# 后端依赖
cd server
npm install
cd ..
```

#### 构建前端
```bash
npm run build
```

#### 配置环境变量
```bash
# 创建后端 .env 文件
cat > server/.env << EOF
PORT=3007
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

---

### 3. Nginx 配置

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/eu-doc
```

写入以下配置：

```nginx
server {
    listen 80;
    server_name christmasldw.com www.christmasldw.com;

    # 强制跳转 HTTPS（配置 SSL 后启用）
    # return 301 https://$server_name$request_uri;

    root /var/www/eu-doc/dist;
    index index.html;

    # 前端路由（所有路由都指向 index.html）
    location /eu-doc {
        alias /var/www/eu-doc/dist;
        try_files $uri $uri/ /eu-doc/index.html;
    }

    # API 代理到后端
    location /eu-doc/api {
        proxy_pass http://localhost:3007/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 上传文件大小限制
        client_max_body_size 10M;
    }

    # 上传文件访问
    location /eu-doc/uploads {
        alias /var/www/eu-doc/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/eu-doc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 4. SSL 证书配置（可选但推荐）

#### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 自动配置 SSL
sudo certbot --nginx -d christmasldw.com -d www.christmasldw.com

# 自动续期（Certbot 会自动添加 cron 任务）
sudo certbot renew --dry-run
```

---

### 5. 启动后端服务

使用 PM2 管理后端进程：

```bash
cd /var/www/eu-doc
pm2 start server/index.cjs --name eu-doc-server

# 设置开机自启
pm2 startup
pm2 save
```

#### PM2 常用命令
```bash
pm2 list              # 查看进程列表
pm2 logs eu-doc-server  # 查看日志
pm2 restart eu-doc-server  # 重启
pm2 stop eu-doc-server     # 停止
pm2 delete eu-doc-server   # 删除
```

---

### 6. 数据库初始化

后端首次启动会自动创建数据库和默认管理员账户：

- **默认账户**: admin
- **默认密码**: admin123

**⚠️ 请立即登录并修改密码！**

---

### 7. 防火墙配置

```bash
# 开放 HTTP/HTTPS 端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 更新部署

### 前端更新
```bash
cd /var/www/eu-doc
git pull
npm install
npm run build
```

### 后端更新
```bash
cd /var/www/eu-doc
git pull
cd server
npm install
cd ..
pm2 restart eu-doc-server
```

---

## 监控与维护

### 日志查看
```bash
# PM2 日志
pm2 logs eu-doc-server

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 数据库备份
```bash
# 创建备份脚本
cat > /var/www/eu-doc/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/eu-doc"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /var/www/eu-doc/server/data/eu-doc.db $BACKUP_DIR/eu-doc_$DATE.db

# 保留最近 30 天的备份
find $BACKUP_DIR -name "eu-doc_*.db" -mtime +30 -delete

echo "备份完成: $BACKUP_DIR/eu-doc_$DATE.db"
EOF

chmod +x /var/www/eu-doc/backup.sh

# 添加定时任务（每天凌晨 2 点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/eu-doc/backup.sh") | crontab -
```

### 性能监控
```bash
# 安装监控工具
pm2 install pm2-server-monit

# 查看性能
pm2 monit
```

---

## 故障排查

### 后端无法启动
```bash
# 检查端口占用
sudo lsof -i :3007

# 检查日志
pm2 logs eu-doc-server --lines 100
```

### 前端无法访问
```bash
# 检查 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 检查权限
sudo chown -R www-data:www-data /var/www/eu-doc/dist
```

### 数据库问题
```bash
# 检查数据库文件
ls -lh /var/www/eu-doc/server/data/

# 重建数据库（会清空所有数据！）
rm /var/www/eu-doc/server/data/eu-doc.db
pm2 restart eu-doc-server
```

---

## 性能优化

### 启用 HTTP/2
在 Nginx 配置中添加：
```nginx
listen 443 ssl http2;
```

### 启用缓存
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 数据库优化（迁移到 PostgreSQL）
当用户数超过 1000 时，建议迁移到 PostgreSQL：

```bash
# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# 后续需要修改后端代码，使用 pg 驱动替换 better-sqlite3
```

---

## 安全建议

1. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **启用 fail2ban 防暴力破解**
   ```bash
   sudo apt install fail2ban -y
   ```

3. **限制上传文件类型**
   在后端代码中添加文件类型检查

4. **定期备份**
   除了数据库，还要备份上传的文件

5. **配置 HTTPS**
   强制所有流量使用 HTTPS

---

## 联系支持

如遇部署问题，请联系：
- 邮箱：[待填写]
- 技术文档：[待填写]
