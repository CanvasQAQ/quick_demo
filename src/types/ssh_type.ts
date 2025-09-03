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
  error?: string;
}

export interface TunnelResult {
  success: boolean;
  data?: {
    localPort: number;
  };
  error?: string;
}

export interface DialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface AppConfig {
  jumpHosts: SSHConnectionConfig[];
  targetConfig: TargetConfig;
  lastUsed: number;
  version: string;
}

export interface SecurityInfo {
  hasStoredKey: boolean;
  hasStoredConfig: boolean;
  configAge?: number;
}


// 添加IPC响应类型
export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

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
  error?: string;
}

export interface TunnelResult {
  success: boolean;
  data?: {
    localPort: number;
  };
  error?: string;
}

export interface DialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface AppConfig {
  jumpHosts: SSHConnectionConfig[];
  targetConfig: TargetConfig;
  lastUsed: number;
  version: string;
}

export interface SecurityInfo {
  hasStoredKey: boolean;
  hasStoredConfig: boolean;
  configAge?: number;
}
