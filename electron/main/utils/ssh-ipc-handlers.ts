import { ipcMain } from 'electron';
import { SSHTunnelManager } from './ssh-tunnel-manager';
import { SecurityManager } from './security-manager';
import { dialog, BrowserWindow } from 'electron';

export class IPCHandlers {
  private sshManager: SSHTunnelManager;
  private securityManager: SecurityManager;
  private mainWindow: BrowserWindow | null;

  constructor(sshManager: SSHTunnelManager, securityManager: SecurityManager, mainWindow: BrowserWindow | null) {
    this.sshManager = sshManager;
    this.securityManager = securityManager;
    this.mainWindow = mainWindow;
  }

  // 注册所有IPC处理器
  registerAllHandlers(): void {
    this.registerSSHHandlers();
    this.registerSecurityHandlers();
    this.registerDialogHandlers();
  }

  // SSH相关处理器
  private registerSSHHandlers(): void {
    // 建立SSH隧道
    ipcMain.handle('establish-ssh-tunnel', async (event, jumpHosts, targetConfig) => {
      try {
        const result = await this.sshManager.createMultiHopTunnel(jumpHosts, targetConfig);
        return this.createSuccessResponse(result);
      } catch (error) {
        return this.createErrorResponse(error, '建立SSH隧道失败');
      }
    });

    // 断开所有连接
    ipcMain.handle('cleanup-connections', async () => {
      try {
        this.sshManager.cleanupConnections();
        return this.createSuccessResponse(null);
      } catch (error) {
        return this.createErrorResponse(error, '清理连接失败');
      }
    });

    // 获取连接状态
    ipcMain.handle('get-connection-status', async () => {
      try {
        const status = this.sshManager.getConnectionStatus();
        return this.createSuccessResponse(status);
      } catch (error) {
        return this.createErrorResponse(error, '获取连接状态失败');
      }
    });
  }

  // 安全相关处理器
  private registerSecurityHandlers(): void {
    // 加密数据
    ipcMain.handle('encrypt-data', async (event, data) => {
      try {
        const encrypted = this.securityManager.encryptData(data);
        return this.createSuccessResponse(encrypted);
      } catch (error) {
        return this.createErrorResponse(error, '加密数据失败');
      }
    });

    // 解密数据
    ipcMain.handle('decrypt-data', async (event, encryptedData) => {
      try {
        const decrypted = this.securityManager.decryptData(encryptedData);
        return this.createSuccessResponse(decrypted);
      } catch (error) {
        return this.createErrorResponse(error, '解密数据失败');
      }
    });

    // 保存配置
    ipcMain.handle('save-config', async (event, config) => {
      try {
        await this.securityManager.secureStoreConfig(config);
        return this.createSuccessResponse(null);
      } catch (error) {
        return this.createErrorResponse(error, '保存配置失败');
      }
    });

    // 加载配置
    ipcMain.handle('load-config', async () => {
      try {
        const config = await this.securityManager.loadConfig();
        return this.createSuccessResponse(config);
      } catch (error) {
        return this.createErrorResponse(error, '加载配置失败');
      }
    });

    // 清除所有数据
    ipcMain.handle('clear-all-data', async () => {
      try {
        const result = await this.securityManager.clearAllData();
        return this.createSuccessResponse(result);
      } catch (error) {
        return this.createErrorResponse(error, '清除数据失败');
      }
    });

    // 获取安全信息
    ipcMain.handle('get-security-info', async () => {
      try {
        const info = this.securityManager.getSecurityInfo();
        return this.createSuccessResponse(info);
      } catch (error) {
        return this.createErrorResponse(error, '获取安全信息失败');
      }
    });
  }

  // 对话框处理器
  private registerDialogHandlers(): void {
    // 选择文件对话框
    ipcMain.handle('show-open-dialog', async (event, options) => {
      try {
        if (!this.mainWindow) {
          throw new Error('主窗口未初始化');
        }
        
        // 处理 options 为 undefined 的情况
        const dialogOptions: Electron.OpenDialogOptions = {
          title: '选择文件',
          defaultPath: require('os').homedir() + (process.platform === 'win32' ? '\\.ssh' : '/.ssh'),
          properties: ['openFile'],
          ...options // 如果 options 存在，会覆盖上面的默认值
        };
        // console.log(dialogOptions)
        const result = await dialog.showOpenDialog(this.mainWindow, dialogOptions);
        return this.createSuccessResponse(result);
      } catch (error) {
        return this.createErrorResponse(error, '打开对话框失败');
      }
    });
  }


  // 创建成功响应（确保可序列化）
  private createSuccessResponse(data: any): any {
    return {
      success: true,
      data: this.ensureSerializable(data)
    };
  }

  // 创建错误响应
  private createErrorResponse(error: unknown, defaultMessage: string): any {
    return {
      success: false,
      error: error instanceof Error ? error.message : defaultMessage
    };
  }

  // 确保数据可序列化
  private ensureSerializable(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // 如果是基本类型，直接返回
    if (typeof data !== 'object') {
      return data;
    }

    // 如果是Date对象，转换为ISO字符串
    if (data instanceof Date) {
      return data.toISOString();
    }

    // 如果是数组，递归处理每个元素
    if (Array.isArray(data)) {
      return data.map(item => this.ensureSerializable(item));
    }

    // 如果是普通对象，递归处理每个属性
    const result: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        result[key] = this.ensureSerializable(data[key]);
      }
    }
    return result;
  }
}
