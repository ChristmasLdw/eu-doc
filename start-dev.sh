#!/bin/bash

# EU-DOC 开发环境启动脚本
# 功能：自动启动前端和后端服务，并进行健康检查

set -e

PROJECT_DIR="/Users/christmasldw/christmasldw-projects/eu-doc"
BACKEND_PORT=3007
FRONTEND_PORT=5173

echo "=========================================="
echo "  EU-DOC 开发环境启动脚本"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# 1. 检查并停止旧进程
echo "🔍 检查是否有旧进程在运行..."

# 停止占用后端端口的进程
BACKEND_PID=$(lsof -ti:$BACKEND_PORT 2>/dev/null || echo "")
if [ ! -z "$BACKEND_PID" ]; then
    echo "⚠️  发现后端进程 (PID: $BACKEND_PID)，正在停止..."
    kill $BACKEND_PID 2>/dev/null || true
    sleep 1
fi

# 停止占用前端端口的进程
FRONTEND_PID=$(lsof -ti:$FRONTEND_PORT 2>/dev/null || echo "")
if [ ! -z "$FRONTEND_PID" ]; then
    echo "⚠️  发现前端进程 (PID: $FRONTEND_PID)，正在停止..."
    kill $FRONTEND_PID 2>/dev/null || true
    sleep 1
fi

echo "✅ 旧进程已清理"
echo ""

# 2. 启动后端服务
echo "🚀 启动后端服务..."
node server/index.cjs > logs/backend.log 2>&1 &
BACKEND_NEW_PID=$!
echo "   后端服务已启动 (PID: $BACKEND_NEW_PID)"

# 等待后端启动
sleep 3

# 3. 检查后端健康状态
echo "🔍 检查后端服务健康状态..."
HEALTH_CHECK=$(curl -s http://localhost:$BACKEND_PORT/api/health 2>/dev/null || echo "")
if [[ "$HEALTH_CHECK" == *"success"* ]]; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务启动失败，请查看 logs/backend.log"
    exit 1
fi
echo ""

# 4. 启动前端服务
echo "🚀 启动前端服务..."
npm run dev > logs/frontend.log 2>&1 &
FRONTEND_NEW_PID=$!
echo "   前端服务已启动 (PID: $FRONTEND_NEW_PID)"

# 等待前端启动
sleep 3

# 5. 检查前端服务
echo "🔍 检查前端服务..."
FRONTEND_CHECK=$(curl -s http://localhost:$FRONTEND_PORT/ 2>/dev/null || echo "")
if [[ "$FRONTEND_CHECK" == *"DOCTYPE"* ]] || [[ "$FRONTEND_CHECK" == *"html"* ]]; then
    echo "✅ 前端服务运行正常"
else
    echo "⚠️  前端服务可能未完全启动，请稍等片刻"
fi
echo ""

# 6. 显示访问地址
echo "=========================================="
echo "  ✅ 服务启动成功！"
echo "=========================================="
echo ""
echo "📍 访问地址："
echo "   前台首页: http://localhost:$FRONTEND_PORT/eu-doc/"
echo "   管理后台: http://localhost:$FRONTEND_PORT/eu-doc/admin/"
echo "   登录页面: http://localhost:$FRONTEND_PORT/eu-doc/admin/login"
echo ""
echo "🔧 后端API: http://localhost:$BACKEND_PORT/api/"
echo ""
echo "📊 进程信息："
echo "   后端进程: $BACKEND_NEW_PID"
echo "   前端进程: $FRONTEND_NEW_PID"
echo ""
echo "📝 日志文件："
echo "   后端日志: logs/backend.log"
echo "   前端日志: logs/frontend.log"
echo ""
echo "⚠️  停止服务: 运行 ./stop-dev.sh"
echo "=========================================="
echo ""

# 保存进程ID到文件
echo "$BACKEND_NEW_PID" > logs/backend.pid
echo "$FRONTEND_NEW_PID" > logs/frontend.pid
