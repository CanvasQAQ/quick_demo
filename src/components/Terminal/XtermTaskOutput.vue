<template>
  <div class="xterm-task-output">
    <!-- 任务头部信息 - 紧凑设计 -->
    <div class="task-header" v-if="currentTask">
      <div class="task-header-content">
        <!-- 左侧：状态图标和命令 -->
        <div class="task-main-info">
          <el-icon class="task-status-icon" :class="getStatusClass(currentTask.status)">
            <Loading v-if="currentTask.status === 'running'" />
            <SuccessFilled v-else-if="currentTask.status === 'success'" />
            <CircleCloseFilled v-else-if="currentTask.status === 'error'" />
            <WarningFilled v-else-if="currentTask.status === 'interrupted'" />
            <Clock v-else />
          </el-icon>
          
          <!-- 命令显示区域 -->
          <div class="command-display">
            <div class="command-line" :class="{ 'expanded': isCommandExpanded }">
              <span class="command-text">{{ currentTask.command }}</span>
            </div>
          </div>
        </div>
        
        <!-- 右侧：操作按钮 -->
        <div class="task-actions">
          <!-- 展开/收起命令按钮 -->
          <el-button
            v-if="isCommandTruncated"
            text
            size="small"
            @click="toggleCommandExpanded"
            class="expand-btn"
          >
            <el-icon><ArrowDown v-if="!isCommandExpanded" /><ArrowUp v-else /></el-icon>
          </el-button>
          
          <!-- 复制命令按钮 -->
          <el-button
            text
            size="small"
            @click="copyCommand"
            class="copy-btn"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
          
          <!-- 任务控制按钮 -->
          <el-button-group size="small">
            <el-button 
              v-if="currentTask.status === 'running'"
              type="warning" 
              @click="handleInterrupt"
              :loading="isInterrupting"
            >
              <el-icon><CircleClose /></el-icon>
            </el-button>
            
            <el-button 
              v-else
              type="primary" 
              @click="handleReexecute"
            >
              <el-icon><Refresh /></el-icon>
            </el-button>
            
            <el-button @click="handleClear">
              <el-icon><Delete /></el-icon>
            </el-button>
            
            <el-button @click="toggleFitMode">
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>
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
    
    <!-- 终端状态栏/Footer -->
    <div class="terminal-footer" v-if="currentTask">
      <div class="footer-content">
        <!-- 左侧：任务状态和尺寸信息 -->
        <div class="footer-left">
          <el-tag :type="getStatusTagType(currentTask.status)" size="small">
            {{ getStatusText(currentTask.status) }}
          </el-tag>
          <span class="terminal-size-info">{{ terminalSize.cols }}×{{ terminalSize.rows }}</span>
          <span class="task-id-info">ID: {{ currentTask.id.slice(0, 8) }}</span>
        </div>
        
        <!-- 右侧：时间、耗时、退出码信息 -->
        <div class="footer-right">
          <span class="time-info">{{ formatTime(currentTask.startTime) }}</span>
          <span v-if="currentTask.duration" class="duration-info">
            耗时 {{ formatDuration(currentTask.duration) }}
          </span>
          <span v-if="currentTask.exitCode !== undefined" class="exit-code-info">
            退出码 {{ currentTask.exitCode }}
          </span>
          <!-- 输入模式切换 -->
          <div class="input-mode-switch">
            <span class="mode-label">{{ inputMode === 'command' ? '命令' : '交互' }}</span>
            <el-switch 
              v-model="inputMode"
              active-value="interactive"
              inactive-value="command"
              size="small"
            />
          </div>
        </div>
      </div>
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
  Monitor,
  ArrowDown,
  ArrowUp,
  CopyDocument,
  WarningFilled
} from '@element-plus/icons-vue';

// 引入xterm.js样式
import '@xterm/xterm/css/xterm.css';

// 调试模式控制
const DEBUG_MODE = import.meta.env.DEV && localStorage.getItem('xterm-debug') === 'true';

function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`[XtermTaskOutput] ${message}`, ...args);
  }
}

interface Props {
  currentTask?: Task;
  isConnected?: boolean;
}

interface Emits {
  (e: 'reexecute-task', taskId: string): void;
  (e: 'interrupt-task', taskId: string): void;
  (e: 'send-input', data: { taskId: string; data: string }): void;
  (e: 'send-input-immediate', data: { taskId: string; data: string }): void;
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

// 命令展开相关
const isCommandExpanded = ref(false);
const commandLineRef = ref<HTMLElement>();

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

// 判断命令是否需要截断
const isCommandTruncated = computed(() => {
  if (!props.currentTask?.command) return false;
  return props.currentTask.command.length > 80; // 超过80字符就显示展开按钮
});

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
      fontFamily: 'MesloLGS NF, Monaco, Menlo, "Ubuntu Mono", Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace',
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
      fastScrollSensitivity: 5,
      // 启用真彩色支持
      allowUnicodeVersion11: true,
      // 只在开发模式且启用调试时输出详细日志
      logLevel: DEBUG_MODE ? 'debug' : 'warn'
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
      // Ctrl+C 处理 - 区分复制和中断
      if (event.ctrlKey && event.code === 'KeyC') {
        if (terminal.value?.hasSelection()) {
          // 有选中文本时进行复制
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
        } else {
          // 无选中文本时发送中断信号
          if (props.currentTask && inputMode.value === 'interactive') {
            debugLog('Sending Ctrl+C interrupt signal to task:', props.currentTask.id);
            emit('send-input-immediate', {
              taskId: props.currentTask.id,
              data: '\x03'  // Ctrl+C 的ASCII码 (SIGINT)
            });
          }
          return false; // 阻止默认行为
        }
      }
      
      // Ctrl+A 跳转到行首（正常终端行为）
      if (event.ctrlKey && event.code === 'KeyA') {
        // 发送 Ctrl+A 到终端，让终端自己处理
        if (props.currentTask && inputMode.value === 'interactive') {
          emit('send-input', {
            taskId: props.currentTask.id,
            data: '\x01'  // Ctrl+A 的ASCII码
          });
        }
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
          try {
            if (document.body.contains(menu)) {
              document.body.removeChild(menu);
            }
          } catch (error) {
            debugLog('Error removing menu after copy:', error);
          }
        };
        menu.appendChild(copyItem);
      }
      
      // 粘贴选项
      const pasteItem = document.createElement('div');
      pasteItem.className = 'menu-item';
      pasteItem.textContent = '粘贴';
      pasteItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        user-select: none;
      `;
      pasteItem.onmouseover = () => pasteItem.style.background = 'var(--el-fill-color-light)';
      pasteItem.onmouseout = () => pasteItem.style.background = 'transparent';
      pasteItem.onclick = async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text && props.currentTask && inputMode.value === 'interactive') {
            emit('send-input', {
              taskId: props.currentTask.id,
              data: text
            });
          }
          ElMessage.success('已粘贴文本');
          
          // 粘贴后恢复终端焦点
          setTimeout(() => {
            if (terminal.value) {
              terminal.value.focus();
            }
          }, 50);
          
        } catch (error) {
          ElMessage.error('粘贴失败');
        }
        try {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
        } catch (error) {
          debugLog('Error removing menu after paste:', error);
        }
      };
      menu.appendChild(pasteItem);
      
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
        try {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
        } catch (error) {
          debugLog('Error removing menu after select all:', error);
        }
        // 恢复终端焦点
        setTimeout(() => {
          if (terminal.value) {
            terminal.value.focus();
          }
        }, 50);
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
        try {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
        } catch (error) {
          debugLog('Error removing menu after clear:', error);
        }
        // 恢复终端焦点
        setTimeout(() => {
          if (terminal.value) {
            terminal.value.focus();
          }
        }, 50);
      };
      menu.appendChild(clearItem);
      
      document.body.appendChild(menu);
      
      // 点击其他地方关闭菜单
      const closeMenu = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          try {
            if (document.body.contains(menu)) {
              document.body.removeChild(menu);
            }
          } catch (error) {
            debugLog('Error removing context menu:', error);
          }
          document.removeEventListener('click', closeMenu);
        }
      };
      
      // 添加键盘ESC关闭菜单
      const closeMenuOnEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          try {
            if (document.body.contains(menu)) {
              document.body.removeChild(menu);
            }
          } catch (error) {
            debugLog('Error removing context menu on escape:', error);
          }
          document.removeEventListener('click', closeMenu);
          document.removeEventListener('keydown', closeMenuOnEscape);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
        document.addEventListener('keydown', closeMenuOnEscape);
      }, 0);
    });
    
    // 显示欢迎信息
    if (!props.currentTask) {
      terminal.value.writeln('\x1b[36m终端就绪\x1b[0m');
    }
    
    debugLog('Xterm terminal initialized successfully');
    
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

// 切换命令展开状态
const toggleCommandExpanded = () => {
  isCommandExpanded.value = !isCommandExpanded.value;
};

// 复制命令到剪贴板
const copyCommand = async () => {
  if (!props.currentTask?.command) return;
  
  try {
    await navigator.clipboard.writeText(props.currentTask.command);
    ElMessage.success('命令已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    // 降级方案
    try {
      const textArea = document.createElement('textarea');
      textArea.value = props.currentTask.command;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      ElMessage.success('命令已复制到剪贴板');
    } catch (fallbackError) {
      ElMessage.error('复制失败');
    }
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
    interrupted: 'status-interrupted',
    pending: 'status-pending'
  };
  return classMap[status];
};

const getStatusTagType = (status: Task['status']): string => {
  const typeMap = {
    running: 'warning',
    success: 'success',
    error: 'danger',
    interrupted: 'warning',
    pending: 'info'
  };
  return typeMap[status];
};

const getStatusText = (status: Task['status']): string => {
  const textMap = {
    running: '运行中',
    success: '已完成',
    error: '已失败',
    interrupted: '已中断',
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
    // 切换到新任务 - 只显示已有输出，不显示切换信息
    clearTerminal();
    
    // 显示已有输出
    if (newTask.output) {
      writeToTerminal(newTask.output);
    }
  } else if (!newTask) {
    // 没有选中任务 - 显示简洁的欢迎信息
    clearTerminal();
    writeToTerminal('\x1b[36m终端就绪\x1b[0m\r\n');
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
    try {
      // 先清理所有插件，避免disposal错误
      if (fitAddon.value) {
        try {
          fitAddon.value.dispose();
        } catch (error) {
          console.warn('Error disposing fit addon:', error);
        }
        fitAddon.value = undefined;
      }
      
      if (webLinksAddon.value) {
        try {
          webLinksAddon.value.dispose();
        } catch (error) {
          console.warn('Error disposing weblinks addon:', error);
        }
        webLinksAddon.value = undefined;
      }
      
      if (searchAddon.value) {
        try {
          searchAddon.value.dispose();
        } catch (error) {
          console.warn('Error disposing search addon:', error);
        }
        searchAddon.value = undefined;
      }
      
      // 最后dispose终端实例
      terminal.value.dispose();
      terminal.value = undefined;
    } catch (error) {
      console.warn('Error disposing terminal:', error);
    }
  }
  
  window.removeEventListener('resize', handleResize);
});

// 暴露方法给父组件
defineExpose({
  writeToTerminal: handleTaskOutput,
  clearTerminal,
  fitTerminal,
  // 新增：获取当前终端尺寸的方法
  getTerminalSize: () => {
    if (terminal.value) {
      return {
        rows: terminal.value.rows,
        cols: terminal.value.cols
      };
    }
    return { rows: 24, cols: 80 };
  }
});
</script>

<style scoped>
.xterm-task-output {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  overflow: hidden;
}

.task-header {
  flex-shrink: 0;
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
}

.task-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
}

.task-main-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.task-status-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.status-running {
  color: #2472c8;
  animation: rotate 1s linear infinite;
}

.status-success {
  color: #0dbc79;
}

.status-error {
  color: #cd3131;
}

.status-interrupted {
  color: #e5e510;
}

.status-pending {
  color: var(--el-color-info);
}

.command-display {
  flex: 1;
  min-width: 0;
}

.command-line {
  max-height: 24px;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.command-line.expanded {
  max-height: 120px;
  overflow-y: auto;
}

.command-text {
  font-family: var(--terminal-font-family);
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;
  color: var(--el-text-color-primary);
  word-break: break-all;
  white-space: pre-wrap;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.expand-btn,
.copy-btn {
  color: var(--el-text-color-regular);
}

.expand-btn:hover,
.copy-btn:hover {
  color: var(--el-color-primary);
}

.terminal-container {
  flex: 1;
  position: relative;
  background: #1e1e1e;
  overflow: hidden;
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

.terminal-footer {
  flex-shrink: 0;
  padding: 6px 16px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
  font-size: 12px;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.terminal-size-info,
.task-id-info,
.time-info,
.duration-info,
.exit-code-info {
  color: var(--el-text-color-regular);
  font-size: 11px;
}

.input-mode-switch {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mode-label {
  font-size: 11px;
  color: var(--el-text-color-regular);
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
  .xterm-task-output {
    height: 100vh;
  }
  
  .task-header {
    padding: 8px 12px;
  }
  
  .task-header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .task-actions {
    justify-content: flex-end;
  }
  
  .footer-content {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .footer-right {
    justify-content: space-between;
  }
}
</style>