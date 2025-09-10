# Quick Demo 项目

这是一个基于 Electron 的桌面应用程序，集成了 Vue 3 前端和 Python Flask 后端，提供 SSH 隧道管理和终端功能。

## 项目特色

- 🖥️ 跨平台桌面应用（基于 Electron）
- 🌐 现代化前端界面（Vue 3 + TypeScript + Element Plus）
- 🐍 Python Flask 后端服务
- 🔐 SSH 隧道管理和多跳连接
- 💻 内置终端功能
- ⚡ 实时通信（WebSocket + SocketIO）

## 技术架构

### 前端技术栈
- **界面框架**: Electron + Vue 3 + TypeScript
- **UI 组件**: Element Plus
- **构建工具**: Vite + Electron-Vite
- **状态管理**: Pinia

### 后端技术栈
- **服务端**: Python Flask + SocketIO
- **异步处理**: Eventlet
- **打包构建**: Electron-Builder

## 快速开始

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Python 后端依赖
uv sync
```

### 开发模式

```bash
# 启动前端开发服务 (Linux/Mac)
npm run dev

# 启动前端开发服务 (Windows，处理字符编码)
npm run devwin

# 单独运行 Flask 后端
python backend/app.py [端口号]
# 默认端口为 5000
```

### 构建发布

```bash
# 构建应用
npm run build

# 构建并打包成可分发文件
npm run dist
```

## 主要功能

### 🔗 SSH 隧道管理
- 支持多跳 SSH 连接和跳板机
- 连接池管理和状态监控
- 端口转发和本地服务创建
- 自动清理断开的连接

### 🖥️ 终端管理
- 集成终端界面
- 实时命令执行
- WebSocket 实时通信

### ⚙️ 应用设置
- API 配置管理
- SSH 连接配置
- 主题和界面定制

## 项目结构

```
src/                # Vue 3 渲染进程（主界面）
electron/main/      # Electron 主进程
electron/preload/   # Electron 预加载脚本
backend/            # Python Flask 服务器
dist-electron/      # 构建后的 Electron 文件
dist/               # 构建后的渲染进程文件
```

## 路由页面

- `/1` - 主页仪表盘
- `/2` - 组件演示
- `/3` - Pinia 状态管理演示
- `/4` - 设置面板
- `/5` - Flask API 集成演示
- `/6` - SSH 配置界面
- `/8` - 终端管理器

## 安全特性

- ✅ 上下文隔离已启用
- ✅ 渲染进程禁用 Node 集成
- ✅ 预加载脚本安全 API 暴露
- ✅ SSH 凭证加密存储

## 开发说明

本项目使用 Electron 的 contextBridge 进行安全的主进程-渲染进程通信，支持窗口控制、配置持久化和 SSH 相关功能。界面采用 Element Plus 深色主题，支持自定义样式和响应式设计。
