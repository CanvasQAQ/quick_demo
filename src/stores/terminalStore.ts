import { defineStore } from 'pinia';
import { TerminalStatus, TerminalOutput, Task, FavoriteCommand, CommandHistory } from '@/types/terminal.ts';
import { terminalService } from '@/services/terminalService';
import { nanoid } from 'nanoid';

interface TerminalState {
  isConnected: boolean;
  status: TerminalStatus | null;
  outputHistory: TerminalOutput[];
  currentCommand: string;
  connectionError: string | null;
  sessionId: string | null;
  
  // 新的任务管理状态
  tasks: Task[];
  currentTaskId: string | null;
  commandHistory: string[];
  favoriteCommands: FavoriteCommand[];
  isExecuting: boolean;
}

export const useTerminalStore = defineStore('terminal', {
  state: (): TerminalState => ({
    isConnected: false,
    status: null,
    outputHistory: [],
    currentCommand: '',
    connectionError: null,
    sessionId: null,
    
    // 任务管理状态
    tasks: [],
    currentTaskId: null,
    commandHistory: [],
    favoriteCommands: [],
    isExecuting: false
  }),

  getters: {
    // 获取当前任务
    currentTask: (state): Task | undefined => {
      return state.tasks.find(task => task.id === state.currentTaskId);
    },
    
    // 获取运行中的任务
    runningTasks: (state): Task[] => {
      return state.tasks.filter(task => task.status === 'running');
    },
    
    // 获取最近的命令历史
    recentCommands: (state): string[] => {
      return state.commandHistory.slice(-10);
    }
  },

  actions: {
    // 连接到后端
    async connect(host: string, port: number) {
      this.connectionError = null;
      const result = await terminalService.connect({ host, port });
      
      if (result.success && result.sessionId) {
        this.isConnected = true;
        this.sessionId = result.sessionId;
        this.setupEventListeners();
      } else {
        this.connectionError = result.message || 'Connection failed';
        throw new Error(this.connectionError);
      }
    },

    // 断开连接
    disconnect() {
      terminalService.disconnect();
      this.isConnected = false;
      this.status = null;
      this.sessionId = null;
      this.outputHistory = [];
      this.isExecuting = false;
      
      // 停止所有运行中的任务
      this.tasks.forEach(task => {
        if (task.status === 'running') {
          task.status = 'error';
          task.endTime = new Date();
          task.output += '\n[连接已断开]';
        }
      });
      
      terminalService.removeAllListeners();
    },

    // 执行命令 - 返回任务ID
    executeCommand(command: string): string {
      if (!this.isConnected || !this.sessionId) {
        throw new Error('Not connected to terminal');
      }

      // 创建新任务
      const task: Task = {
        id: nanoid(),
        command: command.trim(),
        status: 'running',
        startTime: new Date(),
        output: '',
        sessionId: this.sessionId
      };

      // 添加到任务列表
      this.tasks.unshift(task); // 新任务在前面
      this.currentTaskId = task.id;
      this.isExecuting = true;

      // 添加到命令历史
      this.addToCommandHistory(command.trim());

      // 执行命令，传递taskId
      terminalService.executeCommand(command.trim(), task.id);
      
      return task.id;
    },

    // 删除任务
    deleteTask(taskId: string) {
      const index = this.tasks.findIndex(task => task.id === taskId);
      if (index !== -1) {
        this.tasks.splice(index, 1);
        
        // 如果删除的是当前任务，清除当前任务ID
        if (this.currentTaskId === taskId) {
          this.currentTaskId = null;
        }
      }
    },

    // 清空所有任务
    clearAllTasks() {
      this.tasks = [];
      this.currentTaskId = null;
      this.isExecuting = false;
    },

    // 添加到命令历史
    addToCommandHistory(command: string) {
      // 避免重复添加相同的命令
      const lastCommand = this.commandHistory[this.commandHistory.length - 1];
      if (lastCommand !== command) {
        this.commandHistory.push(command);
        
        // 限制历史记录数量
        if (this.commandHistory.length > 100) {
          this.commandHistory = this.commandHistory.slice(-100);
        }
      }
    },

    // 添加到收藏命令
    addToFavorites(favoriteCommand: FavoriteCommand) {
      // 检查是否已存在
      const exists = this.favoriteCommands.some(fav => fav.command === favoriteCommand.command);
      if (!exists) {
        this.favoriteCommands.push(favoriteCommand);
      }
    },

    // 删除收藏命令
    removeFavorite(commandId: string) {
      const index = this.favoriteCommands.findIndex(fav => fav.id === commandId);
      if (index !== -1) {
        this.favoriteCommands.splice(index, 1);
      }
    },

    // 更新任务输出
    updateTaskOutput(taskId: string, output: string) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        task.output += output;
      }
    },

    // 完成任务
    completeTask(taskId: string, exitCode: number, message?: string) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = exitCode === 0 ? 'success' : 'error';
        task.endTime = new Date();
        task.exitCode = exitCode;
        task.duration = (task.endTime.getTime() - task.startTime.getTime()) / 1000;
        
        if (message) {
          task.output += `\n${message}`;
        }
        
        // 更新执行状态
        const stillRunning = this.tasks.some(t => t.status === 'running');
        this.isExecuting = stillRunning;
      }
    },

    // 设置事件监听器
    setupEventListeners() {
      terminalService.onOutput((output: string, taskId?: string) => {
        if (taskId) {
          // 多任务模式：根据taskId更新对应任务
          const task = this.tasks.find(t => t.id === taskId);
          if (task) {
            task.output += output;
          }
        } else {
          // 兼容模式：查找当前运行中的任务
          const runningTask = this.tasks.find(task => task.status === 'running');
          if (runningTask) {
            runningTask.output += output;
          }
        }
        
        // 保持兼容性，也添加到原有的输出历史
        this.outputHistory.push({
          output: output,
          type: 'stdout',
          sessionId: this.sessionId || ''
        });
      });

      terminalService.onStatus((status: string, command?: string, taskId?: string) => {
        this.status = status;
        
        if (taskId) {
          // 多任务模式：更新特定任务状态
          const task = this.tasks.find(t => t.id === taskId);
          if (task && status === 'executing') {
            // 确保任务状态为运行中
            task.status = 'running';
          }
        }
      });

      terminalService.onComplete((exitCode: number, message?: string, taskId?: string) => {
        if (taskId) {
          // 多任务模式：完成指定任务
          this.completeTask(taskId, exitCode, message);
        } else {
          // 兼容模式：完成当前运行的任务
          const runningTask = this.tasks.find(task => task.status === 'running');
          if (runningTask) {
            this.completeTask(runningTask.id, exitCode, message);
          }
        }
        
        // 保持兼容性
        this.outputHistory.push({
          output: message || '',
          type: 'system',
          sessionId: this.sessionId || ''
        });
      });

      terminalService.onError((error: string, taskId?: string) => {
        if (taskId) {
          // 多任务模式：标记指定任务为失败
          this.completeTask(taskId, 1, `Error: ${error}`);
        } else {
          // 兼容模式：标记当前运行任务为失败
          const runningTask = this.tasks.find(task => task.status === 'running');
          if (runningTask) {
            this.completeTask(runningTask.id, 1, `Error: ${error}`);
          }
        }
        
        // 保持兼容性
        this.outputHistory.push({
          output: `Error: ${error}`,
          type: 'error',
          sessionId: this.sessionId || ''
        });
      });
    },

    // 清除错误
    clearError() {
      this.connectionError = null;
    },

    // 中断指定任务
    interruptTask(taskId: string): boolean {
      if (!this.isConnected) {
        return false;
      }

      const task = this.tasks.find(t => t.id === taskId);
      if (!task || task.status !== 'running') {
        return false;
      }

      const success = terminalService.interruptCommand(taskId);
      if (success) {
        // 标记任务为中断状态 - 实际状态更新会通过事件监听器处理
        console.log(`Interrupt signal sent for task: ${taskId}`);
      }
      
      return success;
    },

    // 中断当前选中的任务（保持向后兼容）
    interruptCurrentCommand(): boolean {
      if (!this.currentTaskId) {
        return false;
      }
      return this.interruptTask(this.currentTaskId);
    },

    // 清除输出历史（保持兼容性）
    clearOutput() {
      this.outputHistory = [];
    },

    // 移除所有监听器
    removeAllListeners() {
      terminalService.removeAllListeners();
    }
  }
});
