import { defineStore } from 'pinia';
import { TerminalStatus, TerminalOutput } from '@/types/terminal.ts';
import { terminalService } from '@/services/terminalService';

interface TerminalState {
  isConnected: boolean;
  status: TerminalStatus | null;
  outputHistory: TerminalOutput[];
  currentCommand: string;
  connectionError: string | null;
}

export const useTerminalStore = defineStore('terminal', {
  state: (): TerminalState => ({
    isConnected: false,
    status: null,
    outputHistory: [],
    currentCommand: '',
    connectionError: null
  }),

  actions: {
    // 连接到后端
    async connect(host: string, port: number) {
      this.connectionError = null;
      const result = await terminalService.connect({ host, port });
      
      if (result.success && result.sessionId) {
        this.isConnected = true;
        this.setupEventListeners();
      } else {
        this.connectionError = result.message || 'Connection failed';
      }
    },

    // 断开连接
    disconnect() {
      terminalService.disconnect();
      this.isConnected = false;
      this.status = null;
      this.outputHistory = [];
      terminalService.removeAllListeners();
    },

    // 执行命令
    executeCommand(command: string) {
      if (terminalService.executeCommand(command)) {
        this.currentCommand = command;
      }
    },

    // 设置事件监听器
   setupEventListeners() {
      terminalService.onOutput((output: string) => {
        this.outputHistory.push({
          output: output,          // 将字符串包装成对象
          type: 'stdout',          // 根据实际情况设置类型
          sessionId: this.status?.sessionId || ''  // 添加 sessionId
        });
      });

      terminalService.onStatus((status) => {
        this.status = status;
      });

      terminalService.onComplete((data) => {
        this.outputHistory.push({
          output: data.message,
          type: 'system',
          sessionId: data.sessionId
        });
      });

      terminalService.onError((error) => {
        this.outputHistory.push({
          output: `Error: ${error.error}`,
          type: 'error',           // 或者 'stderr'
          sessionId: error.sessionId
        });
      });
    }

  }
});
