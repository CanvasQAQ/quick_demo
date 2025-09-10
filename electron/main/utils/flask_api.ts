import { ipcMain, BrowserWindow } from 'electron';
import * as net from 'net';
import * as child_process from 'child_process';
import * as path from 'path';
import { FlaskServerStatus, ApiTestResult } from '../../../src/shared/flaskapi_type';


// export interface FlaskServerStatus {
//   isRunning: boolean;
//   port?: number;
//   pid?: number;
//   lastError?: string;
// }

// export interface ApiTestResult {
//   success: boolean;
//   message: string;
//   statusCode?: number;
//   responseTime?: number;
// }

export class FlaskApiManager {
  private flaskProcess: child_process.ChildProcess | null = null;
  private currentPort: number | null = null;
  private backendPath: string;

  constructor(backendPath: string = path.join(process.cwd(), 'backend')) {
    this.backendPath = backendPath;
    this.setupIpcHandlers();
  }

  /**
   * 设置所有IPC处理器
   */
  private setupIpcHandlers(): void {
    console.log('Setting up Flask API IPC handlers...');

    // 服务器状态获取
    ipcMain.handle('flask-get-status', async () => {
      console.log('Handling flask-get-status request');
      return await this.getServerStatus();
    });

    // 启动服务器
    ipcMain.handle('flask-start-server', async () => {
      console.log('Handling flask-start-server request');
      const status = await this.startFlaskServer();
      this.broadcastStatusChange(status);
      return status;
    });

    // 重启服务器
    ipcMain.handle('flask-restart-server', async () => {
      console.log('Handling flask-restart-server request');
      const status = await this.restartFlaskServer();
      this.broadcastStatusChange(status);
      return status;
    });

    // 停止服务器
    ipcMain.handle('flask-stop-server', async () => {
      console.log('Handling flask-stop-server request');
      this.stopFlaskServer();
      const status = await this.getServerStatus();
      this.broadcastStatusChange(status);
    });

    // API测试
    ipcMain.handle('flask-test-api', async (event, apiUrl: string) => {
      console.log('Handling flask-test-api request:', apiUrl);
      return await this.testApiConnectivity(apiUrl);
    });

    // 获取端口
    ipcMain.handle('flask-get-port', async () => {
      console.log('Handling flask-get-port request');
      return this.getCurrentPort();
    });

    console.log('All Flask API IPC handlers registered');
  }

  /**
   * 获取服务器状态
   */
  async getServerStatus(): Promise<FlaskServerStatus> {
    return {
      isRunning: this.flaskProcess !== null,
      port: this.currentPort,
      pid: this.flaskProcess?.pid,
      lastError: undefined
    };
  }

  /**
   * 广播状态变化到所有渲染进程
   */
  private broadcastStatusChange(status: FlaskServerStatus): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('flask-status-changed', status);
    });
  }

  /**
   * 获取可用端口
   */
  private async getAvailablePort(startPort: number = 5000): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          server.close(() => {
            this.getAvailablePort(startPort + 1).then(resolve).catch(reject);
          });
        } else {
          reject(err);
        }
      });

      server.once('listening', () => {
        const port = (server.address() as net.AddressInfo).port;
        server.close(() => resolve(port));
      });

      server.listen(startPort, '127.0.0.1');
    });
  }

  /**
   * 启动Flask服务器
   */
  async startFlaskServer(): Promise<FlaskServerStatus> {
    try {
      if (this.flaskProcess) {
        this.stopFlaskServer();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const port = await this.getAvailablePort();
      this.currentPort = port;

      console.log(`Starting Flask server on port ${port}`);

      const flaskAppPath = path.join(this.backendPath, 'app.py');
      console.log('Flask app path:', flaskAppPath);

      const fs = require('fs');
      if (!fs.existsSync(flaskAppPath)) {
        throw new Error(`Flask app not found at: ${flaskAppPath}`);
      }

      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      
      this.flaskProcess = child_process.spawn(pythonCommand, [flaskAppPath, port.toString()], {
        cwd: this.backendPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      this.flaskProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`Flask stdout: ${output}`);
      });

      this.flaskProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        console.error(`Flask stderr: ${error}`);
      });

      this.flaskProcess.on('close', (code) => {
        console.log(`Flask process exited with code ${code}`);
        this.flaskProcess = null;
        this.currentPort = null;
        this.broadcastStatusChange({ isRunning: false });
      });

      this.flaskProcess.on('error', (error) => {
        console.error('Failed to start Flask process:', error);
        this.broadcastStatusChange({ 
          isRunning: false, 
          lastError: error.message 
        });
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const testResult = await this.testCurrentServer();

      return {
        isRunning: testResult.success,
        port: port,
        pid: this.flaskProcess?.pid,
        lastError: testResult.success ? undefined : testResult.message
      };

    } catch (error) {
      console.error('Error starting Flask server:', error);
      return {
        isRunning: false,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 重启服务器
   */
  async restartFlaskServer(): Promise<FlaskServerStatus> {
    this.stopFlaskServer();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await this.startFlaskServer();
  }

  /**
   * 停止服务器
   */
  private stopFlaskServer(): void {
    if (this.flaskProcess) {
      console.log('Stopping Flask server...');
      try {
        if (process.platform === 'win32') {
          child_process.exec(`taskkill /pid ${this.flaskProcess.pid} /f /t`);
        } else {
          this.flaskProcess.kill('SIGTERM');
        }
      } catch (error) {
        console.error('Error stopping Flask server:', error);
      }
      this.flaskProcess = null;
    }
    this.currentPort = null;
  }

  /**
   * 测试API连通性
   */
  async testApiConnectivity(apiUrl: string): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      const http = require('http');
      const parsedUrl = new URL(apiUrl);
      
      return new Promise((resolve) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname,
          method: 'GET',
          timeout: 5000
        };

        const req = http.request(options, (res: any) => {
          const responseTime = Date.now() - startTime;
          
          res.on('data', () => {}); // 消耗数据但不处理
          
          res.on('end', () => {
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              message: `HTTP ${res.statusCode}`,
              statusCode: res.statusCode,
              responseTime: responseTime
            });
          });
        });

        req.on('error', (error: Error) => {
          resolve({
            success: false,
            message: `连接错误: ${error.message}`,
            responseTime: Date.now() - startTime
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            success: false,
            message: '请求超时',
            responseTime: Date.now() - startTime
          });
        });

        req.end();
      });

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * 测试当前服务器
   */
  async testCurrentServer(): Promise<ApiTestResult> {
    if (!this.currentPort) {
      return {
        success: false,
        message: 'Flask服务器未启动'
      };
    }

    const testUrls = [
      `http://127.0.0.1:${this.currentPort}/health`,
      `http://127.0.0.1:${this.currentPort}/`,
      `http://127.0.0.1:${this.currentPort}/api/data`
    ];

    for (const testUrl of testUrls) {
      const result = await this.testApiConnectivity(testUrl);
      if (result.success) {
        return result;
      }
    }

    return {
      success: false,
      message: '所有测试端点均无法访问'
    };
  }

  /**
   * 获取当前端口
   */
  getCurrentPort(): number | null {
    return this.currentPort;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopFlaskServer();
    // 移除所有IPC处理器
    ipcMain.removeHandler('flask-get-status');
    ipcMain.removeHandler('flask-start-server');
    ipcMain.removeHandler('flask-restart-server');
    ipcMain.removeHandler('flask-stop-server');
    ipcMain.removeHandler('flask-test-api');
    ipcMain.removeHandler('flask-get-port');
  }
}

// 导出单例实例
export const flaskApi = new FlaskApiManager();
