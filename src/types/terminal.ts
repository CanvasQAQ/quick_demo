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
