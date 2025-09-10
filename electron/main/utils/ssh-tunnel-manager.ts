import { Client, ClientChannel } from 'ssh2';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

export interface SSHConnectionConfig {
  hostname: string;
  port: number;
  username: string;
  authMethod: 'password' | 'privateKey';
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
}

export interface TargetConfig {
  targetHost: string;
  targetPort: number;
  localPort: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  activeConnections: number;
  localPort?: number;
  target?: string;
  connectionTime?: string;
  jumpHosts?: SSHConnectionConfig[]; // 新增字段

}

export class SSHTunnelManager {
  private connections: Map<string, Client>;
  private forwardingServers: Map<number, net.Server>;
  private connectionStatus: ConnectionStatus;

  constructor() {
    this.connections = new Map();
    this.forwardingServers = new Map();
    this.connectionStatus = {
      isConnected: false,
      activeConnections: 0
    };
  }

  // 建立多级SSH隧道
  async createMultiHopTunnel(
    jumpHosts: SSHConnectionConfig[], 
    targetConfig: TargetConfig
  ): Promise<{ localPort: number }> {
    try {
      if (this.connectionStatus.isConnected) {
        throw new Error('已有活跃连接，请先断开现有连接');
      }

      console.log('开始建立多级SSH隧道...');
      
      let previousConnection: Client | null = null;
      const connectionChain: Client[] = [];

      // 按顺序建立跳板机连接
      for (let i = 0; i < jumpHosts.length; i++) {
        const host = jumpHosts[i];
        console.log(`正在连接跳板机 ${i + 1}: ${host.hostname}`);
        
        const connection = await this.createSSHConnection(host, previousConnection);
        this.connections.set(host.hostname, connection);
        connectionChain.push(connection);
        previousConnection = connection;
      }

      // 建立端口转发
      await this.forwardPort(previousConnection!, targetConfig);

      this.connectionStatus = {
        isConnected: true,
        activeConnections: this.connections.size,
        localPort: targetConfig.localPort,
        target: `${targetConfig.targetHost}:${targetConfig.targetPort}`,
        connectionTime: new Date().toISOString(),
        jumpHosts: [...jumpHosts] // 新增这行
      };


      console.log(`SSH隧道建立成功，本地端口: ${targetConfig.localPort}`);
      
      return { localPort: targetConfig.localPort };
    } catch (error) {
      this.cleanupConnections();
      throw error;
    }
  }

  // 创建SSH连接
  private createSSHConnection(
    hostConfig: SSHConnectionConfig, 
    previousConnection: Client | null = null
  ): Promise<Client> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const connectionKey = `${hostConfig.hostname}:${hostConfig.port}`;

      // 连接超时设置
      const connectTimeout = setTimeout(() => {
        conn.end();
        reject(new Error(`连接超时: ${connectionKey}`));
      }, 30000);

      conn.on('ready', () => {
        clearTimeout(connectTimeout);
        console.log(`SSH连接已建立: ${connectionKey}`);
        resolve(conn);
      });

      conn.on('error', (err) => {
        clearTimeout(connectTimeout);
        console.error(`SSH连接错误: ${connectionKey}`, err);
        reject(err);
      });

      conn.on('close', () => {
        console.log(`SSH连接关闭: ${connectionKey}`);
        this.connections.delete(hostConfig.hostname);
        this.updateConnectionStatus();
      });

      // 准备连接配置
      const connectionConfig: any = {
        host: hostConfig.hostname,
        port: hostConfig.port,
        username: hostConfig.username,
        readyTimeout: 20000,
        keepaliveInterval: 10000
      };

      // 设置认证方式
      if (hostConfig.authMethod === 'password' && hostConfig.password) {
        connectionConfig.password = hostConfig.password;
      } else if (hostConfig.authMethod === 'privateKey' && hostConfig.privateKeyPath) {
        try {
          const privateKey = fs.readFileSync(hostConfig.privateKeyPath);
          connectionConfig.privateKey = privateKey;
          if (hostConfig.passphrase) {
            connectionConfig.passphrase = hostConfig.passphrase;
          }
        } catch (error) {
          reject(new Error(`读取私钥文件失败: ${hostConfig.privateKeyPath}`));
          return;
        }
      }

      // 多级跳板连接
      if (previousConnection) {
        previousConnection.forwardOut(
          '127.0.0.1', 
          0, 
          hostConfig.hostname, 
          hostConfig.port,
          (err, stream) => {
            if (err) {
              reject(err);
              return;
            }
            conn.connect({
              ...connectionConfig,
              sock: stream
            });
          }
        );
      } else {
        conn.connect(connectionConfig);
      }
    });
  }

  // 端口转发实现
  private forwardPort(sshConnection: Client, targetConfig: TargetConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // 检查端口是否被占用
      const tester = net.createServer();
      tester.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`本地端口 ${targetConfig.localPort} 已被占用`));
        } else {
          reject(err);
        }
      });

      tester.once('listening', () => {
        tester.close(() => {
          this.createForwardingServer(sshConnection, targetConfig, resolve, reject);
        });
      });

      tester.listen(targetConfig.localPort, '127.0.0.1');
    });
  }

  private createForwardingServer(
    sshConnection: Client, 
    targetConfig: TargetConfig, 
    resolve: () => void, 
    reject: (error: Error) => void
  ) {
    const server = net.createServer((localSocket) => {
      sshConnection.forwardOut(
        '127.0.0.1', 
        0, 
        targetConfig.targetHost, 
        targetConfig.targetPort,
        (err, remoteSocket) => {
          if (err) {
            localSocket.end();
            console.error('端口转发错误:', err);
            return;
          }

          localSocket.pipe(remoteSocket);
          remoteSocket.pipe(localSocket);

          localSocket.on('error', (err) => {
            console.error('本地Socket错误:', err);
          });

          remoteSocket.on('error', (err) => {
            console.error('远程Socket错误:', err);
          });
        }
      );
    });

    server.listen(targetConfig.localPort, '127.0.0.1', (err) => {
      if (err) {
        reject(err);
        return;
      }

      this.forwardingServers.set(targetConfig.localPort, server);
      console.log(`端口转发已启动: 127.0.0.1:${targetConfig.localPort} -> ${targetConfig.targetHost}:${targetConfig.targetPort}`);
      resolve();
    });

    server.on('error', (err) => {
      console.error('转发服务器错误:', err);
      reject(err);
    });
  }

  // 清理所有连接
  cleanupConnections(): void {
    console.log('开始清理SSH连接...');
    
    // 关闭转发服务器
    this.forwardingServers.forEach((server, port) => {
      try {
        server.close();
        console.log(`已关闭转发服务器: 端口 ${port}`);
      } catch (error) {
        console.error(`关闭转发服务器时出错: 端口 ${port}`, error);
      }
    });
    this.forwardingServers.clear();

    // 关闭SSH连接
    this.connections.forEach((conn, hostname) => {
      try {
        conn.end();
        console.log(`已关闭SSH连接: ${hostname}`);
      } catch (error) {
        console.error(`关闭SSH连接时出错: ${hostname}`, error);
      }
    });
    this.connections.clear();

    this.connectionStatus = {
      isConnected: false,
      activeConnections: 0
    };

    console.log('所有连接已清理完成');
  }

  // 获取连接状态
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // 获取所有活跃的本地端口
  getActivePorts(): Array<{port: number, target: string}> {
    const activePorts: Array<{port: number, target: string}> = [];
    
    this.forwardingServers.forEach((server, port) => {
      // 检查服务器是否正在监听
      if (server.listening) {
        // 从端口转发配置中查找对应的目标
        // 这里我们需要存储端口到目标的映射，暂时使用简单的描述
        activePorts.push({
          port: port,
          target: `localhost:${port}` // 可以改进为存储实际的目标地址
        });
      }
    });
    
    return activePorts;
  }

  // 更新连接状态
  private updateConnectionStatus(): void {
    this.connectionStatus.activeConnections = this.connections.size;
    if (this.connections.size === 0) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.localPort = undefined;
      this.connectionStatus.target = undefined;
    }
  }
}
