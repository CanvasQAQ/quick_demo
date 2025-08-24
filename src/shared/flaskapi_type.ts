export interface FlaskServerStatus {
  isRunning: boolean;
  port?: number;
  pid?: number;
  lastError?: string;
}

export interface ApiTestResult {
  success: boolean;
  message: string;
  statusCode?: number;
  responseTime?: number;
}

export interface FlaskApi {
  startFlaskServer(): Promise<FlaskServerStatus>;
  restartFlaskServer(): Promise<FlaskServerStatus>;
  testApiConnectivity(apiUrl: string): Promise<ApiTestResult>;
  testCurrentServer(): Promise<ApiTestResult>;
  getCurrentPort(): Promise<number | null>;
}

