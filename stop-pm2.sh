#!/bin/bash

# EU-DOC PM2 停止脚本

echo "=========================================="
echo "  停止 EU-DOC 服务（PM2）"
echo "=========================================="
echo ""

pm2 stop eu-doc-backend eu-doc-frontend 2>/dev/null || true
pm2 delete eu-doc-backend eu-doc-frontend 2>/dev/null || true

echo "✅ 所有服务已停止"
echo ""
echo "💡 如需完全清理PM2: pm2 kill"
echo "=========================================="
