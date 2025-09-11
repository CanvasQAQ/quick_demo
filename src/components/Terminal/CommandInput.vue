<template>
  <div class="command-input-container">
    <el-row :gutter="12" align="middle" class="input-row">
      <!-- 主要命令输入区域 -->
      <el-col :span="18">
        <el-input
          ref="commandInputRef"
          v-model="currentCommand"
          placeholder="输入命令并回车执行..."
          size="large"
          clearable
          :disabled="!isConnected"
          @keydown="handleKeyDown"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
          class="command-input"
        >
          <template #prepend>
            <span class="command-prompt">$</span>
          </template>
          
          <template #append>
            <el-button
              type="primary"
              @click="executeCommand"
              :disabled="!currentCommand.trim() || !isConnected"
              :loading="false"
            >
              <!-- <el-icon v-if="!isExecuting"><Position /></el-icon> -->
              执行
            </el-button>
          </template>
        </el-input>

        <!-- 命令提示下拉列表 -->
        <div 
          v-if="showSuggestions && filteredSuggestions.length > 0"
          class="suggestions-dropdown"
        >
          <ul class="suggestions-list">
            <li
              v-for="(suggestion, index) in filteredSuggestions"
              :key="suggestion"
              :class="{ 'suggestion-active': index === suggestionIndex }"
              @click="selectSuggestion(suggestion)"
              @mouseenter="suggestionIndex = index"
              class="suggestion-item"
            >
              <!-- <el-icon><Terminal /></el-icon> -->
              <span>{{ suggestion }}</span>
            </li>
          </ul>
        </div>
      </el-col>

      <!-- 右侧操作按钮组 -->
      <el-col :span="6">
        <el-space class="action-buttons">
          <!-- 命令历史下拉菜单 -->
          <el-dropdown
            @command="selectHistoryCommand"
            trigger="click"
            :disabled="commandHistory.length === 0"
          >
            <el-button :disabled="commandHistory.length === 0">
              <!-- <el-icon><Clock /></el-icon> -->
              历史
              <!-- <el-icon><ArrowDown /></el-icon> -->
            </el-button>
            <template #dropdown>
              <el-dropdown-menu max-height="200px">
                <el-dropdown-item
                  v-for="(cmd, index) in recentCommands"
                  :key="index"
                  :command="cmd"
                  class="history-item"
                >
                  <el-text truncated>{{ cmd }}</el-text>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 收藏命令按钮 -->
          <el-dropdown
            @command="selectFavoriteCommand"
            trigger="click"
            :disabled="favoriteCommands.length === 0"
          >
            <el-button :disabled="favoriteCommands.length === 0">
              <!-- <el-icon><Star /></el-icon> -->
              收藏
              <!-- <el-icon><ArrowDown /></el-icon> -->
            </el-button>
            <template #dropdown>
              <el-dropdown-menu max-height="200px">
                <el-dropdown-item
                  v-for="fav in favoriteCommands"
                  :key="fav.id"
                  :command="fav.command"
                  class="favorite-item"
                >
                  <div class="favorite-content">
                    <el-text class="favorite-name">{{ fav.name }}</el-text>
                    <el-text type="info" size="small" class="favorite-command">
                      {{ fav.command }}
                    </el-text>
                  </div>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 快速操作按钮 -->
          <el-dropdown
            @command="executeQuickCommand"
            trigger="click"
          >
            <el-button>
              <!-- <el-icon><Flash /></el-icon> -->
              快速
              <!-- <el-icon><ArrowDown /></el-icon> -->
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="cmd in quickCommands"
                  :key="cmd.command"
                  :command="cmd.command"
                  class="quick-item"
                >
                  <el-space>
                    <!-- <el-icon>
                      <component :is="cmd.icon" />
                    </el-icon> -->
                    <span>{{ cmd.name }}</span>
                  </el-space>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-space>
      </el-col>
    </el-row>

    <!-- 底部快捷信息栏 -->
    <div v-if="showShortcuts || !isConnected" class="shortcuts-bar">
      <el-row justify="space-between" align="middle">

          <el-space size="large">
            <el-text v-if="!isConnected" type="warning" size="small">
              <el-icon><Warning /></el-icon>
              未连接到终端服务
            </el-text>
            
            <el-text v-else-if="isExecuting" type="info" size="small">
              <!-- <el-icon class="rotating"><Loading /></el-icon> -->
              {{ runningTasksCount }}个任务执行中...
            </el-text>
            
            <el-text v-else type="success" size="small">
              <el-icon><Check /></el-icon>
              终端就绪
            </el-text>
          </el-space>
          <!-- <div></div> -->
          <el-space size="small">
            <el-text type="info" size="small">
              <kbd>↑↓</kbd> 历史命令
            </el-text>
            <el-text type="info" size="small">
              <kbd>Tab</kbd> 补全
            </el-text>
            <el-text type="info" size="small">
              <kbd>Ctrl+L</kbd> 清屏
            </el-text>
            <el-text type="info" size="small">
              <kbd>Ctrl+C</kbd> 中断
            </el-text>
          </el-space>

      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { FavoriteCommand } from '@/types/terminal';
import {
  Position,
  Terminal,
  Clock,
  ArrowDown,
  Star,
  Flash,
  Warning,
  Loading,
  Check,
  FolderOpened,
  User,
  Monitor,
  Setting,
  Refresh
} from '@element-plus/icons-vue';

interface QuickCommand {
  name: string;
  command: string;
  icon: any;
}

interface Props {
  isConnected: boolean;
  isExecuting: boolean;
  commandHistory: string[];
  favoriteCommands: FavoriteCommand[];
  runningTasksCount?: number;
}

interface Emits {
  (e: 'execute-command', command: string): void;
  (e: 'add-to-favorites', command: string): void;
  (e: 'interrupt-command'): boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 计算属性
const runningTasksCount = computed(() => props.runningTasksCount || 0);

// 响应式变量
const currentCommand = ref('');
const commandInputRef = ref();
const historyIndex = ref(-1);
const showSuggestions = ref(false);
const suggestionIndex = ref(0);
const showShortcuts = ref(true);
const inputFocused = ref(false);

// 预定义的快速命令
const quickCommands: QuickCommand[] = [
  { name: '列出文件', command: 'ls -la', icon: FolderOpened },
  { name: '当前目录', command: 'pwd', icon: FolderOpened },
  { name: '系统信息', command: 'uname -a', icon: Monitor },
  { name: '磁盘使用', command: 'df -h', icon: Monitor },
  { name: '内存使用', command: 'free -h', icon: Monitor },
  { name: '进程列表', command: 'ps aux', icon: Setting },
  { name: '用户信息', command: 'whoami', icon: User },
  { name: '清屏', command: 'clear', icon: Refresh}
];

// 常用命令建议列表
const commonCommands = [
  'ls', 'ls -la', 'ls -l', 'cd', 'pwd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv',
  'cat', 'less', 'head', 'tail', 'grep', 'find', 'which', 'whereis',
  'ps', 'top', 'htop', 'kill', 'killall', 'jobs', 'bg', 'fg',
  'chmod', 'chown', 'chgrp', 'sudo', 'su',
  'git status', 'git add', 'git commit', 'git push', 'git pull', 'git log',
  'npm install', 'npm run', 'npm start', 'npm test', 'npm run build',
  'docker ps', 'docker images', 'docker run', 'docker stop', 'docker logs',
  'systemctl status', 'systemctl start', 'systemctl stop', 'systemctl restart'
];

// 计算属性
const recentCommands = computed(() => {
  return [...props.commandHistory].reverse().slice(0, 10);
});

const filteredSuggestions = computed(() => {
  if (!currentCommand.value.trim()) return [];
  
  const input = currentCommand.value.toLowerCase();
  return commonCommands
    .filter(cmd => cmd.toLowerCase().includes(input))
    .slice(0, 8);
});

// 方法
const executeCommand = () => {
  const command = currentCommand.value.trim();
  if (!command || !props.isConnected) return;
  
  emit('execute-command', command);
  currentCommand.value = '';
  historyIndex.value = -1;
  hideSuggestions();
};

const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      if (showSuggestions.value && suggestionIndex.value >= 0) {
        selectSuggestion(filteredSuggestions.value[suggestionIndex.value]);
      } else {
        executeCommand();
      }
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      if (showSuggestions.value) {
        suggestionIndex.value = Math.max(0, suggestionIndex.value - 1);
      } else {
        navigateHistory('up');
      }
      break;
      
    case 'ArrowDown':
      event.preventDefault();
      if (showSuggestions.value) {
        suggestionIndex.value = Math.min(
          filteredSuggestions.value.length - 1,
          suggestionIndex.value + 1
        );
      } else {
        navigateHistory('down');
      }
      break;
      
    case 'Tab':
      event.preventDefault();
      if (filteredSuggestions.value.length > 0) {
        selectSuggestion(filteredSuggestions.value[0]);
      }
      break;
      
    case 'Escape':
      hideSuggestions();
      break;
  }
  
  // 显示命令建议
  if (event.key.length === 1 || event.key === 'Backspace') {
    nextTick(() => {
      updateSuggestions();
    });
  }
};

const handleInputFocus = () => {
  inputFocused.value = true;
  updateSuggestions();
};

const handleInputBlur = () => {
  inputFocused.value = false;
  // 延迟隐藏建议，以便点击建议项
  setTimeout(() => {
    if (!inputFocused.value) {
      hideSuggestions();
    }
  }, 200);
};

const updateSuggestions = () => {
  if (currentCommand.value.trim() && filteredSuggestions.value.length > 0) {
    showSuggestions.value = true;
    suggestionIndex.value = 0;
  } else {
    hideSuggestions();
  }
};

const hideSuggestions = () => {
  showSuggestions.value = false;
  suggestionIndex.value = 0;
};

const selectSuggestion = (suggestion: string) => {
  currentCommand.value = suggestion;
  hideSuggestions();
  nextTick(() => {
    commandInputRef.value?.focus();
  });
};

const navigateHistory = (direction: 'up' | 'down') => {
  if (props.commandHistory.length === 0) return;
  
  if (direction === 'up') {
    historyIndex.value = Math.min(props.commandHistory.length - 1, historyIndex.value + 1);
  } else {
    historyIndex.value = Math.max(-1, historyIndex.value - 1);
  }
  
  if (historyIndex.value >= 0) {
    currentCommand.value = props.commandHistory[props.commandHistory.length - 1 - historyIndex.value];
  } else {
    currentCommand.value = '';
  }
};

const selectHistoryCommand = (command: string) => {
  currentCommand.value = command;
  nextTick(() => {
    commandInputRef.value?.focus();
  });
};

const selectFavoriteCommand = (command: string) => {
  currentCommand.value = command;
  nextTick(() => {
    commandInputRef.value?.focus();
  });
};

const executeQuickCommand = (command: string) => {
  currentCommand.value = command;
  nextTick(() => {
    executeCommand();
  });
};

// 全局快捷键处理
const handleGlobalKeyDown = (event: KeyboardEvent) => {
  // Ctrl+L 清屏
  if (event.ctrlKey && event.key === 'l') {
    event.preventDefault();
    executeQuickCommand('clear');
  }
  
  // Ctrl+C 中断（只有当有运行任务时）
  if (event.ctrlKey && event.key === 'c' && runningTasksCount.value > 0) {
    event.preventDefault();
    const success = emit('interrupt-command');
    if (success) {
      ElMessage.success('命令已中断');
    } else {
      ElMessage.warning('无法中断命令');
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>

<style scoped>
.command-input-container {
  border-top: 1px solid var(--el-border-color-light);
  /* padding: 16px 20px; */
  padding-top: 8px;
  padding-bottom: 0;
}

.input-row {
  margin-bottom: 0;
}

.command-input {
  position: relative;
}

.command-prompt {
  color: var(--el-color-primary);
  font-weight: bold;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  padding: 0 8px;
}

.action-buttons {
  width: 100%;
  justify-content: flex-end;
}

.suggestions-dropdown {
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
  transform: translateY(-100%);
}

.suggestions-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  transition: background-color 0.2s;
}

.suggestion-item:hover,
.suggestion-active {
  background-color: var(--el-color-primary-light-9);
}

.shortcuts-bar {
  margin-top: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.history-item,
.favorite-item,
.quick-item {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.favorite-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.favorite-name {
  font-weight: 600;
}

.favorite-command {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

kbd {
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 11px;
  font-family: monospace;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Element Plus 输入框样式覆盖 */
:deep(.el-input__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
}

:deep(.el-dropdown-menu__item) {
  font-size: 13px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .command-input-container {
    padding: 12px 16px;
  }
  
  .input-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .input-row .el-col:first-child {
    flex: 1;
  }
  
  .action-buttons {
    justify-content: flex-start;
  }
  
  .shortcuts-bar .el-col:last-child {
    display: none; /* 在移动端隐藏快捷键提示 */
  }
}
</style>