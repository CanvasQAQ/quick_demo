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

### Vue Router Structure
Routes are numbered (1-8) corresponding to sidebar menu items:
- `/1` - Home dashboard
- `/2` - Component demos
- `/3` - Pinia state management demos
- `/4` - Settings panel
- `/5` - Flask API integration demo
- `/6` - SSH configuration interface
- `/8` - Terminal manager

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