#!/bin/bash

# 网络图可视化功能 - 快速启动脚本

echo "================================================"
echo "  🕸️  网络图可视化功能 - 快速启动"
echo "================================================"
echo ""
echo "📍 项目路径: /Users/christmasldw/christmasldw-projects/eu-doc"
echo "📍 演示地址: http://localhost:5173/eu-doc/network-demo"
echo ""
echo "🚀 正在启动开发服务器..."
echo ""

cd /Users/christmasldw/christmasldw-projects/eu-doc

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
  echo "⚠️  未检测到 node_modules，正在安装依赖..."
  npm install
fi

# 启动开发服务器
npm run dev

echo ""
echo "================================================"
echo "  ✅ 服务器已启动！"
echo "================================================"
echo ""
echo "📖 使用说明:"
echo "  1. 打开浏览器访问: http://localhost:5173/eu-doc/network-demo"
echo "  2. 你会看到 RIF 公司的产品与文档关系网络图"
echo "  3. 尝试拖拽节点、缩放视图、点击节点查看详情"
echo ""
echo "📚 完整文档:"
echo "  - 使用指南: NETWORK_VIEW_GUIDE.md"
echo "  - 实现总结: NETWORK_IMPLEMENTATION_SUMMARY.md"
echo ""
echo "💡 提示:"
echo "  - 按 Ctrl+C 停止服务器"
echo "  - 任何问题请查看控制台输出"
echo ""
