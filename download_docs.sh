#!/bin/bash
# EU-DOC 文档批量下载脚本
# 下载证书 PDF、说明书和附件，并按类型分类

BASE_URL="http://www.eu-doc.com"
CERTS_DIR="server/uploads/certificates"
MANUALS_DIR="server/uploads/manuals"
ATTACHMENTS_DIR="server/uploads/attachments"

# 确保目录存在
mkdir -p "$CERTS_DIR" "$MANUALS_DIR" "$ATTACHMENTS_DIR"

echo "开始下载文档..."
echo "================================================"

# 读取 PDF 列表并下载
while IFS= read -r pdf_path; do
    # 提取文件名
    filename=$(basename "$pdf_path")

    # 根据路径判断文件类型
    if [[ "$pdf_path" == *"/attachments/"* ]]; then
        # 附件/说明书
        target_dir="$MANUALS_DIR"
        file_type="说明书"
    elif [[ "$filename" == *"_cert.pdf" ]]; then
        # 证书文件
        target_dir="$CERTS_DIR"
        file_type="证书"
    else
        # 其他文档
        target_dir="$ATTACHMENTS_DIR"
        file_type="文档"
    fi

    # 检查文件是否已存在
    if [ -f "$target_dir/$filename" ]; then
        echo "⏭️  跳过 [$file_type]: $filename (已存在)"
    else
        echo "⬇️  下载 [$file_type]: $filename"
        curl -s -o "$target_dir/$filename" "$BASE_URL$pdf_path"

        # 检查下载是否成功
        if [ -f "$target_dir/$filename" ]; then
            size=$(ls -lh "$target_dir/$filename" | awk '{print $5}')
            echo "✅ 完成: $filename ($size)"
        else
            echo "❌ 失败: $filename"
        fi
    fi

    # 避免请求过快，休眠 1 秒
    sleep 1
done < /tmp/pdf_list.txt

echo "================================================"
echo "下载完成！"
echo ""
echo "文件统计："
echo "- 证书: $(ls -1 $CERTS_DIR/*.pdf 2>/dev/null | wc -l) 个"
echo "- 说明书: $(ls -1 $MANUALS_DIR/*.pdf 2>/dev/null | wc -l) 个"
echo "- 附件: $(ls -1 $ATTACHMENTS_DIR/*.pdf 2>/dev/null | wc -l) 个"
