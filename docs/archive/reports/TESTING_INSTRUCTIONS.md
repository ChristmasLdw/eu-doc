# EU-DOC 测试说明

## 🎯 当前需要测试的问题

### 报告的问题：搜索页面空白
**症状：** 点击导航栏"搜索"按钮后页面空白

---

## 📋 测试步骤

### 第一步：打开浏览器开发者工具
```
1. 打开浏览器（Chrome/Firefox/Safari）
2. 访问 http://localhost:5173/eu-doc/
3. 按 F12（或 Cmd+Option+I on Mac）打开开发者工具
4. 确保Console标签是打开的
```

### 第二步：测试搜索功能
```
1. 点击导航栏的"搜索"链接
2. 观察：
   - 页面是否跳转到 /search
   - Console中是否有红色错误
   - Network中API请求是否成功
   - 页面上是否有任何内容（即使看起来是空的）
```

### 第三步：截图并报告
**需要提供的信息：**
1. Console标签的截图（特别是红色错误）
2. Network标签的截图（查看API请求）
3. 页面显示的截图
4. 浏览器版本信息

---

## 🔍 关键检查点

### Console标签检查
查找以下错误：
```
✗ xxx is not defined
✗ Cannot read property 'xxx' of undefined
✗ Unexpected token
✗ Failed to fetch
```

### Network标签检查
查看以下请求：
```
✓ /api/certificates - 状态码应该是200
✓ /api/stats/overview - 状态码应该是200
✓ /api/companies - 状态码应该是200
```

### Elements标签检查
检查页面结构：
```
<div id="root">
  <div class="App">
    <nav> ... </nav>
    <div class="SearchPage_page_xxx">
      <!-- 应该有内容 -->
    </div>
  </div>
</div>
```

---

## 🛠️ 可能需要的操作

### 如果后端未运行
```bash
cd server
node index.cjs
```

### 如果前端未运行
```bash
npm run dev
```

### 如果需要清除缓存
```
1. 在开发者工具中
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"
```

---

## ✅ 预期正常行为

### /search 页面应该显示：

**无搜索查询时：**
- 搜索框
- 分类筛选标签
- 最近查看卡片（如果有浏览历史）
- 或者空状态提示

**有搜索查询时：**
- 搜索框（显示查询词）
- 活动筛选器标签
- 搜索结果列表
- 结果数量统计
- 分页器

---

## 📸 需要的截图

请按以下顺序提供截图：

### 截图1: Console标签
- 显示所有错误和警告

### 截图2: Network标签
- 显示所有API请求及其状态

### 截图3: 页面显示
- 显示实际的页面内容（即使是空白）

### 截图4: React DevTools（如果安装）
- 显示组件树
- 特别是SearchPage组件

---

## 🐛 常见问题和解决方案

### 问题1: 后端未启动
**症状：** Network中API请求失败（状态码0或红色）  
**解决：** 
```bash
cd server
node index.cjs
```

### 问题2: 浏览器缓存
**症状：** 显示旧版本页面  
**解决：** 清空缓存并硬性重新加载

### 问题3: JavaScript错误
**症状：** Console中有红色错误  
**解决：** 将错误信息发给我，我会修复代码

### 问题4: CORS错误
**症状：** Console显示CORS相关错误  
**解决：** 检查后端CORS配置，重启后端服务

---

## 📞 获取帮助

如果问题仍未解决，请提供：

1. **浏览器信息**
   - 名称和版本（Chrome 120, Firefox 121等）

2. **Console错误**
   - 完整的错误信息（文本或截图）

3. **Network状态**
   - API请求的状态码和响应

4. **服务器状态**
   - 前端和后端是否都在运行

5. **操作步骤**
   - 详细描述如何重现问题

---

## 🎯 快速自检

运行以下命令检查服务状态：

```bash
# 检查前端
curl http://localhost:5173/eu-doc/

# 检查后端
curl http://localhost:3007/api/certificates

# 检查数据库
ls -lh server/data/eu-doc.db
```

如果所有命令都正常返回，问题可能在浏览器端。

---

**测试日期：** 2026-06-16  
**版本：** v1.6.0+  
**文档创建：** Claude Opus 4.8

