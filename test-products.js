#!/usr/bin/env node
/**
 * EU-DOC 产品管理模块测试脚本
 *
 * 测试内容：
 * 1. 获取产品列表
 * 2. 获取产品详情
 * 3. 创建产品
 * 4. 更新产品
 * 5. 获取产品的文档
 * 6. 删除产品
 */

const API_BASE = 'http://localhost:3007';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log('');
  log(`📋 测试: ${name}`, 'cyan');
  log('─'.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

async function login(username, password) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (result.data && result.data.success) {
    return result.data.token;
  }
  return null;
}

async function testHealthCheck() {
  logTest('健康检查');
  const result = await request('/api/health');

  if (result.status === 200 && result.data.success) {
    logSuccess(`服务运行正常: ${result.data.message}`);
    return true;
  } else {
    logError('服务未响应');
    return false;
  }
}

async function testGetProducts(token) {
  logTest('获取产品列表');
  const result = await request('/api/v2/products?page=1&pageSize=5', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status === 200 && result.data.success) {
    logSuccess(`获取成功，共 ${result.data.pagination.total} 个产品`);
    if (result.data.data.length > 0) {
      logInfo(`前 ${result.data.data.length} 个产品:`);
      result.data.data.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ID=${p.id}, 名称="${p.name}", 型号="${p.model || '-'}", 企业="${p.company_name}"`);
      });
      return result.data.data[0].id; // 返回第一个产品 ID 用于后续测试
    } else {
      logInfo('当前没有产品');
      return null;
    }
  } else {
    logError(`获取失败: ${result.data?.message || '未知错误'}`);
    return null;
  }
}

async function testGetProductDetail(token, productId) {
  if (!productId) {
    logInfo('跳过产品详情测试（没有可用的产品ID）');
    return;
  }

  logTest(`获取产品详情 (ID=${productId})`);
  const result = await request(`/api/v2/products/${productId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status === 200 && result.data.success) {
    const p = result.data.data;
    logSuccess('获取成功');
    console.log('  产品信息:');
    console.log(`    ID: ${p.id}`);
    console.log(`    名称: ${p.name}`);
    console.log(`    英文名: ${p.name_en || '-'}`);
    console.log(`    型号: ${p.model || '-'}`);
    console.log(`    企业: ${p.company_name} (ID=${p.company_id})`);
    console.log(`    分类: ${p.category_name || '-'}`);
    console.log(`    描述: ${p.description || '-'}`);
    console.log(`    英文描述: ${p.description_en || '-'}`);
    console.log(`    状态: ${p.status}`);
    console.log(`    标签: ${p.tags.length} 个`);
    return p;
  } else {
    logError(`获取失败: ${result.data?.message || '未知错误'}`);
    return null;
  }
}

async function testCreateProduct(token) {
  logTest('创建新产品');

  // 先获取一个企业 ID
  const companiesResult = await request('/api/companies?pageSize=1', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!companiesResult.data?.success || companiesResult.data.data.length === 0) {
    logError('无法获取企业信息');
    return null;
  }

  const companyId = companiesResult.data.data[0].id;
  logInfo(`使用企业: ${companiesResult.data.data[0].name} (ID=${companyId})`);

  const testProduct = {
    company_id: companyId,
    name: '测试产品-自动化测试',
    name_en: 'Test Product - Automated Test',
    model: 'TEST-001',
    description: '这是一个自动化测试创建的产品',
    description_en: 'This is a product created by automated test',
    status: 'active',
  };

  const result = await request('/api/v2/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(testProduct),
  });

  if (result.status === 201 && result.data.success) {
    logSuccess(`创建成功，产品ID: ${result.data.id}`);
    return result.data.id;
  } else {
    logError(`创建失败: ${result.data?.message || '未知错误'}`);
    return null;
  }
}

async function testUpdateProduct(token, productId) {
  if (!productId) {
    logInfo('跳过产品更新测试（没有可用的产品ID）');
    return;
  }

  logTest(`更新产品 (ID=${productId})`);

  const updateData = {
    name: '测试产品-已更新',
    name_en: 'Test Product - Updated',
    model: 'TEST-001-V2',
    description: '这是更新后的描述',
    description_en: 'This is the updated description',
  };

  const result = await request(`/api/v2/products/${productId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(updateData),
  });

  if (result.status === 200 && result.data.success) {
    logSuccess('更新成功');
  } else {
    logError(`更新失败: ${result.data?.message || '未知错误'}`);
  }
}

async function testGetProductDocuments(token, productId) {
  if (!productId) {
    logInfo('跳过产品文档测试（没有可用的产品ID）');
    return;
  }

  logTest(`获取产品文档 (ID=${productId})`);
  const result = await request(`/api/v2/products/${productId}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status === 200 && result.data.success) {
    logSuccess(`获取成功，共 ${result.data.total} 个文档`);
    if (result.data.data.length > 0) {
      result.data.data.forEach((doc, idx) => {
        console.log(`  ${idx + 1}. ${doc.document_type}: ${doc.title}`);
      });
    }
  } else {
    logError(`获取失败: ${result.data?.message || '未知错误'}`);
  }
}

async function testDeleteProduct(token, productId) {
  if (!productId) {
    logInfo('跳过产品删除测试（没有可用的产品ID）');
    return;
  }

  logTest(`删除产品 (ID=${productId})`);
  const result = await request(`/api/v2/products/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status === 200 && result.data.success) {
    logSuccess('删除成功');
  } else {
    logError(`删除失败: ${result.data?.message || '未知错误'}`);
  }
}

async function testProductSearch(token) {
  logTest('搜索产品（关键词: helmet）');
  const result = await request('/api/v2/products?search=helmet&page=1&pageSize=3', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status === 200 && result.data.success) {
    logSuccess(`搜索成功，找到 ${result.data.pagination.total} 个产品`);
    if (result.data.data.length > 0) {
      result.data.data.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name} (${p.model || '-'})`);
      });
    }
  } else {
    logError(`搜索失败: ${result.data?.message || '未知错误'}`);
  }
}

async function main() {
  console.log('');
  log('═'.repeat(60), 'blue');
  log('  EU-DOC 产品管理模块测试', 'blue');
  log('═'.repeat(60), 'blue');

  // 1. 健康检查
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    logError('服务未启动，请先启动后端服务');
    process.exit(1);
  }

  // 2. 登录获取 token
  logTest('用户登录');
  const token = await login('admin', 'admin123');
  if (!token) {
    logError('登录失败，请检查用户名密码');
    process.exit(1);
  }
  logSuccess('登录成功');

  // 3. 获取产品列表
  const firstProductId = await testGetProducts(token);

  // 4. 获取产品详情
  await testGetProductDetail(token, firstProductId);

  // 5. 搜索产品
  await testProductSearch(token);

  // 6. 获取产品文档
  await testGetProductDocuments(token, firstProductId);

  // 7. 创建产品
  const newProductId = await testCreateProduct(token);

  // 8. 更新产品
  if (newProductId) {
    await testUpdateProduct(token, newProductId);
  }

  // 9. 再次获取详情验证更新
  if (newProductId) {
    await testGetProductDetail(token, newProductId);
  }

  // 10. 删除产品
  if (newProductId) {
    await testDeleteProduct(token, newProductId);
  }

  // 总结
  console.log('');
  log('═'.repeat(60), 'blue');
  log('  测试完成', 'blue');
  log('═'.repeat(60), 'blue');
  console.log('');
}

main().catch(err => {
  logError(`测试脚本错误: ${err.message}`);
  console.error(err);
  process.exit(1);
});
