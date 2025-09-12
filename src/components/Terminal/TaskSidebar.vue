<template>
  <div class="task-sidebar">
    <!-- 任务列表头部 -->
    <div class="sidebar-header">
      <!-- <el-row justify="space-between" align="middle"> -->
        <!-- <el-col> -->
          <el-text class="sidebar-title">任务列表</el-text>
        <!-- </el-col>
        <el-col> -->
          <el-button-group size="small">
            <el-button @click="clearAllTasks" :disabled="tasks.length === 0">
              <el-icon><Delete /></el-icon>
            </el-button>
            <el-button @click="refreshTasks">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-button-group>
        <!-- </el-col> -->
      <!-- </el-row> -->
    </div>

    <!-- 任务统计 -->
    <div class="task-stats">
      <el-space>
        <el-tag size="small" type="info">
          总计: {{ tasks.length }}
        </el-tag>
        <el-tag size="small" type="warning" v-if="runningCount > 0">
          运行中: {{ runningCount }}
        </el-tag>
        <el-tag size="small" type="success" v-if="successCount > 0">
          成功: {{ successCount }}
        </el-tag>
        <el-tag size="small" type="danger" v-if="errorCount > 0">
          失败: {{ errorCount }}
        </el-tag>
      </el-space>
    </div>

    <!-- 任务列表 -->
    <el-scrollbar class="task-list-container">
      <el-menu
        :default-active="activeTaskId"
        @select="handleTaskSelect"
        class="task-menu"
      >
        <el-menu-item
          v-for="task in sortedTasks"
          :key="task.id"
          :index="task.id"
          class="task-menu-item"
        >
          <!-- 状态图标 -->
          <el-icon class="task-status-icon" :class="getStatusClass(task.status)">
            <Loading v-if="task.status === 'running'" />
            <SuccessFilled v-else-if="task.status === 'success'" />
            <CircleCloseFilled v-else-if="task.status === 'error'" />
            <Clock v-else />
          </el-icon>

          <!-- 命令文本 -->
          <span class="task-command-text">
            {{ truncateCommand(task.command) }}
          </span>

          <!-- 时间标签和操作按钮的容器 -->
          <div class="task-end-content">
            <!-- 运行时长标签 -->
            <el-tag v-if="task.duration" size="small" class="task-duration">
              {{ formatDuration(task.duration) }}
            </el-tag>
            <el-tag v-else-if="task.status === 'running'" size="small" type="warning" class="task-duration">
              运行中
            </el-tag>

            <!-- 任务操作按钮 -->
            <div class="task-actions">
              <!-- 中断按钮 - 仅运行中的任务显示 -->
              <el-button
                v-if="task.status === 'running'"
                text
                size="small"
                type="warning"
                @click.stop="interruptTask(task.id)"
                class="task-interrupt-btn"
              >
                <el-icon><CircleClose /></el-icon>
              </el-button>
              
              <!-- 删除按钮 - 非运行中的任务显示 -->
              <el-button
                v-if="task.status !== 'running'"
                text
                size="small"
                @click.stop="deleteTask(task.id)"
                class="task-delete-btn"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
        </el-menu-item>
      </el-menu>

      <!-- 空状态 -->
      <el-empty
        v-if="tasks.length === 0"
        description="暂无任务"
        :image-size="60"
        class="empty-state"
      />
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Task } from '@/types/terminal';
import {
  Delete,
  Refresh,
  Loading,
  SuccessFilled,
  CircleCloseFilled,
  CircleClose,
  Clock,
  Close
} from '@element-plus/icons-vue';

interface Props {
  tasks: Task[];
  activeTaskId?: string;
}

interface Emits {
  (e: 'select-task', taskId: string): void;
  (e: 'delete-task', taskId: string): void;
  (e: 'interrupt-task', taskId: string): void;
  (e: 'clear-all-tasks'): void;
  (e: 'refresh-tasks'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 计算属性
const sortedTasks = computed(() => {
  return [...props.tasks].sort((a, b) => {
    // 运行中的任务排在前面
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (b.status === 'running' && a.status !== 'running') return 1;
    
    // 按开始时间倒序排列（最新的在前）
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });
});

const runningCount = computed(() => 
  props.tasks.filter(task => task.status === 'running').length
);

const successCount = computed(() => 
  props.tasks.filter(task => task.status === 'success').length
);

const errorCount = computed(() => 
  props.tasks.filter(task => task.status === 'error').length
);

// 方法
const handleTaskSelect = (taskId: string) => {
  emit('select-task', taskId);
};

const deleteTask = (taskId: string) => {
  emit('delete-task', taskId);
};

const interruptTask = (taskId: string) => {
  emit('interrupt-task', taskId);
};

const clearAllTasks = () => {
  emit('clear-all-tasks');
};

const refreshTasks = () => {
  emit('refresh-tasks');
};

const truncateCommand = (command: string, maxLength: number = 25): string => {
  if (command.length <= maxLength) return command;
  return command.substring(0, maxLength) + '...';
};

const formatDuration = (duration: number): string => {
  if (duration < 60) {
    return `${duration.toFixed(1)}s`;
  }
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}m${seconds}s`;
};

const getStatusTooltip = (task: Task): string => {
  const statusMap = {
    running: '执行中',
    success: '执行成功',
    error: `执行失败 - 退出码${task.exitCode ?? 'N/A'}`,
    pending: '等待执行'
  };
  return statusMap[task.status];
};

const getStatusClass = (status: Task['status']): string => {
  const classMap = {
    running: 'status-running',
    success: 'status-success',
    error: 'status-error',
    pending: 'status-pending'
  };
  return classMap[status];
};
</script>

<style scoped>
.task-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.sidebar-title {
  font-weight: 600;
  font-size: 16px;
}

.task-stats {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.task-list-container {
  flex: 1;
}

.task-menu {
  border: none;
}

.task-menu-item {
  display: flex !important;
  align-items: center;
  max-height: 30px;
  gap: 8px;
  padding: 12px 16px !important;
  margin: 2px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.task-menu-item:hover {
  background-color: var(--el-menu-hover-bg-color);
}

.task-menu-item.is-active {
  /* background-color: var(--el-menu-active-color); */
  color: var(--el-color-primary);
}

.task-status-icon {
  flex-shrink: 0;
}

.status-running {
  color: var(--el-color-warning);
  animation: rotate 1s linear infinite;
}

.status-success {
  /* color: var(--el-color-success); */
}

.status-error {
  color: var(--el-color-danger);
}

.status-pending {
  color: var(--el-color-info);
}

.task-command-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--terminal-font-family);
  font-size: 13px;
}

.task-duration {
  flex-shrink: 0;
  font-size: 11px;
  margin-left: auto;
}

.task-end-content {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
  margin-left: auto;
}

.task-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  background: var(--el-bg-color);
  border-radius: 4px;
  padding: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-menu-item:hover .task-actions {
  opacity: 1;
}

.task-menu-item:hover .task-duration {
  opacity: 0;
}

.task-interrupt-btn,
.task-delete-btn {
  flex-shrink: 0;
  padding: 2px 4px;
  min-height: 20px;
}

.empty-state {
  margin-top: 40px;
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
  .task-command-text {
    font-size: 12px;
  }
  
  .task-menu-item {
    padding: 10px 12px !important;
    margin: 2px 4px;
  }
  
  .sidebar-header {
    padding: 12px;
  }
}
</style>