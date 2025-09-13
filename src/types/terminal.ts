export interface TerminalConfig {
  host: string;
  port: number;
  sessionId?: string;
}

export interface CommandRequest {
  sessionId: string;
  command: string;
}

export interface TerminalOutput {
  sessionId: string;
  output: string;
  type: 'stdout' | 'stderr' | 'system';
}

export interface TerminalStatus {
  sessionId: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'executing' | 'idle' | 'error';
  command?: string;
}

export interface ConnectionResult {
  success: boolean;
  sessionId?: string;
  message?: string;
}

// 新的任务管理相关类型定义
export interface Task {
  id: string;
  command: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'interrupted';
  startTime: Date;
  endTime?: Date;
  duration?: number; // 执行时长（秒）
  output: string;
  exitCode?: number;
  sessionId: string;
}

export interface TaskGroup {
  id: string;
  name: string;
  tasks: Task[];
  collapsed: boolean;
}

export interface CommandHistory {
  commands: string[];
  maxSize: number;
  currentIndex: number;
}

export interface FavoriteCommand {
  id: string;
  name: string;
  command: string;
  description?: string;
  category?: string;
}

// 端口选择相关类型定义
export interface PortOption {
  port: number;
  source: 'flask' | 'ssh' | 'manual';
  description: string;
  status?: 'active' | 'inactive' | 'unknown';
  host?: string;
}

export interface AvailablePortsResponse {
  flaskPorts: PortOption[];
  sshPorts: PortOption[];
  success: boolean;
  message?: string;
}
