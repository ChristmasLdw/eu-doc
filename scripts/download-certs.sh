#!/bin/bash

# Script to download certificate files from eu-doc.com
# Run this on the server to cache certificate images and PDFs locally

set -e

CERT_DIR="public/certs"
IMAGE_DIR="$CERT_DIR/images"
PDF_DIR="$CERT_DIR/pdfs"

echo "=== Downloading Certificate Files from eu-doc.com ==="
echo ""

# Create directories
mkdir -p "$IMAGE_DIR" "$PDF_DIR"

# Certificate image URLs (from RIF company)
IMAGES=(
  "http://www.eu-doc.com/user/20/20_100_52_6161_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6160_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6159_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6158_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6156_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_71_1.jpeg"
  "http://www.eu-doc.com/user/20/20_100_52_6150_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6149_1.jpg"
  "http://www.eu-doc.com/user/20/20_100_52_6148_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6147_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6146_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6145_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6144_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6143_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6142_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6140_1.png"
  "http://www.eu-doc.com/user/20/20_100_52_6139_1.png"
)

# PDF URLs
PDFS=(
  "http://www.eu-doc.com/user/20/attachments/20260505090148_7349.pdf"
)

echo "Downloading images..."
for url in "${IMAGES[@]}"; do
  filename=$(basename "$url")
  if [ ! -f "$IMAGE_DIR/$filename" ]; then
    echo "  Downloading: $filename"
    curl -sL "$url" -o "$IMAGE_DIR/$filename" 2>/dev/null || echo "  Failed: $filename"
  else
    echo "  Already exists: $filename"
  fi
done

echo ""
echo "Downloading PDFs..."
for url in "${PDFS[@]}"; do
  filename=$(basename "$url")
  if [ ! -f "$PDF_DIR/$filename" ]; then
    echo "  Downloading: $filename"
    curl -sL "$url" -o "$PDF_DIR/$filename" 2>/dev/null || echo "  Failed: $filename"
  else
    echo "  Already exists: $filename"
  fi
done

echo ""
echo "=== Download Complete ==="
echo "Images saved to: $IMAGE_DIR"
echo "PDFs saved to: $PDF_DIR"
echo ""
echo "Total images: $(ls -1 $IMAGE_DIR 2>/dev/null | wc -l)"
echo "Total PDFs: $(ls -1 $PDF_DIR 2>/dev/null | wc -l)"
