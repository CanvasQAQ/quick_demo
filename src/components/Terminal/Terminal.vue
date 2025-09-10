<template>
  <el-container class="terminal-container">
    <!-- 顶部连接控制栏 -->
    <el-header class="terminal-header" height="auto">
      <el-row justify="space-between" align="middle">
        <el-col :span="16">
          <el-space>
            <el-input 
              v-model="host" 
              placeholder="Host" 
              size="small"
              style="width: 180px"
              :disabled="isConnected"
            >
              <template #prefix>
                <el-icon><Connection /></el-icon>
              </template>
            </el-input>
            
            <el-select
              v-model="port"
              placeholder="选择或输入端口"
              size="small"
              style="width: 200px"
              :disabled="isConnected"
              :loading="isLoadingPorts"
              filterable
              allow-create
              clearable
            >
              <template #prefix>
                <el-icon><Connection /></el-icon>
              </template>
              <el-option
                v-for="portOption in availablePorts"
                :key="`${portOption.source}-${portOption.port}`"
                :value="portOption.port"
                :label="`${portOption.port} - ${portOption.description}`"
              >
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>{{ portOption.port }} - {{ portOption.description }}</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <el-tag
                      :type="portOption.source === 'flask' ? 'success' : portOption.source === 'ssh' ? 'warning' : 'info'"
                      size="small"
                      effect="plain"
                    >
                      {{ portOption.source === 'flask' ? 'Flask' : portOption.source === 'ssh' ? 'SSH' : '手动' }}
                    </el-tag>
                    <el-tag
                      :type="portOption.status === 'active' ? 'success' : 'info'"
                      size="small"
                      effect="plain"
                    >
                      {{ portOption.status === 'active' ? '活跃' : '未知' }}
                    </el-tag>
                  </div>
                </div>
              </el-option>
            </el-select>
            
            <el-button 
              size="small" 
              :icon="Refresh"
              @click="fetchAvailablePorts"
              :loading="isLoadingPorts"
              :disabled="isConnected"
              title="刷新可用端口"
            />
            
            <el-button 
              :type="isConnected ? 'danger' : 'primary'" 
              :icon="isConnected ? 'Switch' : 'Connection'"
              size="small"
              @click="toggleConnection"
              :loading="isConnecting"
            >
              {{ isConnected ? '断开' : '连接' }}
            </el-button>
            
            <el-button 
              v-if="isConnected"
              icon="Refresh"
              size="small"
              @click="clearAllTasks"
              :disabled="tasks.length === 0"
            >
              清空任务
            </el-button>
          </el-space>
        </el-col>
        
        <el-col :span="8" class="text-right">
          <el-space>
            <!-- 连接状态指示器 -->
            <el-tag 
              :type="getConnectionTagType()" 
              size="small"
              :effect="isConnected ? 'light' : 'plain'"
            >
              <el-icon v-if="isConnecting">
                <Loading class="rotating" />
              </el-icon>
              <el-icon v-else-if="isConnected">
                <SuccessFilled />
              </el-icon>
              <el-icon v-else-if="connectionError">
                <CircleCloseFilled />
              </el-icon>
              <el-icon v-else>
                <Clock />
              </el-icon>
              {{ getConnectionStatus() }}
              <span v-if="sessionId" class="session-id">({{ sessionId.slice(0, 8) }})</span>
            </el-tag>

            <!-- 移动端任务列表切换按钮 -->
            <el-button 
              v-if="isMobile" 
              size="small" 
              @click="toggleMobileDrawer"
              :disabled="!isConnected"
            >
              <el-icon><List /></el-icon>
              任务
            </el-button>
          </el-space>
        </el-col>
      </el-row>
    </el-header>

    <!-- 主体内容区域 -->
    <el-container class="main-container" v-if="isConnected">
      <!-- 左侧任务列表 -->
      <el-aside 
        v-if="!isMobile" 
        width="320px" 
        class="task-aside"
      >
        <TaskSidebar
          :tasks="tasks"
          :active-task-id="currentTaskId"
          @select-task="handleTaskSelect"
          @delete-task="handleDeleteTask"
          @clear-all-tasks="clearAllTasks"
          @refresh-tasks="refreshTasks"
        />
      </el-aside>
      
      <!-- 移动端抽屉式任务列表 -->
      <el-drawer
        v-if="isMobile"
        v-model="mobileDrawerVisible"
        title="任务列表"
        direction="ltr"
        size="80%"
        class="mobile-task-drawer"
      >
        <TaskSidebar
          :tasks="tasks"
          :active-task-id="currentTaskId"
          @select-task="handleMobileTaskSelect"
          @delete-task="handleDeleteTask"
          @clear-all-tasks="clearAllTasks"
          @refresh-tasks="refreshTasks"
        />
      </el-drawer>

      <!-- 右侧输出展示区域 -->
      <el-main class="output-main">
        <TaskOutput
          :current-task="currentTask"
          @reexecute-task="handleReexecuteTask"
        />
      </el-main>
    </el-container>

    <!-- 未连接状态提示 -->
    <el-main v-else class="connection-prompt">
      <el-empty description="未连接到终端服务" :image-size="120">
        <template #image>
          <el-icon size="80" color="var(--el-color-info)">
            <Connection />
          </el-icon>
        </template>
        <template #description>
          <el-space direction="vertical" alignment="center">
            <el-text>请输入主机地址和端口号后点击连接</el-text>
            <el-text type="info" size="small">
              默认连接本地服务：localhost:5000
            </el-text>
          </el-space>
        </template>
      </el-empty>
    </el-main>

    <!-- 底部命令输入栏 -->
    <el-footer v-if="isConnected" height="auto" class="command-footer">
      <CommandInput
        :is-connected="isConnected"
        :is-executing="isExecuting"
        :command-history="commandHistory"
        :favorite-commands="favoriteCommands"
        @execute-command="handleExecuteCommand"
        @add-to-favorites="handleAddToFavorites"
        @interrupt-command="handleInterruptCommand"
      />
    </el-footer>

    <!-- 错误提示 -->
    <el-alert
      v-if="connectionError"
      :title="connectionError"
      type="error"
      :closable="true"
      @close="clearError"
      class="error-alert"
    />
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useTerminalStore } from '@/stores/terminalStore';
import { FavoriteCommand, PortOption, AvailablePortsResponse } from '@/types/terminal';
import TaskSidebar from './TaskSidebar.vue';
import TaskOutput from './TaskOutput.vue';
import CommandInput from './CommandInput.vue';
import {
  Connection,
  Switch,
  Refresh,
  Loading,
  SuccessFilled,
  CircleCloseFilled,
  Clock,
  List
} from '@element-plus/icons-vue';

const store = useTerminalStore();

// 响应式数据
const host = ref('localhost');
const port = ref(5000);
const isConnecting = ref(false);
const currentTaskId = ref<string>('');
const mobileDrawerVisible = ref(false);

// 端口选择相关
const availablePorts = ref<PortOption[]>([]);
const isLoadingPorts = ref(false);

// 移动端检测
const isMobile = ref(false);

// 计算属性
const isConnected = computed(() => store.isConnected);
const isExecuting = computed(() => store.isExecuting);
const connectionError = computed(() => store.connectionError);
const sessionId = computed(() => store.sessionId);
const tasks = computed(() => store.tasks);
const commandHistory = computed(() => store.commandHistory);
const favoriteCommands = computed(() => store.favoriteCommands);

const currentTask = computed(() => {
  if (!currentTaskId.value) return undefined;
  return tasks.value.find(task => task.id === currentTaskId.value);
});

// 方法
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// 获取可用端口
const fetchAvailablePorts = async () => {
  if (!window.electronAPI?.getAvailablePorts) return;
  
  isLoadingPorts.value = true;
  try {
    const response = await window.electronAPI.getAvailablePorts();
    if (response.success) {
      const { sshPorts = [], flaskPorts = [] } = response.data;
      
      // 合并所有端口并添加默认选项
      availablePorts.value = [
        ...flaskPorts,
        ...sshPorts,
        // 添加默认的5000端口选项
        {
          port: 5000,
          source: 'manual' as const,
          description: '默认Flask端口',
          status: 'unknown' as const,
          host: 'localhost'
        }
      ];
      
      // 去重：如果已存在相同端口，保留状态更明确的那个
      const uniquePorts = new Map<number, PortOption>();
      availablePorts.value.forEach(portOption => {
        const existing = uniquePorts.get(portOption.port);
        if (!existing || 
            (existing.status === 'unknown' && portOption.status !== 'unknown')) {
          uniquePorts.set(portOption.port, portOption);
        }
      });
      
      availablePorts.value = Array.from(uniquePorts.values()).sort((a, b) => a.port - b.port);
    }
  } catch (error) {
    console.error('获取可用端口失败:', error);
    // 添加默认端口选项作为fallback
    availablePorts.value = [
      {
        port: 5000,
        source: 'manual' as const,
        description: '默认Flask端口',
        status: 'unknown' as const,
        host: 'localhost'
      }
    ];
  } finally {
    isLoadingPorts.value = false;
  }
};

const toggleConnection = async () => {
  if (isConnected.value) {
    store.disconnect();
    ElMessage.info('已断开连接');
  } else {
    isConnecting.value = true;
    try {
      await store.connect(host.value, port.value);
      ElMessage.success('连接成功');
    } catch (error) {
      ElMessage.error('连接失败');
    } finally {
      isConnecting.value = false;
    }
  }
};

const handleTaskSelect = (taskId: string) => {
  currentTaskId.value = taskId;
};

const handleMobileTaskSelect = (taskId: string) => {
  currentTaskId.value = taskId;
  mobileDrawerVisible.value = false; // 选择后关闭抽屉
};

const handleDeleteTask = (taskId: string) => {
  store.deleteTask(taskId);
  
  // 如果删除的是当前选中的任务，选择下一个任务
  if (currentTaskId.value === taskId) {
    const remainingTasks = tasks.value.filter(task => task.id !== taskId);
    currentTaskId.value = remainingTasks.length > 0 ? remainingTasks[0].id : '';
  }
  
  ElMessage.success('任务已删除');
};

const handleExecuteCommand = (command: string) => {
  const taskId = store.executeCommand(command);
  if (taskId) {
    currentTaskId.value = taskId; // 自动选中新任务
  }
};

const handleReexecuteTask = (taskId: string) => {
  const task = tasks.value.find(t => t.id === taskId);
  if (task) {
    const newTaskId = store.executeCommand(task.command);
    if (newTaskId) {
      currentTaskId.value = newTaskId; // 选中重新执行的任务
    }
  }
};

const handleAddToFavorites = (command: string) => {
  const name = command.length > 20 ? command.substring(0, 20) + '...' : command;
  store.addToFavorites({
    id: Date.now().toString(),
    name,
    command,
    category: 'user'
  });
  ElMessage.success('已添加到收藏');
};

const handleInterruptCommand = (): boolean => {
  const success = store.interruptCurrentCommand();
  if (success) {
    ElMessage.success('命令已中断');
  } else {
    ElMessage.warning('无正在运行的命令或中断失败');
  }
  return success;
};

const clearAllTasks = () => {
  store.clearAllTasks();
  currentTaskId.value = '';
  ElMessage.success('所有任务已清空');
};

const refreshTasks = () => {
  // 这里可以添加刷新任务状态的逻辑
  ElMessage.success('任务列表已刷新');
};

const clearError = () => {
  store.clearError();
};

const toggleMobileDrawer = () => {
  mobileDrawerVisible.value = !mobileDrawerVisible.value;
};

const getConnectionTagType = (): string => {
  if (isConnecting.value) return 'warning';
  if (connectionError.value) return 'danger';
  if (isConnected.value) return 'success';
  return 'info';
};

const getConnectionStatus = (): string => {
  if (isConnecting.value) return '连接中...';
  if (connectionError.value) return '连接失败';
  if (isConnected.value) return isExecuting.value ? '执行中' : '已连接';
  return '未连接';
};

// 自动选择第一个任务
watch(tasks, (newTasks) => {
  if (newTasks.length > 0 && !currentTaskId.value) {
    currentTaskId.value = newTasks[0].id;
  }
}, { immediate: true });

// 响应式布局监听
onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  // 获取可用端口
  fetchAvailablePorts();
  
  // 尝试自动连接本地服务
  if (!isConnected.value) {
    setTimeout(() => {
      toggleConnection();
    }, 1000);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  
  // 清理连接
  if (isConnected.value) {
    store.disconnect();
  }
});
</script>

<style scoped>
.terminal-container {
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.terminal-header {
  padding: 8px 8px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.main-container {
  flex: 1;
  overflow: hidden;
}

.task-aside {
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.output-main {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.connection-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.command-footer {
  border-top: 1px solid var(--el-border-color-light);
  padding: 0;
  background: var(--el-bg-color);
}

.session-id {
  font-size: 12px;
  opacity: 0.7;
  margin-left: 4px;
}

.error-alert {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  max-width: 500px;
}

.mobile-task-drawer {
  z-index: 3000;
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

/* 响应式调整 */
@media (max-width: 768px) {
  .terminal-header {
    padding: 12px 16px;
  }
  
  .terminal-header .el-col:first-child {
    span: 24;
    margin-bottom: 8px;
  }
  
  .terminal-header .el-col:last-child {
    span: 24;
  }
  
  .terminal-header .el-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .connection-prompt {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .terminal-header .el-space {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .terminal-header .el-input {
    width: 120px !important;
  }
}
</style>
