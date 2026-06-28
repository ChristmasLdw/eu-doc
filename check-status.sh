#!/bin/bash

# EU-DOC 服务状态检查脚本

BACKEND_PORT=3007
FRONTEND_PORT=5173

echo "=========================================="
echo "  EU-DOC 服务状态检查"
echo "=========================================="
echo ""

# 检查后端
echo "🔍 后端服务 (端口 $BACKEND_PORT):"
BACKEND_PID=$(lsof -ti:$BACKEND_PORT 2>/dev/null || echo "")
if [ ! -z "$BACKEND_PID" ]; then
    echo "   状态: ✅ 运行中"
    echo "   进程: $BACKEND_PID"

    # 健康检查
    HEALTH=$(curl -s http://localhost:$BACKEND_PORT/api/health 2>/dev/null || echo "")
    if [[ "$HEALTH" == *"success"* ]]; then
        echo "   健康: ✅ 正常"
    else
        echo "   健康: ⚠️  API无响应"
    fi
else
    echo "   状态: ❌ 未运行"
fi

echo ""

# 检查前端
echo "🔍 前端服务 (端口 $FRONTEND_PORT):"
FRONTEND_PID=$(lsof -ti:$FRONTEND_PORT 2>/dev/null || echo "")
if [ ! -z "$FRONTEND_PID" ]; then
    echo "   状态: ✅ 运行中"
    echo "   进程: $FRONTEND_PID"

    # 页面检查
    PAGE=$(curl -s http://localhost:$FRONTEND_PORT/eu-doc/ 2>/dev/null || echo "")
    if [[ "$PAGE" == *"DOCTYPE"* ]] || [[ "$PAGE" == *"html"* ]]; then
        echo "   健康: ✅ 正常"
    else
        echo "   健康: ⚠️  页面无响应"
    fi
else
    echo "   状态: ❌ 未运行"
fi

echo ""

# 显示访问地址
if [ ! -z "$BACKEND_PID" ] && [ ! -z "$FRONTEND_PID" ]; then
    echo "=========================================="
    echo "📍 访问地址："
    echo "   http://localhost:$FRONTEND_PORT/eu-doc/"
    echo "=========================================="
fi
