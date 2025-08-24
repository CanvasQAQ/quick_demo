// src/main/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { ApiConfig } from '../../src/types/api'
import { FlaskServerStatus, ApiTestResult } from '../../src/shared/flaskapi_type';
// 定义回调函数类型
type CallbackFunction = (event: IpcRendererEvent, ...args: any[]) => void

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // 窗口状态监听
  onMaximize: (callback: CallbackFunction) => ipcRenderer.on('window-maximized', callback),
  onUnmaximize: (callback: CallbackFunction) => ipcRenderer.on('window-unmaximized', callback),

  
  saveApiConfig: (config: ApiConfig) => ipcRenderer.invoke('save-api-config', config),
  loadApiConfig: () => ipcRenderer.invoke('load-api-config'),
  // 其他 IPC 通信方法可以根据需要添加
  // 例如：invokeExample: (data: any) => ipcRenderer.invoke('example-channel', data),
  
  // 移除监听器的方法（可选）
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),

  getFlaskServerStatus: (): Promise<FlaskServerStatus> => 
  ipcRenderer.invoke('flask-get-status'),
  
  startFlaskServer: (): Promise<FlaskServerStatus> => 
    ipcRenderer.invoke('flask-start-server'),
  
  restartFlaskServer: (): Promise<FlaskServerStatus> => 
    ipcRenderer.invoke('flask-restart-server'),
  
  stopFlaskServer: (): Promise<void> => 
    ipcRenderer.invoke('flask-stop-server'),
  
  // API 测试
  testApi: (url: string): Promise<ApiTestResult> => 
    ipcRenderer.invoke('flask-test-api', url),
  
  // 工具函数
  getCurrentPort: (): Promise<number | null> => 
    ipcRenderer.invoke('flask-get-port'),
  
  // 事件监听
  onServerStatusChange: (callback: (status: FlaskServerStatus) => void) => {
    ipcRenderer.on('flask-status-changed', (event, status: FlaskServerStatus) => {
      callback(status);
    });
  },
  
  onServerError: (callback: (error: string) => void) => {
    ipcRenderer.on('flask-error', (event, error: string) => {
      callback(error);
    });
  },
  
})



// 可选：为全局对象添加类型声明
declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      unmaximize: () => Promise<void>
      close: () => Promise<void>
      onMaximize: (callback: CallbackFunction) => void
      onUnmaximize: (callback: CallbackFunction) => void
      removeAllListeners: (channel: string) => void
      loadApiConfig: () => Promise<ApiConfig>
      saveApiConfig: (config: ApiConfig) => Promise<void>
      //flask 环境
      getFlaskServerStatus: () => Promise<FlaskServerStatus>;
      startFlaskServer: () => Promise<FlaskServerStatus>;
      restartFlaskServer: () => Promise<FlaskServerStatus>;
      stopFlaskServer: () => Promise<void>;
      
      // API 测试
      testApi: (url: string) => Promise<ApiTestResult>;
      
      // 工具函数
      getCurrentPort: () => Promise<number | null>;
      
      // 事件监听
      onServerStatusChange: (callback: (status: FlaskServerStatus) => void) => void;
      onServerError: (callback: (error: string) => void) => void;
    }
  }
}
