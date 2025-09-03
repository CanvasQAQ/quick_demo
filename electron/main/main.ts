// src/main/index.ts
import { app, BrowserWindow, ipcMain, shell, Event } from 'electron'
import { join } from 'path'
import { isDev } from './utils'
// import Store from 'electron-store'
const Store = require('electron-store').default
// import('electron-store').then(StoreModule => {
//   const Store = StoreModule.default
// })
import { ApiConfig, DEFAULT_API_CONFIG } from '../../src/types/api'
let mainWindow: BrowserWindow | null = null
import { flaskApi } from './utils/flask_api';
import { SSHTunnelManager } from './utils/ssh-tunnel-manager';
import { SecurityManager } from './utils/security-manager';

import { IPCHandlers } from './utils/ssh-ipc-handlers.ts';
let sshManager: SSHTunnelManager | null = null;
let securityManager: SecurityManager | null = null;
let ipcHandlers: IPCHandlers | null = null;



interface StoreSchema {
  apiConfig: ApiConfig
}

// 定义 Store 的类型接口
interface ElectronStore {
  get: (key: string, defaultValue?: any) => any
  set: (key: string, value: any) => void
  delete: (key: string) => void
  has: (key: string) => boolean
  clear: () => void
}

// 创建 store 实例
const store: ElectronStore = new Store({
  defaults: {
    apiConfig: DEFAULT_API_CONFIG
  }
})


// IPC 处理
ipcMain.handle('load-api-config', (): ApiConfig => {
  return store.get('apiConfig', DEFAULT_API_CONFIG)
})

ipcMain.handle('save-api-config', (event, config: ApiConfig): void => {
  // 验证配置
  if (!config.url || typeof config.port !== 'number') {
    throw new Error('Invalid API configuration')
  }
  
  store.set('apiConfig', config)
})


function initializeManagers(): void {
  sshManager = new SSHTunnelManager();
  securityManager = new SecurityManager();
  ipcHandlers = new IPCHandlers(sshManager, securityManager, mainWindow);
}

function registerIpcHandlers(): void {
  if (ipcHandlers) {
    ipcHandlers.registerAllHandlers();
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: join(__dirname, '../../public/icon.png'),
    show: false
  })

  if (isDev()) {
    console.log(isDev())
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC 通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window-close', () => {
  mainWindow?.close()
})


// 应用事件处理
app.whenReady().then(createWindow)


app.whenReady().then(() => {
  console.log('App is ready');
  
  // 测试启动Flask服务器
  flaskApi.startFlaskServer().then(status => {
    console.log('Flask服务器状态:', status);
  }).catch(error => {
    console.error('启动Flask服务器失败:', error);
  });
  initializeManagers();
  registerIpcHandlers();
});

app.on('window-all-closed', () => {
  sshManager.cleanupConnections();
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 安全设置 - 使用正确的事件处理
app.on('web-contents-created', (event: Event, contents: any) => {
  // 处理新窗口打开（如 target="_blank"）
  contents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 阻止导航到外部URL
  contents.on('will-navigate', (navigationEvent: Event, navigationUrl: string) => {
    const parsedUrl = new URL(navigationUrl)
    
    if (parsedUrl.origin !== 'http://localhost:5173' && !isDev()) {
      navigationEvent.preventDefault()
    }
  })
})