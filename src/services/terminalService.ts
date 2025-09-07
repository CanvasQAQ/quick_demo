import { io, Socket } from 'socket.io-client';

export interface TerminalConfig {
  host: string;
  port: number;
}

export interface ConnectionResult {
  success: boolean;
  sessionId?: string;
  message?: string;
}

class TerminalService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private connectResolve: ((result: ConnectionResult) => void) | null = null;
  private outputCallbacks: Array<(output: string) => void> = [];
  private errorCallbacks: Array<(error: string) => void> = [];
  private statusCallbacks: Array<(status: string, command?: string) => void> = [];
  private completeCallbacks: Array<(exitCode: number, message?: string) => void> = [];
  // 连接到后端
  async connect(config: TerminalConfig): Promise<ConnectionResult> {
    return new Promise((resolve) => {
      try {
        console.log('Connecting to terminal server:', config.host, config.port);
        const url = `http://${config.host}:${config.port}`;
        
        this.socket = io(url, {
          transports: ['websocket', 'polling'],
          reconnection: false,
          timeout: 5000
        });

        // 存储resolve函数以便在事件回调中使用
        this.connectResolve = resolve;

        // 监听连接成功事件
        this.socket.on('connect', () => {
          console.log('SocketIO connected successfully');
          
          // 监听 terminal_connected 事件 - 添加错误处理
          this.socket?.on('terminal_connected', (data: any) => {
            console.log('Received terminal_connected event:', data);
            
            // 添加数据验证
            if (data && typeof data === 'object' && data.sessionId) {
              this.sessionId = data.sessionId;
              if (this.connectResolve) {
                this.connectResolve({
                  success: true,
                  sessionId: data.sessionId,
                  message: data.message || 'Connected successfully'
                });
                this.connectResolve = null;
              }
            } else {
              console.error('Invalid terminal_connected data:', data);
              if (this.connectResolve) {
                this.connectResolve({
                  success: false,
                  message: 'Invalid connection response from server'
                });
                this.connectResolve = null;
              }
            }
          });

          // 监听其他可能的事件
          this.setupEventListeners();

          // 发送连接请求
          console.log('Sending terminal_connect event');
          this.socket?.emit('terminal_connect', {});
        });

        // 监听连接错误
        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          if (this.connectResolve) {
            this.connectResolve({
              success: false,
              message: `Connection failed: ${error.message}`
            });
            this.connectResolve = null;
          }
        });

        // 监听断开连接
        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected:', reason);
          this.sessionId = null;
        });

        // 设置连接超时
        setTimeout(() => {
          if (this.connectResolve) {
            console.log('Connection timeout');
            this.connectResolve({
              success: false,
              message: 'Connection timeout - no response from server'
            });
            this.connectResolve = null;
            this.disconnect();
          }
        }, 10000);

      } catch (error) {
        console.error('Connection setup error:', error);
        resolve({
          success: false,
          message: `Connection error: ${error}`
        });
      }
    });
  }



  // 执行命令
  async executeCommand(command: string): Promise<boolean> {
    if (!this.socket || !this.sessionId) {
      console.error('Not connected to terminal');
      return false;
    }

    return new Promise((resolve) => {
      console.log('Executing command:', command);

      // 监听命令完成事件
      const completeHandler = (data: any) => {
        if (data && data.sessionId === this.sessionId) {
          this.socket?.off('terminal_complete', completeHandler);
          console.log('Command execution completed');
          resolve(true);
        }
      };

      this.socket?.on('terminal_complete', completeHandler);

      // 发送命令
      this.socket?.emit('terminal_command', {
        sessionId: this.sessionId,
        command: command.trim()
      });

      // 设置命令执行超时
      setTimeout(() => {
        this.socket?.off('terminal_complete', completeHandler);
        console.warn('Command execution timeout');
        resolve(false);
      }, 30000);
    });
  }

  // 获取当前会话ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.socket?.connected === true && this.sessionId !== null;
  }

  // 断开连接
  disconnect(): void {
    if (this.socket && this.sessionId) {
      console.log('Disconnecting terminal session:', this.sessionId);
      this.socket.emit('terminal_disconnect', {
        sessionId: this.sessionId
      });
    }
    
    this.socket?.disconnect();
    this.socket = null;
    this.sessionId = null;
    this.connectResolve = null;
    
    console.log('Terminal service disconnected');
  }
  // 添加输出监听器
  onOutput(callback: (output: string) => void): void {
    this.outputCallbacks.push(callback);
  }

  // 添加错误监听器
  onError(callback: (error: string) => void): void {
    this.errorCallbacks.push(callback);
  }

  // 移除监听器
  offOutput(callback: (output: string) => void): void {
    this.outputCallbacks = this.outputCallbacks.filter(cb => cb !== callback);
  }

  offError(callback: (error: string) => void): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  // 触发输出回调
  private triggerOutput(output: string): void {
    this.outputCallbacks.forEach(callback => callback(output));
  }

  // 触发错误回调
  private triggerError(error: string): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }

  // 清理所有监听器
  // 添加状态监听器
  onStatus(callback: (status: string, command?: string) => void): void {
    this.statusCallbacks.push(callback);
  }

  // 添加完成监听器
  onComplete(callback: (exitCode: number, message?: string) => void): void {
    this.completeCallbacks.push(callback);
  }

  // 触发状态回调
  private triggerStatus(status: string, command?: string): void {
    this.statusCallbacks.forEach(callback => callback(status, command));
  }

  // 触发完成回调
  private triggerComplete(exitCode: number, message?: string): void {
    this.completeCallbacks.forEach(callback => callback(exitCode, message));
  }

  // 修改 setupEventListeners 来使用所有回调
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 监听终端输出
    this.socket.on('terminal_output', (data: any) => {
      if (data && data.sessionId === this.sessionId && data.output) {
        console.log('Terminal output:', data.output);
        this.triggerOutput(data.output);
      }
    });

    // 监听终端错误
    this.socket.on('terminal_error', (data: any) => {
      if (data && data.sessionId === this.sessionId && data.error) {
        console.error('Terminal error:', data.error);
        this.triggerError(data.error);
      }
    });

    // 监听终端状态
    this.socket.on('terminal_status', (data: any) => {
      if (data && data.sessionId === this.sessionId) {
        console.log('Terminal status:', data.status, data.command);
        this.triggerStatus(data.status, data.command);
      }
    });

    // 监听命令完成
    this.socket.on('terminal_complete', (data: any) => {
      if (data && data.sessionId === this.sessionId) {
        console.log('Command completed with exit code:', data.exitCode, data.message);
        this.triggerComplete(data.exitCode, data.message);
      }
    });
  }

  // 清理所有监听器
  cleanup(): void {
    this.outputCallbacks = [];
    this.errorCallbacks = [];
    this.statusCallbacks = [];
    this.completeCallbacks = [];
  }
}

// 创建单例实例
export const terminalService = new TerminalService();
