import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface EncryptedData {
  iv: string;
  content: string;
  authTag: string;
  timestamp: number;
}

export interface AppConfig {
  jumpHosts: any[];
  targetConfig: any;
  lastUsed: number;
}

export class SecurityManager {
  private encryptionKey: string;
  private configPath: string;
  private keyStoragePath: string;

  constructor() {
    this.keyStoragePath = this.getSecureKeyStoragePath();
    this.encryptionKey = this.loadOrGenerateEncryptionKey();
    this.configPath = path.join(this.getAppDataPath(), 'config.encrypted');
  }

  // 获取安全的密钥存储路径
  private getSecureKeyStoragePath(): string {
    const appDataPath = this.getAppDataPath();
    return path.join(appDataPath, '.encryption_key');
  }

  // 获取应用数据目录
  private getAppDataPath(): string {
    const appName = 'ssh-tunnel-manager';
    let basePath: string;

    switch (process.platform) {
      case 'win32':
        basePath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        break;
      case 'darwin':
        basePath = path.join(os.homedir(), 'Library', 'Application Support');
        break;
      default:
        basePath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        break;
    }

    return path.join(basePath, appName);
  }

  // 确保目录存在
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
    }
  }

  // 加载或生成加密密钥
  private loadOrGenerateEncryptionKey(): string {
    try {
      this.ensureDirectoryExists(path.dirname(this.keyStoragePath));

      if (fs.existsSync(this.keyStoragePath)) {
        const key = fs.readFileSync(this.keyStoragePath, 'utf8');
        if (key.length === 64) { // 32字节的十六进制表示
          return key;
        }
        console.warn('存储的密钥格式无效，生成新密钥');
      }

      // 生成新密钥
      const newKey = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(this.keyStoragePath, newKey, { 
        mode: 0o600, 
        flag: 'wx' 
      });
      return newKey;

    } catch (error) {
      console.error('密钥管理错误:', error);
      // 如果文件操作失败，使用内存中的临时密钥
      return crypto.randomBytes(32).toString('hex');
    }
  }

  // 加密数据
  encryptData(data: string): EncryptedData {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-gcm', 
        Buffer.from(this.encryptionKey, 'hex'), 
        iv
      );

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        content: encrypted,
        authTag: authTag.toString('hex'),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('加密数据时出错:', error);
      throw new Error('数据加密失败');
    }
  }

  // 解密数据
  decryptData(encryptedData: EncryptedData): string {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('解密数据时出错:', error);
      throw new Error('数据解密失败 - 可能密钥不匹配或数据被篡改');
    }
  }

  // 安全存储配置
  async secureStoreConfig(config: AppConfig): Promise<void> {
    try {
      this.ensureDirectoryExists(path.dirname(this.configPath));

      const configWithTimestamp = {
        ...config,
        lastUsed: Date.now(),
        version: '1.0'
      };

      const configJson = JSON.stringify(configWithTimestamp);
      const encryptedConfig = this.encryptData(configJson);

      // 使用原子写入避免文件损坏
      const tempPath = this.configPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(encryptedConfig), { 
        mode: 0o600 
      });
      
      // 原子性重命名
      fs.renameSync(tempPath, this.configPath);

      console.log('配置已安全存储');
    } catch (error) {
      console.error('存储配置时出错:', error);
      throw new Error('无法保存配置');
    }
  }

  // 加载配置
  async loadConfig(): Promise<AppConfig | null> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const encryptedData = JSON.parse(
        fs.readFileSync(this.configPath, 'utf8')
      ) as EncryptedData;

      const decryptedJson = this.decryptData(encryptedData);
      const config = JSON.parse(decryptedJson) as AppConfig;

      // 验证配置格式
      if (!this.validateConfig(config)) {
        console.warn('配置格式无效');
        return null;
      }

      console.log('配置加载成功');
      return config;

    } catch (error) {
      console.error('加载配置时出错:', error);
      // 不要抛出错误，避免影响应用启动
      return null;
    }
  }

  // 验证配置格式
  private validateConfig(config: any): config is AppConfig {
    return (
      config &&
      typeof config === 'object' &&
      Array.isArray(config.jumpHosts) &&
      config.targetConfig &&
      typeof config.targetConfig === 'object'
    );
  }

  // 清除所有存储的配置和密钥
  async clearAllData(): Promise<{ success: boolean; message: string }> {
    try {
      const filesToRemove: string[] = [];

      if (fs.existsSync(this.configPath)) {
        filesToRemove.push(this.configPath);
      }

      if (fs.existsSync(this.keyStoragePath)) {
        filesToRemove.push(this.keyStoragePath);
      }

      for (const filePath of filesToRemove) {
        try {
          fs.unlinkSync(filePath);
          console.log(`已删除文件: ${filePath}`);
        } catch (error) {
          console.warn(`无法删除文件 ${filePath}:`, error);
        }
      }

      // 重新生成密钥
      this.encryptionKey = this.loadOrGenerateEncryptionKey();

      return { 
        success: true, 
        message: '所有数据已清除' 
      };
    } catch (error) {
      console.error('清除数据时出错:', error);
      return { 
        success: false, 
        message: '清除数据失败' 
      };
    }
  }

  // 生成密码哈希（用于密码认证）
  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
      password, 
      usedSalt, 
      100000, 
      64, 
      'sha512'
    ).toString('hex');

    return { hash, salt: usedSalt };
  }

  // 验证密码
  verifyPassword(password: string, hash: string, salt: string): boolean {
    const newHash = this.hashPassword(password, salt).hash;
    return crypto.timingSafeEqual(
      Buffer.from(newHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  }

  // 生成随机字符串（用于临时令牌等）
  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  // 计算数据哈希（用于完整性验证）
  computeHash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm)
      .update(data)
      .digest('hex');
  }

  // 获取安全信息
  getSecurityInfo(): {
    hasStoredKey: boolean;
    hasStoredConfig: boolean;
    configAge?: number;
  } {
    const hasStoredKey = fs.existsSync(this.keyStoragePath);
    const hasStoredConfig = fs.existsSync(this.configPath);

    let configAge: number | undefined;
    if (hasStoredConfig) {
      try {
        const stats = fs.statSync(this.configPath);
        configAge = Date.now() - stats.mtimeMs;
      } catch (error) {
        console.warn('无法获取配置文件信息:', error);
      }
    }

    return {
      hasStoredKey,
      hasStoredConfig,
      configAge
    };
  }
}

// 导出单例实例
export const securityManager = new SecurityManager();
