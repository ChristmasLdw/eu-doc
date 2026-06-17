#!/bin/bash
# ⚠️ EU-DOC 全新服务器初始化部署脚本 ⚠️
#
# 警告：本脚本用于全新服务器的首次部署，会安装环境和初始化项目
#
# 日常更新部署请使用：./deploy-to-tencent.sh
#
# 使用方法: ./deploy.sh [server-ip] [ssh-user] [domain]
# 示例: ./deploy.sh 1.2.3.4 root yourdomain.com

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 参数
SERVER_IP=$1
SSH_USER=${2:-root}
DOMAIN=$3

if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}错误: 请提供服务器IP地址${NC}"
    echo "使用方法: ./deploy.sh [server-ip] [ssh-user] [domain]"
    echo "示例: ./deploy.sh 1.2.3.4 root yourdomain.com"
    exit 1
fi

echo -e "${GREEN}=== EU-DOC 部署开始 ===${NC}"
echo "服务器: $SSH_USER@$SERVER_IP"
echo "域名: ${DOMAIN:-未配置}"

# 1. 测试SSH连接
echo -e "\n${YELLOW}[1/10] 测试SSH连接...${NC}"
ssh -o ConnectTimeout=10 $SSH_USER@$SERVER_IP "echo 'SSH连接成功'" || {
    echo -e "${RED}SSH连接失败，请检查服务器IP和SSH配置${NC}"
    exit 1
}

# 2. 检查并安装必要软件
echo -e "\n${YELLOW}[2/10] 检查服务器环境...${NC}"
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "无法检测操作系统"
    exit 1
fi

echo "操作系统: $OS"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "安装Node.js..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    fi
else
    echo "Node.js 已安装: $(node -v)"
fi

# 检查Nginx
if ! command -v nginx &> /dev/null; then
    echo "安装Nginx..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt update
        sudo apt install -y nginx
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        sudo yum install -y nginx
    fi
    sudo systemctl start nginx
    sudo systemctl enable nginx
else
    echo "Nginx 已安装: $(nginx -v 2>&1)"
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装PM2..."
    sudo npm install -g pm2
else
    echo "PM2 已安装: $(pm2 -v)"
fi

# 检查Git
if ! command -v git &> /dev/null; then
    echo "安装Git..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt install -y git
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        sudo yum install -y git
    fi
else
    echo "Git 已安装: $(git --version)"
fi
ENDSSH

# 3. 部署应用代码
echo -e "\n${YELLOW}[3/10] 部署应用代码...${NC}"
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e

# 创建目录
sudo mkdir -p /var/www
cd /var/www

# 克隆或更新代码
if [ -d "eu-doc" ]; then
    echo "更新现有代码..."
    cd eu-doc
    git pull origin main
else
    echo "克隆代码..."
    sudo git clone https://github.com/ChristmasLdw/eu-doc.git
    cd eu-doc
fi

# 设置权限
sudo chown -R $USER:$USER /var/www/eu-doc
ENDSSH

# 4. 安装依赖
echo -e "\n${YELLOW}[4/10] 安装依赖...${NC}"
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e
cd /var/www/eu-doc

echo "安装前端依赖..."
npm install

echo "安装后端依赖..."
cd server
npm install
ENDSSH

# 5. 配置环境变量
echo -e "\n${YELLOW}[5/10] 配置环境变量...${NC}"
JWT_SECRET=$(openssl rand -base64 32)
ssh $SSH_USER@$SERVER_IP << ENDSSH
set -e
cd /var/www/eu-doc/server

# 生成.env文件
cat > .env << 'EOF'
NODE_ENV=production
PORT=3007
JWT_SECRET=$JWT_SECRET
DATABASE_PATH=./data/eu-doc.db
CORS_ORIGIN=*
LOG_LEVEL=info
MAX_FILE_SIZE=10485760
EOF

chmod 600 .env
echo ".env 配置完成"
ENDSSH

# 6. 构建前端
echo -e "\n${YELLOW}[6/10] 构建前端...${NC}"
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e
cd /var/www/eu-doc
npm run build
ls -la dist/
ENDSSH

# 7. 上传数据库和缩略图
echo -e "\n${YELLOW}[7/10] 上传数据库和缩略图...${NC}"
echo "上传数据库..."
scp server/data/eu-doc.db $SSH_USER@$SERVER_IP:/var/www/eu-doc/server/data/

echo "上传缩略图..."
scp -r server/uploads/certificates $SSH_USER@$SERVER_IP:/var/www/eu-doc/server/uploads/

# 8. 配置Nginx
echo -e "\n${YELLOW}[8/10] 配置Nginx...${NC}"
NGINX_CONFIG="server {
    listen 80;
    server_name ${DOMAIN:-_};

    access_log /var/log/nginx/eu-doc-access.log;
    error_log /var/log/nginx/eu-doc-error.log;

    location /eu-doc/ {
        alias /var/www/eu-doc/dist/;
        try_files \$uri \$uri/ /eu-doc/index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control \"public, immutable\";
        }
    }

    location /eu-doc/api/ {
        proxy_pass http://localhost:3007/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /eu-doc/certificates/ {
        proxy_pass http://localhost:3007/certificates/;
        proxy_set_header Host \$host;
        expires 30d;
    }

    location /eu-doc/uploads/ {
        proxy_pass http://localhost:3007/uploads/;
        proxy_set_header Host \$host;
        expires 30d;
    }

    client_max_body_size 10M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}"

ssh $SSH_USER@$SERVER_IP << ENDSSH
set -e
echo '$NGINX_CONFIG' | sudo tee /etc/nginx/sites-available/eu-doc > /dev/null
sudo ln -sf /etc/nginx/sites-available/eu-doc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx 配置完成"
ENDSSH

# 9. 启动后端服务
echo -e "\n${YELLOW}[9/10] 启动后端服务...${NC}"
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e
cd /var/www/eu-doc/server

# 停止旧进程（如果存在）
pm2 delete eu-doc-api 2>/dev/null || true

# 启动新进程
pm2 start index.cjs --name eu-doc-api --env production

# 保存配置
pm2 save
pm2 startup | tail -1 | bash || true

# 查看状态
pm2 status
pm2 logs eu-doc-api --lines 10
ENDSSH

# 10. 测试部署
echo -e "\n${YELLOW}[10/10] 测试部署...${NC}"
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e

# 测试API
echo "测试API健康检查..."
sleep 2
curl -f http://localhost:3007/api/health || {
    echo "API测试失败"
    exit 1
}

echo "测试前端访问..."
curl -f http://localhost/eu-doc/ > /dev/null || {
    echo "前端访问失败"
    exit 1
}

echo "所有测试通过!"
ENDSSH

# 完成
echo -e "\n${GREEN}=== 部署完成! ===${NC}"
echo -e "\n访问地址:"
if [ -n "$DOMAIN" ]; then
    echo -e "  前端: ${GREEN}http://$DOMAIN/eu-doc/${NC}"
    echo -e "  API: ${GREEN}http://$DOMAIN/eu-doc/api/health${NC}"
else
    echo -e "  前端: ${GREEN}http://$SERVER_IP/eu-doc/${NC}"
    echo -e "  API: ${GREEN}http://$SERVER_IP/eu-doc/api/health${NC}"
fi

echo -e "\n后续步骤:"
echo "1. 在浏览器中测试所有功能"
echo "2. 配置SSL证书: sudo certbot --nginx -d $DOMAIN"
echo "3. 配置防火墙: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
echo "4. 设置数据库备份定时任务"

echo -e "\n常用命令:"
echo "  查看日志: ssh $SSH_USER@$SERVER_IP 'pm2 logs eu-doc-api'"
echo "  重启服务: ssh $SSH_USER@$SERVER_IP 'pm2 restart eu-doc-api'"
echo "  查看状态: ssh $SSH_USER@$SERVER_IP 'pm2 status'"
