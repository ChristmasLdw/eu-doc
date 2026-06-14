#!/bin/bash

# EU-DOC Deployment Script for Tencent Cloud Server
# Run this script on the server to deploy the application

set -e

echo "=== EU-DOC Deployment Script ==="
echo ""

# Configuration
APP_NAME="eu-doc"
APP_DIR="/var/www/${APP_NAME}"
NODE_VERSION="22"
PORT=3001

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Step 1: Install PostgreSQL if not installed
echo "Step 1: Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL not found. Installing..."
    sudo dnf install -y postgresql-server postgresql
    sudo postgresql-setup --initdb
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_status "PostgreSQL installed and started"
else
    print_status "PostgreSQL already installed"
fi

# Step 2: Create database and user
echo ""
echo "Step 2: Setting up database..."
sudo -u postgres psql -c "CREATE USER eu_doc_user WITH PASSWORD 'eu_doc_secure_pass_2024';" 2>/dev/null || print_warning "User already exists"
sudo -u postgres psql -c "CREATE DATABASE eu_doc OWNER eu_doc_user;" 2>/dev/null || print_warning "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE eu_doc TO eu_doc_user;" 2>/dev/null
print_status "Database configured"

# Step 3: Install pnpm if not installed
echo ""
echo "Step 3: Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not found. Installing..."
    npm install -g pnpm
    print_status "pnpm installed"
else
    print_status "pnpm already installed"
fi

# Step 4: Create app directory
echo ""
echo "Step 4: Setting up application directory..."
sudo mkdir -p ${APP_DIR}
sudo chown -R $(whoami) ${APP_DIR}
print_status "App directory ready: ${APP_DIR}"

# Step 5: Copy application files
echo ""
echo "Step 5: Copying application files..."
# This assumes the script is run from the project directory
cp -r . ${APP_DIR}/
cd ${APP_DIR}
print_status "Application files copied"

# Step 6: Install dependencies
echo ""
echo "Step 6: Installing dependencies..."
pnpm install --production
print_status "Dependencies installed"

# Step 7: Set up environment variables
echo ""
echo "Step 7: Configuring environment..."
cat > .env.production << EOF
DATABASE_URL="postgresql://eu_doc_user:eu_doc_secure_pass_2024@localhost:5432/eu_doc"
NEXTAUTH_URL="http://$(hostname -I | awk '{print $1}'):${PORT}"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXT_PUBLIC_APP_URL="http://$(hostname -I | awk '{print $1}'):${PORT}"
EOF
print_status "Environment configured"

# Step 8: Push database schema
echo ""
echo "Step 8: Setting up database schema..."
npx drizzle-kit push
print_status "Database schema created"

# Step 9: Build the application
echo ""
echo "Step 9: Building application..."
pnpm run build
print_status "Application built"

# Step 10: Create systemd service
echo ""
echo "Step 10: Creating systemd service..."
sudo tee /etc/systemd/system/${APP_NAME}.service > /dev/null << EOF
[Unit]
Description=EU-DOC Certificate Library
After=network.target postgresql.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${APP_DIR}
ExecStart=$(which node) ${APP_DIR}/node_modules/.bin/next start -p ${PORT}
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start ${APP_NAME}
sudo systemctl enable ${APP_NAME}
print_status "Systemd service created and started"

# Step 11: Configure Nginx
echo ""
echo "Step 11: Configuring Nginx..."
sudo tee /etc/nginx/conf.d/${APP_NAME}.conf > /dev/null << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx
print_status "Nginx configured"

# Done
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Application URL: http://$(hostname -I | awk '{print $1}')"
echo "Port: ${PORT}"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status ${APP_NAME}   # Check status"
echo "  sudo systemctl restart ${APP_NAME}  # Restart app"
echo "  sudo journalctl -u ${APP_NAME} -f   # View logs"
echo ""
