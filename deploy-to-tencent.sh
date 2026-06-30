#!/bin/bash
# EU-DOC 腾讯云日常更新部署脚本 v2.1
# 用法：./deploy-to-tencent.sh
#
# 重要说明：
# - 本脚本用于日常代码更新部署
# - 不会覆盖服务器上的数据库、上传文件、环境配置
# - 原生模块会在服务器上重新编译

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
echo -e "${YELLOW}提示：本脚本只更新代码，不会覆盖数据库和上传文件${NC}\n"

# 1. 构建前端
echo -e "${YELLOW}[1/5] 构建前端...${NC}"
npm run build

# 2. 同步前端文件
echo -e "\n${YELLOW}[2/5] 同步前端文件...${NC}"
rsync -avz --progress \
  --delete \
  dist/ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/dist/

# 3. 同步后端文件（严格排除敏感文件和目录）
echo -e "\n${YELLOW}[3/5] 同步后端文件...${NC}"
rsync -avz --progress \
  --exclude 'node_modules/' \
  --exclude 'node_modules' \
  --exclude 'data/' \
  --exclude 'uploads/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '*.db' \
  --exclude '*.db-shm' \
  --exclude '*.db-wal' \
  --exclude '*.db-journal' \
  --exclude '*.backup*' \
  --exclude '.DS_Store' \
  server/ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/server/

# 4. 在服务器上安装/更新依赖
echo -e "\n${YELLOW}[4/5] 在服务器上安装依赖...${NC}"
echo -e "${YELLOW}注意：原生模块(better-sqlite3)将在Linux环境重新编译${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /var/www/eu-doc/server
npm install --production
ENDSSH

# 5. 重启服务
echo -e "\n${YELLOW}[5/5] 重启PM2服务...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "pm2 restart eu-doc-api"

# 验证部署
echo -e "\n${GREEN}=== 验证部署 ===${NC}"
sleep 3
ssh ${SERVER_USER}@${SERVER_IP} "curl -s http://localhost:3007/api/health"

echo -e "\n\n${GREEN}✅ 部署完成！${NC}"
echo -e "前台访问: https://christmasldw.com/eu-doc/"
echo -e "后台访问: https://christmasldw.com/eu-doc/admin"
