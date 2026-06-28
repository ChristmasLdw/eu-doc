#!/bin/bash

# EU-DOC 持久化启动脚本（使用 PM2）
# 解决服务经常自动停止的问题

set -e

PROJECT_DIR="/Users/christmasldw/christmasldw-projects/eu-doc"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  EU-DOC 持久化启动（PM2）"
echo "=========================================="
echo ""

# 检查是否安装了 PM2
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  未检测到 PM2，正在安装..."
    npm install -g pm2
    echo "✅ PM2 安装完成"
    echo ""
fi

# 停止旧的 PM2 进程
echo "🔍 检查是否有旧进程..."
pm2 delete eu-doc-backend 2>/dev/null || true
pm2 delete eu-doc-frontend 2>/dev/null || true
echo "✅ 旧进程已清理"
echo ""

# 启动后端（PM2 会自动重启崩溃的进程）
echo "🚀 启动后端服务（PM2守护）..."
pm2 start server/index.cjs --name eu-doc-backend --time
pm2 save

# 等待后端启动
sleep 3

# 检查后端健康
HEALTH=$(curl -s http://localhost:3007/api/health 2>/dev/null || echo "")
if [[ "$HEALTH" == *"success"* ]]; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务启动失败"
    pm2 logs eu-doc-backend --lines 20
    exit 1
fi
echo ""

# 启动前端
echo "🚀 启动前端服务（PM2守护）..."
pm2 start npm --name eu-doc-frontend -- run dev
pm2 save

echo ""
echo "=========================================="
echo "  ✅ 服务启动成功！"
echo "=========================================="
echo ""
echo "📍 访问地址："
echo "   http://localhost:5173/eu-doc/"
echo ""
echo "🔧 PM2 管理命令："
echo "   查看状态: pm2 status"
echo "   查看日志: pm2 logs"
echo "   重启服务: pm2 restart all"
echo "   停止服务: pm2 stop all"
echo "   删除服务: pm2 delete all"
echo ""
echo "💡 PM2 会自动重启崩溃的进程，服务更稳定"
echo "=========================================="
