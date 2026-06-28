#!/bin/bash

# EU-DOC 开发环境停止脚本

set -e

PROJECT_DIR="/Users/christmasldw/christmasldw-projects/eu-doc"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  停止 EU-DOC 开发环境"
echo "=========================================="
echo ""

# 从 PID 文件读取进程ID
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "🛑 停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        echo "✅ 后端服务已停止"
    else
        echo "⚠️  后端进程不存在"
    fi
    rm -f logs/backend.pid
else
    echo "⚠️  未找到后端PID文件，尝试通过端口停止..."
    BACKEND_PID=$(lsof -ti:3007 2>/dev/null || echo "")
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "✅ 后端服务已停止"
    fi
fi

echo ""

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "🛑 停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        echo "✅ 前端服务已停止"
    else
        echo "⚠️  前端进程不存在"
    fi
    rm -f logs/frontend.pid
else
    echo "⚠️  未找到前端PID文件，尝试通过端口停止..."
    FRONTEND_PID=$(lsof -ti:5173 2>/dev/null || echo "")
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "✅ 前端服务已停止"
    fi
fi

echo ""
echo "=========================================="
echo "  ✅ 所有服务已停止"
echo "=========================================="
