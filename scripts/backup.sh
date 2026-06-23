#!/bin/bash
# EU-DOC 数据备份脚本
# 用法: ./scripts/backup.sh [备份目录]

set -e

# 默认备份目录
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="eu-doc-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# 创建备份目录
mkdir -p "${BACKUP_PATH}"

echo "开始备份 EU-DOC 数据..."
echo "备份目录: ${BACKUP_PATH}"

# 1. 备份数据库
echo "正在备份数据库..."
if [ -f "./server/data/eu-doc.db" ]; then
    cp "./server/data/eu-doc.db" "${BACKUP_PATH}/eu-doc.db"
    echo "  ✓ 数据库备份完成"
else
    echo "  ✗ 数据库文件不存在"
fi

# 2. 备份上传文件
echo "正在备份上传文件..."
if [ -d "./server/uploads" ]; then
    cp -r "./server/uploads" "${BACKUP_PATH}/uploads"
    echo "  ✓ 上传文件备份完成"
else
    echo "  ✗ 上传目录不存在"
fi

# 3. 备份配置文件
echo "正在备份配置文件..."
if [ -f ".env" ]; then
    cp ".env" "${BACKUP_PATH}/env.backup"
    echo "  ✓ .env 备份完成"
fi

# 4. 创建压缩包
echo "正在创建压缩包..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

echo ""
echo "备份完成！"
echo "备份文件: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""
echo "恢复方法:"
echo "  1. 解压: tar -xzf ${BACKUP_NAME}.tar.gz"
echo "  2. 恢复数据库: cp ${BACKUP_NAME}/eu-doc.db ./server/data/"
echo "  3. 恢复文件: cp -r ${BACKUP_NAME}/uploads ./server/"
