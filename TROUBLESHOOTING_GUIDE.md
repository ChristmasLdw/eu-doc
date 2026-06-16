# EU-DOC 问题排查指南

## 🐛 报告的问题：搜索页面空白

### 问题描述
点击导航栏的"搜索"按钮后，页面跳转到 `/search`，但显示空白。

### 可能的原因分析

#### 1. JavaScript运行时错误
**检查方法：**
```
1. 打开浏览器开发者工具（F12）
2. 切换到Console标签
3. 刷新页面或点击搜索按钮
4. 查看是否有红色错误信息
```

**常见错误：**
- `Cannot read property 'xxx' of undefined`
- `xxx is not defined`
- `xxx is not a function`

#### 2. API请求失败
**检查方法：**
```
1. 打开浏览器开发者工具（F12）
2. 切换到Network标签
3. 刷新页面
4. 查看API请求状态码（应该是200）
```

**可能问题：**
- 后端服务未启动
- CORS跨域问题
- API端点路径错误

#### 3. React组件渲染错误
**检查方法：**
```
1. 使用React DevTools插件
2. 查看组件树
3. 检查SearchPage是否挂载
4. 检查组件的props和state
```

#### 4. CSS样式问题
**检查方法：**
```
1. 检查Elements标签
2. 查看元素是否存在但不可见
3. 检查display、visibility、opacity等属性
```

---

## 🔧 排查步骤

### 步骤1: 检查控制台错误
```bash
# 在浏览器中：
1. 访问 http://localhost:5173/eu-doc/
2. 打开开发者工具（F12）
3. 点击导航栏"搜索"按钮
4. 观察Console中的错误信息
```

### 步骤2: 检查后端服务
```bash
# 在终端中：
curl http://localhost:3007/api/certificates

# 应该返回JSON数据，如果返回错误或无响应，需要重启后端
cd server
node index.cjs
```

### 步骤3: 检查路由配置
```bash
# 检查路径是否正确
前端路由: /search
组件: SearchPage.jsx
导入: src/App.jsx
```

### 步骤4: 检查SearchPage组件
查看是否有未定义的变量或函数：
- `hasActiveFilters` - 是否正确计算
- `sortOptions` - 是否正确定义
- API调用是否正确

---

## 💡 可能的解决方案

### 解决方案1: 重启开发服务器
```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
npm run dev

# 后端
cd server
node index.cjs
```

### 解决方案2: 清除缓存并重新构建
```bash
# 清除node_modules和重新安装
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### 解决方案3: 检查浏览器兼容性
- 使用最新版Chrome或Firefox
- 清除浏览器缓存
- 禁用浏览器扩展

### 解决方案4: 检查依赖版本
```bash
npm list react react-dom react-router-dom
# 确保版本兼容
```

---

## 📋 测试建议

### 基础测试
1. **直接访问搜索页面**
   - URL: `http://localhost:5173/eu-doc/search`
   - 预期: 显示搜索界面（可能显示最近查看或空状态）

2. **带查询参数访问**
   - URL: `http://localhost:5173/eu-doc/search?q=test`
   - 预期: 显示搜索结果

3. **从首页搜索**
   - 在首页搜索框输入关键词
   - 点击搜索按钮
   - 预期: 跳转到搜索页面并显示结果

### 完整测试流程
```
首页 → 搜索框输入 → 点击搜索 → 查看搜索结果页
首页 → 点击分类标签 → 查看筛选结果
搜索页 → 点击证书卡片 → 查看证书详情
证书详情 → 点击公司名称 → 查看公司页面
```

---

## 🔍 调试技巧

### 1. 添加console.log调试
在SearchPage.jsx中添加：
```javascript
console.log('SearchPage mounted');
console.log('query:', query);
console.log('results:', results);
```

### 2. 检查组件是否渲染
```javascript
// 在return之前添加
console.log('Rendering SearchPage', { loading, error, results });
```

### 3. 使用React DevTools
- 安装React Developer Tools扩展
- 查看Components标签
- 检查SearchPage的Props和Hooks

---

## ✅ 预期行为

### /search 页面应该显示：
1. 搜索框和筛选器
2. 最近查看卡片（无搜索时）
3. 搜索结果列表（有搜索时）
4. 分页器（结果超过一页时）

### 空状态应该显示：
- 友好的空状态提示
- 搜索建议
- 清除筛选器按钮（如果有活动筛选）

---

## 📞 需要提供的信息

如果问题仍未解决，请提供：
1. 浏览器控制台的完整错误信息（截图）
2. Network标签中的API请求状态
3. React DevTools中的组件树截图
4. 使用的浏览器和版本
5. 前端和后端是否都在运行

---

## 🎯 快速诊断清单

- [ ] 前端服务器正在运行（http://localhost:5173）
- [ ] 后端服务器正在运行（http://localhost:3007）
- [ ] 浏览器控制台没有红色错误
- [ ] Network中API请求返回200状态码
- [ ] SearchPage组件在React DevTools中可见
- [ ] 页面上有HTML元素（即使看起来是空白）
- [ ] CSS文件已加载（检查Network标签）

---

**最后更新：** 2026-06-16  
**版本：** v1.6.0+

