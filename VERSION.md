# EU-DOC 版本记录

## 版本管理规范

**版本号规则：** `v主版本.次版本.修订号`
- `v0.x.x` - 开发阶段（未上线）
- `v1.x.x` - 正式版本（已上线）

**回退方法：**
```bash
# 查看所有版本
git tag -l

# 回退到指定版本
git checkout v0.1.0

# 创建基于该版本的新分支
git checkout -b rollback-v0.1.0
```

---

## 版本历史

### v0.1.0 - UI Implementation Complete (2026-06-14)

**状态：** ✅ 已完成并推送到 GitHub

**功能：**
- ✅ 主页面（搜索、统计、浏览分类）
- ✅ 证书详情页（PDF 查看、图片灯箱、缩略图预览）
- ✅ 搜索页面（多维度筛选）
- ✅ 登录/注册/忘记密码页面 UI
- ✅ 国际化配置（中英文）
- ✅ 数据库 Schema 设计（Drizzle ORM + PostgreSQL）
- ✅ shadcn/ui 组件库集成
- ✅ 响应式布局
- ✅ 深色模式支持

**技术栈：**
- Next.js 16.2.7 (App Router)
- TypeScript
- Tailwind CSS 4
- Drizzle ORM
- NextAuth (未配置)
- next-intl

**未完成：**
- ❌ 数据库连接
- ❌ 用户认证实现
- ❌ 证书 CRUD API
- ❌ 文件上传功能
- ❌ 搜索功能后端实现

**下一步：** v0.2.0 - Database & Authentication

---

### v0.2.0 - Database & Authentication (计划中)

**目标功能：**
- [ ] 配置 PostgreSQL 数据库连接
- [ ] 初始化数据库表结构
- [ ] NextAuth 配置和集成
- [ ] 用户注册功能实现
- [ ] 用户登录功能实现
- [ ] 密码重置功能
- [ ] Session 管理
- [ ] 用户权限系统（USER/ADMIN）

**预计时间：** 1-2 天

---

### v0.3.0 - Certificate CRUD & Search (计划中)

**目标功能：**
- [ ] 证书列表 API
- [ ] 证书详情 API
- [ ] 证书创建 API
- [ ] 证书编辑 API
- [ ] 证书删除 API
- [ ] 搜索功能实现（模糊匹配）
- [ ] 筛选功能（公司、分类、状态）
- [ ] 分页功能

**预计时间：** 2-3 天

---

### v0.4.0 - Upload & File Management (计划中)

**目标功能：**
- [ ] 文件上传接口
- [ ] PDF 文件处理
- [ ] 缩略图自动生成
- [ ] 图片优化和压缩
- [ ] 文件存储（本地/云存储）
- [ ] 文件大小和类型验证
- [ ] 上传进度显示

**预计时间：** 2-3 天

---

### v0.5.0 - Advanced Features (计划中)

**目标功能：**
- [ ] 批量上传功能
- [ ] 证书到期提醒
- [ ] 收藏功能
- [ ] 搜索历史
- [ ] 数据导出（PDF/Excel）
- [ ] 用户协议和隐私政策页面
- [ ] 移动端优化

**预计时间：** 3-5 天

---

### v1.0.0 - Production Release (计划中)

**目标：**
- [ ] 所有核心功能完成
- [ ] 性能优化
- [ ] 安全审计
- [ ] 部署到生产环境
- [ ] 域名和 SSL 配置
- [ ] 监控和日志系统
- [ ] 备份和恢复机制

**预计时间：** 1-2 周

---

## 仓库信息

- **GitHub：** https://github.com/ChristmasLdw/eu-doc
- **类型：** Private（私有仓库）
- **主分支：** main
- **当前版本：** v0.1.0

## 开发流程

1. **创建功能分支**
   ```bash
   git checkout -b feature/功能名称
   ```

2. **开发和提交**
   ```bash
   git add .
   git commit -m "feat: 功能描述"
   ```

3. **合并到主分支**
   ```bash
   git checkout main
   git merge feature/功能名称
   ```

4. **打标签**
   ```bash
   git tag -a v0.x.x -m "版本说明"
   ```

5. **推送到 GitHub**
   ```bash
   git push origin main --tags
   ```
