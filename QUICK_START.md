# EU-DOC 快速开始指南 🚀

---

## 📋 当前状态

✅ **核心功能完成** - 多语言、主题切换、证书查询  
✅ **所有问题已修复** - 7个问题全部解决  
🔴 **待推送 GitHub** - 29 次提交未推送  
🔴 **待部署服务器** - 未上传到腾讯云  

---

## ⚡ 本地开发（已配置）

### 启动开发环境
```bash
# 终端1 - 启动后端（端口 3007）
cd server
node index.cjs

# 终端2 - 启动前端（端口 5173）
npm run dev
```

### 访问地址
- **前端**: http://localhost:5173/eu-doc/
- **后端**: http://localhost:3007/api/health

### 测试功能
- ✅ 语言切换：导航栏右上角
- ✅ 主题切换：导航栏右上角
- ✅ 搜索功能：首页搜索框
- ✅ 缩略图：刷新页面查看（Ctrl+Shift+R）

---

## 🔴 明天必做任务

### 1️⃣ 推送代码到 GitHub（优先级最高）

```bash
# 查看待推送的提交
git log origin/main..HEAD --oneline
# 应该看到 29 次提交

# 推送到 GitHub
git push origin main

# 如果推送失败（网络问题），重试或使用 SSH
git remote set-url origin git@github.com:ChristmasLdw/eu-doc.git
git push origin main
```

**为什么重要**：
- 代码备份安全
- 团队协作基础
- 服务器部署前提

---

### 2️⃣ 日常更新部署到腾讯云服务器

#### 使用自动部署脚本（推荐）

**重要说明**：
- ⚠️ 日常更新请使用 `./deploy-to-tencent.sh`
- ⚠️ `./deploy.sh` 仅用于全新服务器初始化，不要用于日常更新
- ✅ 自动排除 node_modules、数据库、上传文件
- ✅ 不会覆盖线上数据

```bash
# 日常代码更新部署
./deploy-to-tencent.sh
```

该脚本会自动完成：
1. 构建前端 (`npm run build`)
2. 同步前端文件到服务器
3. 同步后端代码（排除敏感文件）
4. 在服务器上重新安装依赖（原生模块重新编译）
5. 重启PM2服务
6. 验证部署结果

**不会同步的文件**：
- `node_modules/` - 依赖包（会在服务器上重新安装）
- `data/` - 数据库文件（保护线上数据）
- `uploads/` - 上传文件（保护用户数据）
- `.env` - 环境配置（保护敏感信息）

---

### 3️⃣ 全新服务器初始化部署（仅首次）

如果是全新服务器，使用初始化脚本：

```bash
# 仅首次部署使用
./deploy.sh [server-ip] [ssh-user] [domain]
```

#### 快速部署流程（首次部署）

**步骤总览**：
```bash
# 1. 连接服务器
ssh root@your-server-ip

# 2. 安装环境
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2

# 3. 克隆代码
cd /var/www
sudo git clone https://github.com/ChristmasLdw/eu-doc.git
cd eu-doc

# 4. 安装依赖
npm install
cd server && npm install

# 5. 配置环境变量
cd server
nano .env
# 填入配置（见下方）

# 6. 构建前端
cd /var/www/eu-doc
npm run build

# 7. 配置 Nginx
sudo nano /etc/nginx/sites-available/eu-doc
# 粘贴配置（见 DEPLOYMENT_GUIDE.md）
sudo ln -s /etc/nginx/sites-available/eu-doc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 8. 启动后端
cd /var/www/eu-doc/server
pm2 start index.cjs --name eu-doc-api
pm2 save

# 9. 测试访问
curl http://your-domain.com/eu-doc/
```

#### 环境变量配置 (.env)
```env
NODE_ENV=production
PORT=3007
JWT_SECRET=生成强密码（openssl rand -base64 32）
DATABASE_PATH=./data/eu-doc.db
CORS_ORIGIN=https://yourdomain.com
```

#### 首次部署需要手动上传的文件

**⚠️ 重要：仅首次部署需要，日常更新不要上传这些文件！**

```bash
# 仅首次部署时上传数据库（包含初始数据）
scp server/data/eu-doc.db root@your-server:/var/www/eu-doc/server/data/

# 仅首次部署时上传证书缩略图
scp -r server/uploads/certificates/thumbnails root@your-server:/var/www/eu-doc/server/uploads/certificates/

# ⚠️ 之后的日常更新不要再上传这些文件，会覆盖线上数据！
```

---

### 4️⃣ 部署后测试

#### 测试清单
```bash
# 在服务器上测试
curl http://your-domain.com/eu-doc/
curl http://your-domain.com/eu-doc/api/health
curl -I http://your-domain.com/eu-doc/certificates/thumbnails/20_100_52_6160-01.png
```

#### 浏览器测试
- [ ] 前端首页正常显示
- [ ] 缩略图正常加载
- [ ] 语言切换正常
- [ ] 主题切换正常
- [ ] 搜索功能正常
- [ ] 证书详情正常
- [ ] 登录功能正常

---

## 📊 项目概览

### 技术栈
- **前端**: React 19 + Vite 5 + react-i18next
- **后端**: Express.js + SQLite + JWT
- **部署**: Nginx + PM2

### 目录结构
```
eu-doc/
├── src/               # 前端源码
│   ├── pages/        # 9个页面（全部多语言）
│   ├── i18n/         # 500+ 翻译条目
│   └── contexts/     # 主题管理
├── server/           # 后端代码
│   ├── data/         # 数据库（48条证书）
│   └── uploads/      # 缩略图（29张）
├── docs/             # 12份文档
└── dist/             # 构建产物（npm run build）
```

### 数据统计
- **证书总数**: 48 条（31 条有效）
- **有缩略图**: 29 条（id 1-29）
- **翻译条目**: 500+ 条
- **代码文件**: 26 个
- **Git 提交**: 29 次
- **文档数量**: 12 份

---

## 🎯 工作成果

### 昨天完成（6月12日）
✅ 多语言系统（9个页面）  
✅ 主题切换（明亮/暗黑）  
✅ 用户协议集成  
✅ 修复 6 个问题  

### 今天完成（6月13日）
✅ 修复缩略图加载问题  
✅ 优化默认排序  
✅ 完善文档  

---

## 🔧 常用命令

### 开发
```bash
npm run dev          # 启动前端开发服务器
node server/index.cjs # 启动后端
```

### 构建
```bash
npm run build        # 构建生产版本
npm run preview      # 预览生产版本
```

### Git
```bash
git status           # 查看状态
git log --oneline -10 # 查看提交历史
git push origin main  # 推送到 GitHub
```

### 服务器
```bash
pm2 status           # 查看进程状态
pm2 logs eu-doc-api  # 查看日志
pm2 restart eu-doc-api # 重启服务
sudo systemctl reload nginx # 重启 Nginx
```

---

## 📚 文档索引

1. **WORK_SUMMARY_2026-06-12-13.md** - 详细工作总结 ⭐
2. **DEPLOYMENT_GUIDE.md** - 完整部署指南 ⭐
3. **QUICK_START.md** - 本文档
4. **IMPROVEMENT_SUGGESTIONS.md** - 改进建议
5. **FINAL_COMPLETION_REPORT_v2.md** - 最终完成报告
6. **BUG_FIX_REPORT.md** - 问题修复详情
7. 其他 6 份文档...

⭐ = 重点文档

---

## ❓ 常见问题

### Q: 缩略图还是显示"图片加载失败"？
**A**: 强制刷新浏览器（Ctrl+Shift+R 或 Cmd+Shift+R）

### Q: GitHub 推送失败？
**A**: 检查网络连接，或稍后重试：
```bash
git push origin main
```

### Q: 数据库中的证书不显示？
**A**: 最新的测试证书（id 47-48）没有缩略图，有缩略图的是 id 1-29

### Q: 如何修改显示的证书？
**A**: 已修改为按 id 升序排序，优先显示有缩略图的证书

---

## 📞 需要帮助？

查看详细文档：
- 部署问题 → `docs/DEPLOYMENT_GUIDE.md`
- 工作回顾 → `docs/WORK_SUMMARY_2026-06-12-13.md`
- 功能说明 → `docs/FINAL_COMPLETION_REPORT_v2.md`

---

## 🎉 下一步

1. **刷新浏览器** 验证缩略图修复
2. **推送 GitHub** 备份代码（29次提交）
3. **部署服务器** 上线生产环境
4. **测试验证** 确保功能正常

**预计上线时间**: 2026年6月14日

---

**祝你好运！** 🚀
