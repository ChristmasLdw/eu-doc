#!/bin/bash
# EU-DOC 部署脚本 v2.0
# 用法：./deploy-to-tencent.sh

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 服务器配置
SERVER_IP="124.221.160.46"
SERVER_USER="root"
SERVER_PATH="/var/www/eu-doc"

echo -e "${GREEN}=== EU-DOC 部署到腾讯云 ===${NC}"

# 1. 构建前端
echo -e "\n${YELLOW}[1/5] 构建前端...${NC}"
npm run build

# 2. 同步前端文件
echo -e "\n${YELLOW}[2/5] 同步前端文件...${NC}"
rsync -avz --progress dist/ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/dist/

# 3. 同步后端文件（排除 node_modules）
echo -e "\n${YELLOW}[3/5] 同步后端文件...${NC}"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'data/*.db' \
  --exclude 'data/*.db-shm' \
  --exclude 'data/*.db-wal' \
  --exclude '.env' \
  server/ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/server/

# 4. 在服务器上安装/更新依赖
echo -e "\n${YELLOW}[4/5] 安装服务器依赖...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /var/www/eu-doc/server
npm install --production
ENDSSH

# 5. 重启服务
echo -e "\n${YELLOW}[5/5] 重启服务...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "pm2 restart eu-doc-api"

# 验证部署
echo -e "\n${GREEN}=== 验证部署 ===${NC}"
sleep 3
ssh ${SERVER_USER}@${SERVER_IP} "curl -s http://localhost:3007/api/health"

echo -e "\n\n${GREEN}✅ 部署完成！${NC}"
echo -e "访问地址: https://christmasldw.com/eu-doc/"
