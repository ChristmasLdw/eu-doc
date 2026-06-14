#!/bin/bash
# EU-DOC 部署后功能测试脚本
# 使用方法: ./test-deployment.sh [base-url]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL=${1:-http://localhost}
TEST_RESULTS=()

echo -e "${GREEN}=== EU-DOC 功能测试 ===${NC}"
echo "测试地址: $BASE_URL"
echo ""

# 测试函数
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3

    echo -n "测试 $name ... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ 通过 ($response)${NC}"
        TEST_RESULTS+=("✓ $name")
        return 0
    else
        echo -e "${RED}✗ 失败 (预期: $expected, 实际: $response)${NC}"
        TEST_RESULTS+=("✗ $name")
        return 1
    fi
}

# 1. 前端页面测试
echo -e "${YELLOW}[1/7] 前端页面访问测试${NC}"
test_endpoint "前端首页" "$BASE_URL/eu-doc/" "200"
test_endpoint "前端资源" "$BASE_URL/eu-doc/index.html" "200"

# 2. API接口测试
echo -e "\n${YELLOW}[2/7] API接口测试${NC}"
test_endpoint "健康检查" "$BASE_URL/eu-doc/api/health" "200"
test_endpoint "证书列表" "$BASE_URL/eu-doc/api/certificates" "200"

# 3. API详细响应测试
echo -e "\n${YELLOW}[3/7] API响应内容测试${NC}"
echo -n "测试API响应JSON格式 ... "
health_response=$(curl -s "$BASE_URL/eu-doc/api/health" 2>/dev/null)
if echo "$health_response" | grep -q '"success"'; then
    echo -e "${GREEN}✓ 通过${NC}"
    TEST_RESULTS+=("✓ API JSON格式")
else
    echo -e "${RED}✗ 失败${NC}"
    TEST_RESULTS+=("✗ API JSON格式")
fi

# 4. 缩略图测试
echo -e "\n${YELLOW}[4/7] 缩略图加载测试${NC}"
echo -n "测试缩略图访问 ... "
# 获取证书列表，提取第一个缩略图
cert_data=$(curl -s "$BASE_URL/eu-doc/api/certificates" 2>/dev/null)
if echo "$cert_data" | grep -q '"thumbnailUrl"'; then
    thumbnail_path=$(echo "$cert_data" | grep -o '"thumbnailUrl":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$thumbnail_path" ]; then
        thumbnail_url="$BASE_URL$thumbnail_path"
        response=$(curl -s -o /dev/null -w "%{http_code}" "$thumbnail_url" 2>/dev/null || echo "000")
        if [ "$response" = "200" ]; then
            echo -e "${GREEN}✓ 通过 ($thumbnail_url)${NC}"
            TEST_RESULTS+=("✓ 缩略图加载")
        else
            echo -e "${RED}✗ 失败 (HTTP $response)${NC}"
            TEST_RESULTS+=("✗ 缩略图加载")
        fi
    else
        echo -e "${YELLOW}⚠ 跳过（无缩略图数据）${NC}"
        TEST_RESULTS+=("⚠ 缩略图加载")
    fi
else
    echo -e "${YELLOW}⚠ 跳过（证书数据为空）${NC}"
    TEST_RESULTS+=("⚠ 缩略图加载")
fi

# 5. 静态资源测试
echo -e "\n${YELLOW}[5/7] 静态资源测试${NC}"
echo -n "检查构建文件 ... "
assets=$(curl -s "$BASE_URL/eu-doc/index.html" 2>/dev/null | grep -o 'src="[^"]*\.js"' | head -1 | cut -d'"' -f2)
if [ -n "$assets" ]; then
    asset_url="$BASE_URL/eu-doc$assets"
    response=$(curl -s -o /dev/null -w "%{http_code}" "$asset_url" 2>/dev/null || echo "000")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ 通过${NC}"
        TEST_RESULTS+=("✓ 静态资源")
    else
        echo -e "${RED}✗ 失败${NC}"
        TEST_RESULTS+=("✗ 静态资源")
    fi
else
    echo -e "${YELLOW}⚠ 无法提取资源路径${NC}"
    TEST_RESULTS+=("⚠ 静态资源")
fi

# 6. CORS测试
echo -e "\n${YELLOW}[6/7] CORS配置测试${NC}"
echo -n "测试CORS头 ... "
cors_header=$(curl -s -I "$BASE_URL/eu-doc/api/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
if [ -n "$cors_header" ]; then
    echo -e "${GREEN}✓ 通过${NC}"
    TEST_RESULTS+=("✓ CORS配置")
else
    echo -e "${YELLOW}⚠ 未检测到CORS头${NC}"
    TEST_RESULTS+=("⚠ CORS配置")
fi

# 7. 响应时间测试
echo -e "\n${YELLOW}[7/7] 性能测试${NC}"
echo -n "测试API响应时间 ... "
response_time=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/eu-doc/api/health" 2>/dev/null || echo "0")
response_time_ms=$(echo "$response_time * 1000" | bc)
if (( $(echo "$response_time < 2" | bc -l) )); then
    echo -e "${GREEN}✓ 通过 (${response_time_ms}ms)${NC}"
    TEST_RESULTS+=("✓ 响应时间")
else
    echo -e "${YELLOW}⚠ 较慢 (${response_time_ms}ms)${NC}"
    TEST_RESULTS+=("⚠ 响应时间")
fi

# 统计结果
echo -e "\n${GREEN}=== 测试结果汇总 ===${NC}"
success_count=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "^✓" || echo "0")
fail_count=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "^✗" || echo "0")
warn_count=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "^⚠" || echo "0")
total_count=${#TEST_RESULTS[@]}

echo ""
for result in "${TEST_RESULTS[@]}"; do
    if [[ $result == ✓* ]]; then
        echo -e "${GREEN}$result${NC}"
    elif [[ $result == ✗* ]]; then
        echo -e "${RED}$result${NC}"
    else
        echo -e "${YELLOW}$result${NC}"
    fi
done

echo ""
echo -e "通过: ${GREEN}$success_count${NC} | 失败: ${RED}$fail_count${NC} | 警告: ${YELLOW}$warn_count${NC} | 总计: $total_count"

if [ $fail_count -eq 0 ]; then
    echo -e "\n${GREEN}✓ 所有关键测试通过！${NC}"
    exit 0
else
    echo -e "\n${RED}✗ 有测试失败，请检查日志${NC}"
    exit 1
fi
