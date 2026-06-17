# EU-DOC 部署说明

## 部署脚本对比

### deploy-to-tencent.sh（日常更新）✅ 推荐
- **用途**：日常代码更新部署
- **特点**：
  - 只同步代码文件
  - 严格排除 node_modules、data、uploads、.env
  - 在服务器上重新安装依赖（原生模块重新编译）
  - 不会覆盖线上数据
  - 安全可靠
  
### deploy.sh（首次初始化）⚠️ 谨慎使用
- **用途**：全新服务器的首次部署
- **特点**：
  - 安装环境（Node.js、Nginx、PM2等）
  - 初始化项目结构
  - 配置服务器
  - **不要用于日常更新！**

## 部署最佳实践

### 日常更新流程

```bash
# 1. 提交代码到 Git
git add -A
git commit -m "描述改动"
git push origin main

# 2. 部署到服务器
./deploy-to-tencent.sh

# 3. 验证部署
# 脚本会自动测试 API 健康检查
# 手动访问网站确认功能正常
```

### 排除文件说明

| 文件/目录 | 为什么排除 | 处理方式 |
|----------|----------|---------|
| node_modules/ | 包含原生模块，需在目标平台编译 | 服务器上运行 npm install |
| data/ | 包含生产数据库，不能覆盖 | 仅首次部署手动上传 |
| uploads/ | 包含用户上传文件，不能覆盖 | 仅首次部署手动上传 |
| .env | 包含敏感配置，每个环境不同 | 在服务器上单独配置 |

### 常见错误及解决

#### 错误1：better-sqlite3 加载失败
```
Error: invalid ELF header
```
**原因**：上传了本地 Mac 编译的原生模块到 Linux 服务器

**解决**：
```bash
ssh root@124.221.160.46
cd /var/www/eu-doc/server
rm -rf node_modules
npm install
pm2 restart eu-doc-api
```

#### 错误2：数据丢失
**原因**：部署时覆盖了服务器上的数据库

**解决**：
- 使用 `deploy-to-tencent.sh`，它会自动排除 data 目录
- 定期备份数据库

#### 错误3：环境变量丢失
**原因**：部署时覆盖了 .env 文件

**解决**：
- 脚本已排除 .env
- 如果丢失，重新在服务器上创建

## 部署检查清单

### 部署前
- [ ] 代码已提交到 Git
- [ ] 本地测试通过
- [ ] 了解本次改动内容
- [ ] 确认使用正确的部署脚本

### 部署中
- [ ] 观察脚本输出
- [ ] 确认没有错误信息
- [ ] 等待 npm install 完成

### 部署后
- [ ] API 健康检查通过
- [ ] 前台页面正常访问
- [ ] 核心功能测试通过
- [ ] 检查 PM2 日志无错误

## 回滚方案

如果部署出现问题：

```bash
# 1. SSH 到服务器
ssh root@124.221.160.46

# 2. 回滚到上一个 Git 提交
cd /var/www/eu-doc
git log --oneline -5  # 查看最近提交
git reset --hard <commit-hash>

# 3. 重新安装依赖
cd server
rm -rf node_modules
npm install

# 4. 重启服务
pm2 restart eu-doc-api
```

## 联系方式

如有问题请查看：
- 工作日志：WORK_LOG.md
- 问题记录：TODO.md
- 完整部署指南：docs/DEPLOYMENT_GUIDE.md
