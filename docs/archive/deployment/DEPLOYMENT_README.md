# EU-DOC 快速部署指南

本指南提供了三个自动化脚本，帮助你快速完成部署、SSL配置和功能测试。

---

## 📋 前提条件

1. **服务器准备**
   - 腾讯云服务器（Ubuntu 20.04+ 或 CentOS 7+）
   - 至少 1GB 内存，5GB 磁盘空间
   - 可以通过SSH访问

2. **域名配置**（如需HTTPS）
   - 域名已购买
   - DNS已解析到服务器IP

3. **本地环境**
   - 已安装 `ssh`、`scp` 命令
   - 可以访问服务器的SSH密钥或密码

---

## 🚀 快速开始

### 步骤1: 部署应用（必做）

```bash
# 在项目根目录执行
./deploy.sh [服务器IP] [SSH用户] [域名(可选)]

# 示例1: 使用IP访问
./deploy.sh 1.2.3.4 root

# 示例2: 使用域名访问
./deploy.sh 1.2.3.4 root yourdomain.com
```

**脚本会自动完成：**
- ✅ 安装必要软件（Node.js、Nginx、PM2、Git）
- ✅ 克隆代码到服务器
- ✅ 安装前端和后端依赖
- ✅ 配置环境变量（自动生成安全的JWT密钥）
- ✅ 构建前端代码
- ✅ 上传数据库和缩略图
- ✅ 配置Nginx反向代理
- ✅ 启动后端服务（PM2管理）
- ✅ 执行基本测试

**预计耗时：** 5-10分钟（取决于网络速度）

---

### 步骤2: 配置SSL证书（推荐）

```bash
# 前提：域名DNS已解析到服务器IP
./ssl-setup.sh [服务器IP] [SSH用户] [域名] [邮箱(可选)]

# 示例
./ssl-setup.sh 1.2.3.4 root yourdomain.com admin@yourdomain.com
```

**脚本会自动完成：**
- ✅ 安装 Certbot
- ✅ 检查域名DNS解析
- ✅ 申请 Let's Encrypt 免费SSL证书
- ✅ 配置Nginx HTTPS
- ✅ 设置自动续期（90天有效期，自动续期）

**预计耗时：** 2-3分钟

**注意：** 运行前必须确保域名已正确解析到服务器IP

---

### 步骤3: 功能测试（必做）

```bash
# 测试HTTP部署
./test-deployment.sh http://yourdomain.com

# 或测试HTTPS部署
./test-deployment.sh https://yourdomain.com

# 或直接使用IP
./test-deployment.sh http://1.2.3.4
```

**测试项目包括：**
- ✅ 前端页面访问
- ✅ API接口响应
- ✅ JSON格式验证
- ✅ 缩略图加载
- ✅ 静态资源加载
- ✅ CORS配置
- ✅ 响应时间性能

**预计耗时：** 30秒

---

## 📊 完整流程示例

假设：
- 服务器IP: `123.45.67.89`
- SSH用户: `root`
- 域名: `eudoc.example.com`
- 邮箱: `admin@example.com`

```bash
# 1. 部署应用
./deploy.sh 123.45.67.89 root eudoc.example.com

# 2. 配置SSL（需要先配置DNS解析）
./ssl-setup.sh 123.45.67.89 root eudoc.example.com admin@example.com

# 3. 功能测试
./test-deployment.sh https://eudoc.example.com
```

部署完成后访问：`https://eudoc.example.com/eu-doc/`

---

## 🔧 手动部署（不推荐）

如果自动脚本遇到问题，可以参考详细的手动部署文档：
- 查看 `docs/DEPLOYMENT_GUIDE.md`

---

## ⚠️ 常见问题

### 1. SSH连接失败
```bash
# 检查SSH配置
ssh root@your-server-ip

# 如果需要指定密钥
ssh -i ~/.ssh/your-key.pem root@your-server-ip
```

### 2. 域名解析检查
```bash
# 检查域名是否解析到正确的IP
dig +short yourdomain.com
nslookup yourdomain.com
```

### 3. 查看服务器日志
```bash
# 连接到服务器
ssh root@your-server-ip

# 查看后端日志
pm2 logs eu-doc-api

# 查看Nginx日志
sudo tail -f /var/log/nginx/eu-doc-error.log

# 查看服务状态
pm2 status
sudo systemctl status nginx
```

### 4. 重启服务
```bash
# 连接到服务器后
pm2 restart eu-doc-api
sudo systemctl reload nginx
```

### 5. 防火墙配置
```bash
# Ubuntu
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 📱 浏览器测试清单

部署完成后，在浏览器中手动测试以下功能：

- [ ] 访问前端首页
- [ ] 切换语言（中文/English）
- [ ] 切换主题（亮色/暗色）
- [ ] 搜索证书
- [ ] 查看证书详情
- [ ] 查看缩略图是否正常加载
- [ ] 注册新用户
- [ ] 登录功能
- [ ] 查看公司信息页面
- [ ] 查看用户协议

---

## 🎯 后续优化建议

### 1. 配置数据库备份
```bash
ssh root@your-server-ip
sudo nano /usr/local/bin/backup-eu-doc.sh
# 参考 docs/DEPLOYMENT_GUIDE.md 中的备份脚本
```

### 2. 配置监控
```bash
# 安装监控工具
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. 性能优化
- 启用 Nginx Gzip 压缩（已自动配置）
- 配置静态资源缓存（已自动配置）
- 考虑使用CDN加速静态资源

---

## 📞 技术支持

如遇到问题：
1. 查看脚本输出的错误信息
2. 检查服务器日志：`pm2 logs eu-doc-api`
3. 检查Nginx日志：`/var/log/nginx/eu-doc-error.log`
4. 参考详细文档：`docs/DEPLOYMENT_GUIDE.md`

---

## 🎉 完成标志

当看到以下输出时，说明部署成功：

```
=== 部署完成! ===

访问地址:
  前端: http://yourdomain.com/eu-doc/
  API: http://yourdomain.com/eu-doc/api/health
```

祝部署顺利！🚀
