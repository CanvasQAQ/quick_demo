# 字体配置指南

## 📋 安装步骤

### 1. 下载字体文件
请将 `MesloLGS NF Regular.ttf` 字体文件放置到以下位置：
```
src/assets/fonts/MesloLGS NF Regular.ttf
```

### 2. 字体来源
推荐从以下位置下载 MesloLGS NF 字体：
- [Nerd Fonts 官方仓库](https://github.com/ryanoasis/nerd-fonts/releases)
- [直接下载 MesloLGS NF](https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/Meslo/S/Regular/complete/Meslo%20LG%20S%20Regular%20Nerd%20Font%20Complete.ttf)

## 🔧 已配置的功能

### 字体加载机制
- ✅ CSS `@font-face` 规则自动加载字体
- ✅ 字体加载状态检测
- ✅ 智能回退字体栈
- ✅ 字体预加载优化
- ✅ 构建时自动打包字体文件

### 应用范围
字体将应用到以下组件：
- 🖥️ **Xterm.js 终端** - 主要终端显示区域
- 📝 **任务列表** - 命令文本显示
- 📋 **任务头部** - 命令信息显示
- 🔤 **所有代码文本** - 统一的等宽字体体验

### 字体回退栈
```css
font-family: 'MesloLGS NF', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Liberation Mono', 'DejaVu Sans Mono', 'Courier New', monospace;
```

## 🧪 测试验证

### 开发环境测试
```bash
npm run dev
```

### 生产构建测试
```bash
npm run build
npm run dist
```

### 字体加载验证
打开浏览器开发者工具，在 Console 中查看：
- ✅ `"✅ MesloLGS NF font loaded successfully"` - 字体加载成功
- ⚠️ `"⚠️ MesloLGS NF font failed to load, using fallback fonts"` - 使用回退字体

## 📁 相关文件

- `src/assets/fonts.css` - 字体CSS定义
- `src/utils/fontLoader.ts` - 字体加载工具
- `electron.vite.config.js` - 构建配置
- `src/components/Terminal/XtermTaskOutput.vue` - 终端组件
- `src/components/Terminal/TaskSidebar.vue` - 任务列表组件

## 🎨 字体特性

MesloLGS NF 字体提供：
- 📏 **完美等宽** - 所有字符宽度一致
- 🔤 **Nerd Font 图标** - 内置编程相关图标
- 👁️ **高可读性** - 优化的字符形状
- 🌍 **广泛兼容** - 支持多种操作系统
- ⚡ **性能优化** - 针对终端使用优化

## 🔍 故障排除

### 字体未显示
1. 确认字体文件路径正确：`src/assets/fonts/MesloLGS NF Regular.ttf`
2. 检查控制台错误信息
3. 确认字体文件没有损坏

### 构建后字体丢失
1. 确认 `electron.vite.config.js` 包含 `assetsInclude` 配置
2. 检查 `dist/assets/` 目录是否包含字体文件
3. 验证相对路径是否正确

### 字体加载缓慢
1. 字体文件大小过大 - 考虑使用压缩版本
2. 网络连接问题 - 本地开发不应受影响
3. 浏览器缓存问题 - 清空缓存重试