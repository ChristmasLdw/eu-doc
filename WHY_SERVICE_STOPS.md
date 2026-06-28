# 为什么服务器老是停止？原因分析和解决方案

## 🔍 常见原因分析

### 1. **后台进程被系统回收**
**原因**:
- 使用 `&` 启动的后台进程依赖于父shell
- 当shell关闭或Claude Code终止任务时，子进程也会被杀死
- macOS 可能会自动清理"不活跃"的后台进程

**症状**:
- 服务运行一段时间后自动停止
- 没有错误日志，进程突然消失
- PID文件存在但进程不存在

### 2. **内存不足或进程崩溃**
**原因**:
- Node.js 内存泄漏
- 未捕获的异常导致进程退出
- 数据库锁定问题（SQLite）

**症状**:
- 日志中有错误信息
- 进程突然退出
- 系统资源占用过高

### 3. **端口冲突**
**原因**:
- 其他程序占用了 3007 或 5173 端口
- 旧进程没有完全停止

**症状**:
- 启动时报错 "Address already in use"
- 服务启动后立即停止

### 4. **Claude Code 任务管理**
**原因**:
- Claude Code 运行后台任务有时间限制
- 当对话结束或任务超时时，会清理后台进程

**症状**:
- 服务在AI修改代码后停止
- 没有明显的错误信息

---

## ✅ 解决方案

### **方案1: 使用 PM2（推荐，最稳定）**

PM2 是专业的 Node.js 进程管理器，特点：
- ✅ 自动重启崩溃的进程
- ✅ 进程守护，不会被shell关闭影响
- ✅ 完整的日志管理
- ✅ 开机自动启动（可选）

**安装和使用**:

```bash
# 安装 PM2（只需一次）
npm install -g pm2

# 使用 PM2 启动服务
./start-pm2.sh

# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 停止服务
./stop-pm2.sh
```

**优点**:
- 🟢 服务崩溃会自动重启
- 🟢 完全独立于shell，不会被意外停止
- 🟢 内置日志轮转，不会占满磁盘

---

### **方案2: 使用 nohup（简单但不如PM2）**

nohup 可以让进程在后台持续运行，不受shell关闭影响。

修改 `start-dev.sh`:

```bash
# 后端
nohup node server/index.cjs > logs/backend.log 2>&1 &

# 前端
nohup npm run dev > logs/frontend.log 2>&1 &
```

**优点**:
- 🟢 不需要安装额外工具
- 🟢 进程不会因shell关闭而停止

**缺点**:
- 🔴 进程崩溃不会自动重启
- 🔴 需要手动管理进程

---

### **方案3: 使用 screen 或 tmux**

在独立的终端会话中运行服务。

```bash
# 创建 screen 会话
screen -S eu-doc-backend
node server/index.cjs
# 按 Ctrl+A 然后 D 退出会话

# 创建另一个会话运行前端
screen -S eu-doc-frontend
npm run dev
# 按 Ctrl+A 然后 D 退出

# 查看所有会话
screen -ls

# 重新连接会话
screen -r eu-doc-backend
```

**优点**:
- 🟢 完全独立的终端会话
- 🟢 可以随时连接查看实时输出

**缺点**:
- 🔴 需要手动管理多个会话
- 🔴 崩溃不会自动重启

---

### **方案4: 使用 systemd（Linux）或 launchd（macOS）**

创建系统级服务，开机自动启动。

**macOS launchd 示例** (高级用户):

创建 `~/Library/LaunchAgents/com.eudoc.backend.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.eudoc.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/christmasldw/christmasldw-projects/eu-doc/server/index.cjs</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/christmasldw/christmasldw-projects/eu-doc/logs/backend.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/christmasldw/christmasldw-projects/eu-doc/logs/backend.error.log</string>
</dict>
</plist>
```

**优点**:
- 🟢 系统级管理，最稳定
- 🟢 开机自动启动
- 🟢 崩溃自动重启

**缺点**:
- 🔴 配置复杂
- 🔴 调试困难

---

## 🎯 推荐方案对比

| 方案 | 稳定性 | 易用性 | 自动重启 | 推荐度 |
|------|--------|--------|----------|--------|
| **PM2** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | 🥇 **最推荐** |
| nohup | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | 🥈 简单场景 |
| screen/tmux | ⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ | 🥉 开发调试 |
| systemd/launchd | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✅ | 高级用户 |
| 原始 & | ⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ❌ 不推荐 |

---

## 💡 我的建议

**立即使用 PM2 方案**，因为：

1. ✅ **自动重启**: 进程崩溃会自动重启，不需要手动干预
2. ✅ **进程守护**: 不会因为shell关闭或Claude Code任务结束而停止
3. ✅ **日志管理**: 自动管理日志，方便调试
4. ✅ **简单易用**: 一行命令启动，一行命令停止
5. ✅ **生产级**: 被广泛用于生产环境

---

## 🚀 立即行动

```bash
# 1. 安装 PM2（只需一次）
npm install -g pm2

# 2. 使用 PM2 启动
./start-pm2.sh

# 3. 检查状态
pm2 status

# 4. 享受稳定的服务，不再担心自动停止！
```

---

## 📊 PM2 常用命令

```bash
# 查看所有进程状态
pm2 status

# 查看实时日志
pm2 logs

# 查看特定进程日志
pm2 logs eu-doc-backend

# 重启服务
pm2 restart all
pm2 restart eu-doc-backend

# 停止服务
pm2 stop all

# 删除服务
pm2 delete all

# 查看进程详细信息
pm2 show eu-doc-backend

# 监控资源使用
pm2 monit
```

---

## 🔧 故障排查

如果使用 PM2 后服务还是停止：

```bash
# 1. 查看 PM2 日志
pm2 logs --lines 100

# 2. 查看错误日志
pm2 logs eu-doc-backend --err

# 3. 检查进程状态
pm2 status

# 4. 查看详细信息
pm2 describe eu-doc-backend
```

---

**最后更新**: 2026-06-25
