#!/bin/bash
# SSL证书配置脚本（Let's Encrypt）
# 使用方法: ./ssl-setup.sh [server-ip] [ssh-user] [domain] [email]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER_IP=$1
SSH_USER=${2:-root}
DOMAIN=$3
EMAIL=$4

if [ -z "$SERVER_IP" ] || [ -z "$DOMAIN" ]; then
    echo -e "${RED}错误: 请提供服务器IP和域名${NC}"
    echo "使用方法: ./ssl-setup.sh [server-ip] [ssh-user] [domain] [email]"
    echo "示例: ./ssl-setup.sh 1.2.3.4 root yourdomain.com admin@yourdomain.com"
    exit 1
fi

echo -e "${GREEN}=== SSL证书配置开始 ===${NC}"
echo "服务器: $SSH_USER@$SERVER_IP"
echo "域名: $DOMAIN"
echo "邮箱: ${EMAIL:-未提供}"

# 1. 安装Certbot
echo -e "\n${YELLOW}[1/4] 安装Certbot...${NC}"
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
fi

if ! command -v certbot &> /dev/null; then
    echo "安装Certbot..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        sudo yum install -y certbot python3-certbot-nginx
    fi
else
    echo "Certbot 已安装: $(certbot --version)"
fi
ENDSSH

# 2. 检查域名解析
echo -e "\n${YELLOW}[2/4] 检查域名解析...${NC}"
RESOLVED_IP=$(dig +short $DOMAIN | tail -n1)
if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
    echo -e "${GREEN}域名解析正确: $DOMAIN -> $SERVER_IP${NC}"
else
    echo -e "${RED}警告: 域名解析不匹配${NC}"
    echo "  预期IP: $SERVER_IP"
    echo "  解析IP: $RESOLVED_IP"
    echo -e "${YELLOW}请先配置域名DNS解析，然后重试${NC}"
    exit 1
fi

# 3. 获取SSL证书
echo -e "\n${YELLOW}[3/4] 获取SSL证书...${NC}"
if [ -n "$EMAIL" ]; then
    EMAIL_ARG="--email $EMAIL"
else
    EMAIL_ARG="--register-unsafely-without-email"
fi

ssh $SSH_USER@$SERVER_IP << ENDSSH
set -e
sudo certbot --nginx -d $DOMAIN $EMAIL_ARG --non-interactive --agree-tos --redirect
ENDSSH

# 4. 设置自动续期
echo -e "\n${YELLOW}[4/4] 设置自动续期...${NC}"
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e

# 测试续期
sudo certbot renew --dry-run

# 查看续期定时任务
if [ -f /etc/cron.d/certbot ]; then
    echo "自动续期已配置"
    cat /etc/cron.d/certbot
else
    echo "手动添加续期任务..."
    echo "0 12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo tee /etc/cron.d/certbot
fi
ENDSSH

# 完成
echo -e "\n${GREEN}=== SSL证书配置完成! ===${NC}"
echo -e "\nHTTPS访问地址:"
echo -e "  ${GREEN}https://$DOMAIN/eu-doc/${NC}"

echo -e "\n证书信息:"
ssh $SSH_USER@$SERVER_IP "sudo certbot certificates"

echo -e "\n自动续期已配置，证书有效期90天，会在到期前自动续期"
