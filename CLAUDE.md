# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is an Electron desktop application with a Vue 3 frontend and Python Flask backend, featuring SSH tunnel management and terminal capabilities.

### Core Stack
- **Frontend**: Electron + Vue 3 + TypeScript + Element Plus UI + Vite
- **Backend**: Python Flask + SocketIO + Eventlet
- **Build System**: Electron-Vite for bundling, Electron-Builder for distribution

### Directory Structure
- `src/` - Vue 3 renderer process (main UI)
- `electron/main/` - Electron main process
- `electron/preload/` - Electron preload scripts  
- `backend/` - Python Flask server with SocketIO
- `dist-electron/` - Built Electron files
- `dist/` - Built renderer files

## Development Commands

### Frontend Development
```bash
# Development (Linux/Mac)
npm run dev

# Development (Windows - handles character encoding)
npm run devwin

# Build application
npm run build

# Build and create distributable
npm run dist
```

### Backend Development  
```bash
# Install Python dependencies
uv sync

# Run Flask server directly
python backend/app.py [port]

# Default port is 5000 if not specified
```

## Key Architecture Components

### Main Process (`electron/main/main.ts`)
- Window management and IPC handlers
- SSH tunnel manager integration
- Security manager for credential handling
- Flask API communication bridge
- Electron Store for persistent configuration

### SSH Tunnel System (`electron/main/utils/ssh-tunnel-manager.ts`)
- Multi-hop SSH tunnel support with jump hosts
- Connection pooling and status management
- Port forwarding with local server creation
- Automatic cleanup on disconnection

### Flask Backend (`backend/app.py`)
- SocketIO terminal handler integration
- CORS enabled for Electron renderer
- Health check endpoints
- Real-time WebSocket communication

### Terminal Manager (`/8` - Terminal管理器)
高级终端管理界面，提供完整的命令执行和任务管理功能：

#### 连接管理
- **智能端口选择**: 自动检测Flask API和SSH隧道的活跃端口
- **连接状态监控**: 实时显示连接状态和会话信息
- **灵活连接配置**: 支持自定义主机和端口

#### 任务执行系统
- **实时命令执行**: 通过SocketIO与Python后端实时通信
- **多任务管理**: 支持并行执行多个命令，独立跟踪状态
- **任务历史**: 完整的执行记录，包括开始时间、执行时长、退出码
- **输出流显示**: 实时显示stdout、stderr和系统消息

#### 用户界面特性
- **响应式布局**: 桌面端双栏布局，移动端抽屉式任务列表
- **命令输入增强**: 支持命令历史、自动完成和收藏命令
- **任务操作**: 任务重新执行、删除、清空等管理功能
- **状态指示**: 丰富的视觉反馈和状态标识

#### 技术实现
- **前端组件**: `Terminal.vue`, `TaskSidebar.vue`, `TaskOutput.vue`, `CommandInput.vue`
- **状态管理**: `terminalStore.ts` 使用Pinia管理终端状态
- **后端通信**: 通过SocketIO与Flask后端建立WebSocket连接
- **端口发现**: IPC接口自动获取Flask API和SSH隧道端口

### Vue Router Structure
Routes are numbered (1-8) corresponding to sidebar menu items:
- `/1` - Home dashboard
- `/2` - Component demos  
- `/3` - Pinia state management demos
- `/4` - Settings panel
- `/5` - Flask API integration demo
- `/6` - SSH configuration interface
- `/8` - Terminal manager (高级终端管理界面)

## Development Notes

### IPC Communication
The app uses Electron's contextBridge for secure main-renderer communication. Key IPC channels:
- `load-api-config` / `save-api-config` - Configuration persistence
- `window-*` - Window controls (minimize, maximize, close)
- SSH-related handlers defined in `ssh-ipc-handlers.ts`

### State Management
- Pinia stores in `src/stores/` for Vue state management
- Electron Store for persistent settings (API configs, SSH settings)
- Component state using Vue 3 Composition API

### Styling
- Element Plus with dark theme support
- SCSS with CSS variables for theming
- Tailwind CSS integration
- Custom titlebar styling for frameless window

### Security Features
- Context isolation enabled
- Node integration disabled in renderer
- Preload script for safe API exposure
- SSH credential encryption via SecurityManager