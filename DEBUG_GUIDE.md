# 调试模式使用指南

## 🎯 概览

为了减少生产环境中的日志输出噪音，我们实现了细粒度的调试控制系统。默认情况下，只显示重要的错误和状态信息，调试信息需要手动启用。

## 🔧 启用调试模式

### 前端调试控制

在浏览器控制台中设置以下本地存储项来启用特定模块的调试：

```javascript
// 启用字体加载调试
localStorage.setItem('font-debug', 'true');

// 启用终端服务调试
localStorage.setItem('terminal-debug', 'true');

// 启用 Xterm 组件调试
localStorage.setItem('xterm-debug', 'true');

// 刷新页面使设置生效
location.reload();
```

### 后端调试控制

设置环境变量来启用后端调试：

```bash
# 启用 PTY 处理器调试
export PTY_DEBUG=true

# 运行应用
python backend/app.py
```

## 📊 调试日志分类

### 字体加载器 (`FontLoader`)
- **标签**: `[FontLoader]`
- **启用**: `localStorage.setItem('font-debug', 'true')`
- **内容**: 字体加载状态、预加载进度、错误信息

### 终端服务 (`TerminalService`)
- **标签**: `[TerminalService]`
- **启用**: `localStorage.setItem('terminal-debug', 'true')`
- **内容**: WebSocket连接、命令执行、数据传输

### Xterm组件 (`XtermTaskOutput`)
- **标签**: `[XtermTaskOutput]`
- **启用**: `localStorage.setItem('xterm-debug', 'true')`
- **内容**: 终端初始化、输入输出处理

### PTY处理器 (后端)
- **标签**: `PtyTerminalHandler`
- **启用**: `PTY_DEBUG=true`
- **内容**: 进程创建、数据读写、会话管理

## 🚀 生产环境

生产环境下所有调试日志自动禁用，只保留：
- ✅ 错误日志 (Error)
- ✅ 重要状态信息 (Info)
- ✅ 用户操作反馈
- ❌ 详细调试信息 (Debug)

## 🛠️ 开发建议

### 启用所有调试
```javascript
// 一键启用所有前端调试
localStorage.setItem('font-debug', 'true');
localStorage.setItem('terminal-debug', 'true');
localStorage.setItem('xterm-debug', 'true');
location.reload();
```

### 清除所有调试
```javascript
// 一键清除所有调试设置
localStorage.removeItem('font-debug');
localStorage.removeItem('terminal-debug');
localStorage.removeItem('xterm-debug');
location.reload();
```

### 常用调试场景

1. **字体问题排查**:
   ```javascript
   localStorage.setItem('font-debug', 'true');
   ```

2. **终端连接问题**:
   ```javascript
   localStorage.setItem('terminal-debug', 'true');
   ```
   ```bash
   PTY_DEBUG=true python backend/app.py
   ```

3. **输入输出问题**:
   ```javascript
   localStorage.setItem('xterm-debug', 'true');
   localStorage.setItem('terminal-debug', 'true');
   ```

## 📝 添加新的调试日志

### 前端组件
```typescript
// 调试模式控制
const DEBUG_MODE = import.meta.env.DEV && localStorage.getItem('your-module-debug') === 'true';

function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`[YourModule] ${message}`, ...args);
  }
}

// 使用
debugLog('Debug message', someData);
```

### 后端模块
```python
# 调试模式控制
DEBUG_MODE = os.environ.get('YOUR_MODULE_DEBUG', 'false').lower() == 'true'

def debug_log(message: str, *args):
    if DEBUG_MODE:
        logger.debug(message, *args)

# 使用
debug_log("Debug message: %s", some_data)
```

这样可以保持日志输出的整洁性，同时为开发者提供强大的调试能力。