<template>
  <div class="xterm-task-output">
    <!-- 任务头部信息 -->
    <div class="task-header" v-if="currentTask">
      <el-row justify="space-between" align="middle">
        <el-col :span="16">
          <el-space>
            <!-- 状态图标 -->
            <el-icon class="task-status-icon" :class="getStatusClass(currentTask.status)">
              <Loading v-if="currentTask.status === 'running'" />
              <SuccessFilled v-else-if="currentTask.status === 'success'" />
              <CircleCloseFilled v-else-if="currentTask.status === 'error'" />
              <Clock v-else />
            </el-icon>
            
            <!-- 命令信息 -->
            <div class="task-info">
              <el-text class="command-text">{{ currentTask.command }}</el-text>
              <div class="task-meta">
                <el-text size="small" type="info">
                  {{ formatTime(currentTask.startTime) }}
                  <span v-if="currentTask.duration"> • 耗时 {{ formatDuration(currentTask.duration) }}</span>
                  <span v-if="currentTask.exitCode !== undefined"> • 退出码 {{ currentTask.exitCode }}</span>
                </el-text>
              </div>
            </div>
          </el-space>
        </el-col>
        
        <el-col :span="8" class="text-right">
          <el-space>
            <!-- 终端控制按钮 -->
            <el-button-group size="small">
              <el-button 
                v-if="currentTask.status === 'running'"
                type="warning" 
                @click="handleInterrupt"
                :loading="isInterrupting"
              >
                <el-icon><CircleClose /></el-icon>
                中断
              </el-button>
              
              <el-button 
                v-else
                type="primary" 
                @click="handleReexecute"
              >
                <el-icon><Refresh /></el-icon>
                重新执行
              </el-button>
              
              <el-button @click="handleClear">
                <el-icon><Delete /></el-icon>
                清屏
              </el-button>
              
              <el-button @click="toggleFitMode">
                <el-icon><FullScreen /></el-icon>
                {{ fitMode ? '固定' : '适应' }}
              </el-button>
            </el-button-group>
          </el-space>
        </el-col>
      </el-row>
    </div>
    
    <!-- Xterm.js 终端容器 -->
    <div class="terminal-container" ref="terminalContainer">
      <div 
        ref="terminalElement" 
        class="terminal-wrapper"
        :style="terminalStyle"
      ></div>
      
      <!-- 连接状态覆盖层 -->
      <div v-if="!isConnected || !currentTask" class="terminal-overlay">
        <el-empty description="请选择一个任务" :image-size="80">
          <template #image>
            <el-icon size="60" color="var(--el-color-info)">
              <Monitor />
            </el-icon>
          </template>
        </el-empty>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="terminal-loading">
        <el-loading-area>
          <el-icon class="is-loading"><Loading /></el-icon>
          正在初始化终端...
        </el-loading-area>
      </div>
    </div>
    
    <!-- 终端状态栏 -->
    <div class="terminal-status-bar" v-if="currentTask">
      <el-row justify="space-between" align="middle">
        <el-col :span="12">
          <el-space size="small">
            <el-tag :type="getStatusTagType(currentTask.status)" size="small">
              {{ getStatusText(currentTask.status) }}
            </el-tag>
            <el-text size="small" type="info">
              {{ terminalSize.cols }}x{{ terminalSize.rows }}
            </el-text>
            <el-text size="small" type="info" v-if="currentTask.id">
              ID: {{ currentTask.id.slice(0, 8) }}
            </el-text>
          </el-space>
        </el-col>
        <el-col :span="12" class="text-right">
          <el-space size="small">
            <el-text size="small" type="info">
              输入模式: {{ inputMode === 'command' ? '命令' : '交互' }}
            </el-text>
            <el-switch 
              v-model="inputMode"
              active-value="interactive"
              inactive-value="command"
              size="small"
            />
          </el-space>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { ElMessage } from 'element-plus';
import { Task } from '@/types/terminal';
import {
  Loading,
  SuccessFilled,
  CircleCloseFilled,
  CircleClose,
  Clock,
  Refresh,
  Delete,
  FullScreen,
  Monitor
} from '@element-plus/icons-vue';

// 引入xterm.js样式
import '@xterm/xterm/css/xterm.css';

interface Props {
  currentTask?: Task;
  isConnected?: boolean;
}

interface Emits {
  (e: 'reexecute-task', taskId: string): void;
  (e: 'interrupt-task', taskId: string): void;
  (e: 'send-input', data: { taskId: string; data: string }): void;
  (e: 'resize-terminal', data: { taskId: string; rows: number; cols: number }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式数据
const terminalElement = ref<HTMLElement>();
const terminalContainer = ref<HTMLElement>();
const terminal = ref<Terminal>();
const fitAddon = ref<FitAddon>();
const webLinksAddon = ref<WebLinksAddon>();
const searchAddon = ref<SearchAddon>();

const isLoading = ref(false);
const isInterrupting = ref(false);
const fitMode = ref(true);
const inputMode = ref<'command' | 'interactive'>('interactive');

// 终端尺寸
const terminalSize = ref({
  rows: 24,
  cols: 80
});

// 计算属性
const terminalStyle = computed(() => ({
  width: fitMode.value ? '100%' : 'auto',
  height: fitMode.value ? '100%' : 'auto'
}));

// 方法
const initializeTerminal = async () => {
  if (!terminalElement.value) return;
  
  isLoading.value = true;
  
  try {
    // 创建终端实例
    terminal.value = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: '#3a3d41',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      rightClickSelectsWord: true,
      allowProposedApi: true,
      // 启用文本选择和复制功能
      allowTransparency: false,
      disableStdin: false,
      convertEol: true,
      // 允许选择文本
      screenReaderMode: false,
      altClickMovesCursor: true,
      macOptionIsMeta: false,
      macOptionClickForcesSelection: false,
      // 重要：确保ANSI转义序列被正确处理
      windowsMode: false,
      fastScrollModifier: 'ctrl',
      fastScrollSensitivity: 5
    });
    
    // 添加插件
    fitAddon.value = new FitAddon();
    webLinksAddon.value = new WebLinksAddon();
    searchAddon.value = new SearchAddon();
    
    terminal.value.loadAddon(fitAddon.value);
    terminal.value.loadAddon(webLinksAddon.value);
    terminal.value.loadAddon(searchAddon.value);
    
    // 打开终端
    terminal.value.open(terminalElement.value);
    
    // 适应容器尺寸
    await nextTick();
    fitTerminal();
    
    // 监听输入
    terminal.value.onData((data: string) => {
      if (props.currentTask && inputMode.value === 'interactive') {
        emit('send-input', {
          taskId: props.currentTask.id,
          data: data
        });
      }
    });
    
    // 监听尺寸变化
    terminal.value.onResize(({ rows, cols }) => {
      terminalSize.value = { rows, cols };
      if (props.currentTask) {
        emit('resize-terminal', {
          taskId: props.currentTask.id,
          rows,
          cols
        });
      }
    });

    // 添加键盘快捷键支持
    terminal.value.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      // Ctrl+C 复制选中文本
      if (event.ctrlKey && event.code === 'KeyC' && terminal.value?.hasSelection()) {
        const selection = terminal.value.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection).then(() => {
            console.log('文本已复制到剪贴板');
          }).catch((err) => {
            console.error('复制失败:', err);
            // 如果现代API失败，尝试传统方法
            try {
              const textArea = document.createElement('textarea');
              textArea.value = selection;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              console.log('文本已复制到剪贴板 (fallback)');
            } catch (fallbackErr) {
              console.error('fallback复制也失败:', fallbackErr);
            }
          });
          return false; // 阻止默认行为
        }
      }
      
      // Ctrl+A 全选
      if (event.ctrlKey && event.code === 'KeyA') {
        terminal.value?.selectAll();
        return false;
      }
      
      return true;
    });
    
    // 添加右键菜单功能
    terminalElement.value.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
      
      const hasSelection = terminal.value?.hasSelection();
      
      // 创建右键菜单
      const menu = document.createElement('div');
      menu.className = 'terminal-context-menu';
      menu.style.cssText = `
        position: absolute;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: var(--el-bg-color);
        border: 1px solid var(--el-border-color);
        border-radius: 4px;
        box-shadow: var(--el-box-shadow);
        z-index: 9999;
        padding: 4px 0;
        min-width: 120px;
      `;
      
      // 复制选项
      if (hasSelection) {
        const copyItem = document.createElement('div');
        copyItem.className = 'menu-item';
        copyItem.textContent = '复制';
        copyItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          user-select: none;
        `;
        copyItem.onmouseover = () => copyItem.style.background = 'var(--el-fill-color-light)';
        copyItem.onmouseout = () => copyItem.style.background = 'transparent';
        copyItem.onclick = () => {
          const selection = terminal.value?.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection).then(() => {
              ElMessage.success('已复制到剪贴板');
            }).catch(() => {
              ElMessage.error('复制失败');
            });
          }
          document.body.removeChild(menu);
        };
        menu.appendChild(copyItem);
      }
      
      // 全选选项
      const selectAllItem = document.createElement('div');
      selectAllItem.className = 'menu-item';
      selectAllItem.textContent = '全选';
      selectAllItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        user-select: none;
      `;
      selectAllItem.onmouseover = () => selectAllItem.style.background = 'var(--el-fill-color-light)';
      selectAllItem.onmouseout = () => selectAllItem.style.background = 'transparent';
      selectAllItem.onclick = () => {
        terminal.value?.selectAll();
        document.body.removeChild(menu);
      };
      menu.appendChild(selectAllItem);
      
      // 清屏选项
      const clearItem = document.createElement('div');
      clearItem.className = 'menu-item';
      clearItem.textContent = '清屏';
      clearItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        user-select: none;
      `;
      clearItem.onmouseover = () => clearItem.style.background = 'var(--el-fill-color-light)';
      clearItem.onmouseout = () => clearItem.style.background = 'transparent';
      clearItem.onclick = () => {
        handleClear();
        document.body.removeChild(menu);
      };
      menu.appendChild(clearItem);
      
      document.body.appendChild(menu);
      
      // 点击其他地方关闭菜单
      const closeMenu = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          document.body.removeChild(menu);
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', closeMenu), 0);
    });
    
    // 显示欢迎信息
    if (!props.currentTask) {
      terminal.value.writeln('\x1b[36m欢迎使用交互式终端\x1b[0m');
      terminal.value.writeln('\x1b[90m请在左侧选择一个任务或执行新命令\x1b[0m');
    }
    
    console.log('Xterm terminal initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize terminal:', error);
    ElMessage.error('终端初始化失败');
  } finally {
    isLoading.value = false;
  }
};

const fitTerminal = () => {
  if (fitAddon.value && fitMode.value) {
    try {
      fitAddon.value.fit();
    } catch (error) {
      console.warn('Failed to fit terminal:', error);
    }
  }
};

const clearTerminal = () => {
  if (terminal.value) {
    terminal.value.clear();
  }
};

const writeToTerminal = (data: string) => {
  if (terminal.value) {
    terminal.value.write(data);
  }
};

const handleClear = () => {
  clearTerminal();
  if (props.currentTask) {
    writeToTerminal('\x1b[2J\x1b[H'); // 清屏并移动光标到顶部
    writeToTerminal(`\x1b[36m[任务: ${props.currentTask.command}]\x1b[0m\r\n`);
  }
};

const handleInterrupt = () => {
  if (!props.currentTask) return;
  
  isInterrupting.value = true;
  emit('interrupt-task', props.currentTask.id);
  
  // 2秒后重置状态
  setTimeout(() => {
    isInterrupting.value = false;
  }, 2000);
};

const handleReexecute = () => {
  if (!props.currentTask) return;
  
  emit('reexecute-task', props.currentTask.id);
};

const toggleFitMode = () => {
  fitMode.value = !fitMode.value;
  if (fitMode.value) {
    nextTick(() => {
      fitTerminal();
    });
  }
};

// 格式化时间
const formatTime = (time: Date | string): string => {
  const date = new Date(time);
  return date.toLocaleTimeString('zh-CN', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 格式化持续时间
const formatDuration = (duration: number): string => {
  if (duration < 60) {
    return `${duration.toFixed(1)}s`;
  }
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}m${seconds}s`;
};

// 获取状态样式
const getStatusClass = (status: Task['status']): string => {
  const classMap = {
    running: 'status-running',
    success: 'status-success',
    error: 'status-error',
    pending: 'status-pending'
  };
  return classMap[status];
};

const getStatusTagType = (status: Task['status']): string => {
  const typeMap = {
    running: 'warning',
    success: 'success',
    error: 'danger',
    pending: 'info'
  };
  return typeMap[status];
};

const getStatusText = (status: Task['status']): string => {
  const textMap = {
    running: '运行中',
    success: '已完成',
    error: '已失败',
    pending: '等待中'
  };
  return textMap[status];
};

// 处理任务输出
const handleTaskOutput = (output: string) => {
  writeToTerminal(output);
};

// 监听当前任务变化
watch(() => props.currentTask, (newTask, oldTask) => {
  if (!terminal.value) return;
  
  if (newTask && newTask.id !== oldTask?.id) {
    // 切换到新任务
    clearTerminal();
    writeToTerminal(`\x1b[36m[切换到任务: ${newTask.command}]\x1b[0m\r\n`);
    
    // 显示已有输出
    if (newTask.output) {
      writeToTerminal(newTask.output);
    }
    
    // 如果任务正在运行，显示提示
    if (newTask.status === 'running') {
      writeToTerminal(`\x1b[33m[任务正在运行中...]\x1b[0m\r\n`);
    }
  } else if (!newTask) {
    // 没有选中任务
    clearTerminal();
    writeToTerminal('\x1b[36m欢迎使用交互式终端\x1b[0m\r\n');
    writeToTerminal('\x1b[90m请在左侧选择一个任务或执行新命令\x1b[0m\r\n');
  }
}, { immediate: true });

// 监听当前任务的输出变化，实现实时显示
let lastOutputLength = 0;
watch(() => props.currentTask?.output, (newOutput) => {
  if (!terminal.value || !props.currentTask || !newOutput) return;
  
  // 只显示新增的输出内容，避免重复显示
  if (newOutput.length > lastOutputLength) {
    const newContent = newOutput.slice(lastOutputLength);
    writeToTerminal(newContent);
    lastOutputLength = newOutput.length;
  }
}, { immediate: false });

// 重置输出长度计数器当任务切换时
watch(() => props.currentTask?.id, () => {
  lastOutputLength = props.currentTask?.output?.length || 0;
});

// 监听窗口尺寸变化
const handleResize = () => {
  if (fitMode.value) {
    setTimeout(() => {
      fitTerminal();
    }, 100);
  }
};

// 生命周期
onMounted(async () => {
  await initializeTerminal();
  
  // 监听窗口尺寸变化
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // 清理资源
  if (terminal.value) {
    terminal.value.dispose();
  }
  
  window.removeEventListener('resize', handleResize);
});

// 暴露方法给父组件
defineExpose({
  writeToTerminal: handleTaskOutput,
  clearTerminal,
  fitTerminal
});
</script>

<style scoped>
.xterm-task-output {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.task-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
}

.task-status-icon {
  flex-shrink: 0;
}

.status-running {
  color: var(--el-color-warning);
  animation: rotate 1s linear infinite;
}

.status-success {
  color: var(--el-color-success);
}

.status-error {
  color: var(--el-color-danger);
}

.status-pending {
  color: var(--el-color-info);
}

.task-info {
  display: flex;
  flex-direction: column;
}

.command-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  font-weight: 500;
}

.task-meta {
  margin-top: 2px;
}

.terminal-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #1e1e1e;
}

.terminal-wrapper {
  width: 100%;
  height: 100%;
}

.terminal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--el-bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.terminal-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.terminal-status-bar {
  padding: 8px 16px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
  font-size: 12px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 终端样式调整 */
:deep(.xterm) {
  padding: 8px;
}

:deep(.xterm-viewport) {
  background-color: transparent;
}

:deep(.xterm-screen) {
  background-color: transparent;
}

/* 终端右键菜单样式 */
:global(.terminal-context-menu) {
  font-size: 14px;
  font-family: var(--el-font-family);
  color: var(--el-text-color-primary);
}

:global(.terminal-context-menu .menu-item:hover) {
  background-color: var(--el-fill-color-light) !important;
}

/* 确保终端文本可选择 */
:deep(.xterm-helper-textarea) {
  position: absolute !important;
  left: -9999px !important;
  top: 0 !important;
  width: 0 !important;
  height: 0 !important;
  z-index: -10 !important;
  opacity: 0 !important;
}

/* 选择高亮样式 */
:deep(.xterm-selection div) {
  background-color: var(--el-color-primary) !important;
  opacity: 0.3 !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .task-header {
    padding: 8px 12px;
  }
  
  .task-header .el-col:first-child {
    span: 24;
    margin-bottom: 8px;
  }
  
  .task-header .el-col:last-child {
    span: 24;
  }
  
  .task-header .el-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .terminal-status-bar {
    padding: 6px 12px;
  }
}
</style>