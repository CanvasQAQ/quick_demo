<template>
  <div class="task-output-container">
    <!-- 任务详情卡片 -->
    <el-card v-if="currentTask" class="output-card">
      <!-- 任务信息头部 -->
      <template #header>
        <el-row justify="space-between" align="middle">
          <el-col :span="16">
            <el-space wrap>
              <!-- 命令标签 -->
              <el-tag 
                type="info" 
                class="command-tag"
                @click="copyCommand"
                style="cursor: pointer;"
              >
                <!-- <el-icon><Terminal /></el-icon> -->
                {{ currentTask.command }}
              </el-tag>
              
              <!-- 执行时长 -->
              <el-tag v-if="currentTask.duration" type="success" size="small">
                <!-- <el-icon><Timer /></el-icon> -->
                {{ formatDuration(currentTask.duration) }}
              </el-tag>
              
              <!-- 开始时间 -->
              <el-tag type="info" size="small">
                <!-- <el-icon><Clock /></el-icon> -->
                {{ formatTime(currentTask.startTime) }}
              </el-tag>
              
              <!-- 状态标签 -->
              <el-tag 
                :type="getStatusTagType(currentTask.status)" 
                size="small"
                :effect="currentTask.status === 'running' ? 'light' : 'plain'"
              >
                <!-- <el-icon v-if="currentTask.status === 'running'">
                  <Loading class="rotating" />
                </el-icon>
                <el-icon v-else-if="currentTask.status === 'success'">
                  <SuccessFilled />
                </el-icon>
                <el-icon v-else-if="currentTask.status === 'error'">
                  <CircleCloseFilled />
                </el-icon>
                <el-icon v-else>
                  <Clock />
                </el-icon> -->
                {{ getStatusText(currentTask.status) }}
              </el-tag>
            </el-space>
          </el-col>
          
          <el-col :span="8" class="text-right">
            <el-button-group size="small">
              <el-tooltip content="重新执行" placement="top">
                <el-button 
                  @click="reExecuteTask" 
                  :disabled="currentTask.status === 'running'"
                >
                  <!-- <el-icon><Refresh /></el-icon> -->
                  重新执行
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="复制命令" placement="top">
                <el-button @click="copyCommand">
                  <!-- <el-icon><DocumentCopy /></el-icon> -->
                  复制
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="导出输出" placement="top">
                <el-button @click="exportOutput">
                  <!-- <el-icon><Download /></el-icon> -->
                  导出
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="搜索输出" placement="top">
                <el-button @click="toggleSearch">
                  <!-- <el-icon><Search /></el-icon> -->
                  搜索
                </el-button>
              </el-tooltip>
            </el-button-group>
          </el-col>
        </el-row>
      </template>

      <!-- 搜索栏 -->
      <div v-if="showSearchBar" class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索输出内容..."
          clearable
          @input="highlightMatches"
          @clear="clearSearch"
        >
          <template #prefix>
            <!-- <el-icon><Search /></el-icon> -->
            🔍
          </template>
          <template #suffix>
            <el-text type="info" size="small" v-if="matchCount > 0">
              {{ currentMatchIndex + 1 }}/{{ matchCount }}
            </el-text>
          </template>
        </el-input>
        
        <el-button-group size="small" style="margin-left: 8px;">
          <el-button @click="previousMatch" :disabled="matchCount === 0">
            <!-- <el-icon><ArrowUp /></el-icon> -->
            ↑
          </el-button>
          <el-button @click="nextMatch" :disabled="matchCount === 0">
            <!-- <el-icon><ArrowDown /></el-icon> -->
            ↓
          </el-button>
        </el-button-group>
      </div>

      <!-- 输出内容区域 -->
      <el-scrollbar 
        ref="outputScrollbar" 
        :height="scrollbarHeight" 
        class="output-scrollbar"
      >
        <div 
          ref="outputContent"
          class="output-content" 
          v-html="highlightedOutput"
          @click="handleOutputClick"
        />
      </el-scrollbar>

      <!-- 底部状态栏 -->
      <template #footer v-if="currentTask.status !== 'running'">
        <el-row justify="space-between" align="middle" class="output-footer">
          <el-col :span="16">
            <el-space>
              <el-text type="info" size="small">
                <!-- <el-icon><Check /></el-icon> -->
                退出码: {{ currentTask.exitCode ?? 'N/A' }}
              </el-text>
              
              <el-text type="info" size="small">
                <!-- <el-icon><Document /></el-icon> -->
                输出行数: {{ getOutputLines(currentTask.output) }}
              </el-text>
              
              <el-text type="info" size="small">
                <!-- <el-icon><FolderOpened /></el-icon> -->
                大小: {{ getOutputSize(currentTask.output) }}
              </el-text>
            </el-space>
          </el-col>
          
          <el-col :span="8" class="text-right">
            <el-text type="primary" size="small">
              完成时间: {{ formatTime(currentTask.endTime!) }}
            </el-text>
          </el-col>
        </el-row>
      </template>
    </el-card>

    <!-- 空状态 -->
    <el-empty
      v-else
      description="请从左侧选择一个任务查看输出"
      :image-size="120"
      class="empty-state"
    >
      <template #image>
        <!-- <el-icon size="80" color="var(--el-color-info)">
          <Monitor />
        </el-icon> -->
        🖥️
      </template>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Task } from '@/types/terminal';
import {
  Terminal,
  Timer,
  Clock,
  Loading,
  SuccessFilled,
  CircleCloseFilled,
  Refresh,
  DocumentCopy,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  Check,
  Document,
  FolderOpened,
  Monitor
} from '@element-plus/icons-vue';

interface Props {
  currentTask?: Task;
}

interface Emits {
  (e: 'reexecute-task', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 搜索相关状态
const showSearchBar = ref(false);
const searchKeyword = ref('');
const matchCount = ref(0);
const currentMatchIndex = ref(0);
const outputScrollbar = ref();
const outputContent = ref();

// 计算属性
const scrollbarHeight = computed(() => {
  return showSearchBar.value ? '100%' : '480px';
});

const highlightedOutput = computed(() => {
  if (!props.currentTask || !searchKeyword.value) {
    return formatOutput(props.currentTask?.output || '');
  }
  
  return highlightSearchMatches(formatOutput(props.currentTask.output), searchKeyword.value);
});

// 方法
const formatDuration = (duration: number): string => {
  if (duration < 60) {
    return `${duration.toFixed(1)}s`;
  }
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}m${seconds}s`;
};

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatOutput = (output: string): string => {
  // 基本的HTML转义
  const escaped = output
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/ /g, '&nbsp;');
  
  // 简单的语法高亮（可扩展）
  return escaped
    .replace(/ERROR|Error|error/g, '<span class="output-error">$&</span>')
    .replace(/WARNING|Warning|warning/g, '<span class="output-warning">$&</span>')
    .replace(/SUCCESS|Success|success/g, '<span class="output-success">$&</span>')
    .replace(/(https?:\/\/[^\s]+)/g, '<span class="output-link">$1</span>')
    .replace(/(\/[^\s]*)/g, '<span class="output-path">$1</span>');
};

const highlightSearchMatches = (content: string, keyword: string): string => {
  if (!keyword) return content;
  
  const regex = new RegExp(`(${keyword})`, 'gi');
  const matches = content.match(regex);
  matchCount.value = matches ? matches.length : 0;
  
  return content.replace(regex, '<mark class="search-highlight">$1</mark>');
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
    running: '执行中',
    success: '成功',
    error: '失败',
    pending: '等待'
  };
  return textMap[status];
};

const getOutputLines = (output: string): number => {
  return output.split('\n').length;
};

const getOutputSize = (output: string): string => {
  const bytes = new Blob([output]).size;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

const reExecuteTask = () => {
  if (props.currentTask) {
    emit('reexecute-task', props.currentTask.id);
  }
};

const copyCommand = async () => {
  if (!props.currentTask) return;
  
  try {
    await navigator.clipboard.writeText(props.currentTask.command);
    ElMessage.success('命令已复制到剪贴板');
  } catch (err) {
    ElMessage.error('复制失败');
  }
};

const exportOutput = () => {
  if (!props.currentTask) return;
  
  const content = `任务: ${props.currentTask.command}\n开始时间: ${formatTime(props.currentTask.startTime)}\n执行时长: ${formatDuration(props.currentTask.duration || 0)}\n退出码: ${props.currentTask.exitCode ?? 'N/A'}\n\n输出内容:\n${props.currentTask.output}`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `task_${props.currentTask.id}_output.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  ElMessage.success('输出已导出');
};

const toggleSearch = () => {
  showSearchBar.value = !showSearchBar.value;
  if (!showSearchBar.value) {
    clearSearch();
  }
};

const highlightMatches = () => {
  currentMatchIndex.value = 0;
  if (matchCount.value > 0) {
    scrollToMatch();
  }
};

const clearSearch = () => {
  searchKeyword.value = '';
  matchCount.value = 0;
  currentMatchIndex.value = 0;
};

const nextMatch = () => {
  if (matchCount.value > 0) {
    currentMatchIndex.value = (currentMatchIndex.value + 1) % matchCount.value;
    scrollToMatch();
  }
};

const previousMatch = () => {
  if (matchCount.value > 0) {
    currentMatchIndex.value = currentMatchIndex.value === 0 
      ? matchCount.value - 1 
      : currentMatchIndex.value - 1;
    scrollToMatch();
  }
};

const scrollToMatch = () => {
  nextTick(() => {
    const highlights = outputContent.value?.querySelectorAll('.search-highlight');
    if (highlights && highlights[currentMatchIndex.value]) {
      highlights[currentMatchIndex.value].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  });
};

const handleOutputClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  
  // 处理链接点击
  if (target.classList.contains('output-link')) {
    window.open(target.textContent || '', '_blank');
  }
  
  // 处理路径点击（可以扩展为在文件管理器中打开）
  if (target.classList.contains('output-path')) {
    // 这里可以添加打开文件路径的逻辑
    console.log('Path clicked:', target.textContent);
  }
};

// 监听任务变化，自动滚动到底部
watch(() => props.currentTask?.output, () => {
  if (!searchKeyword.value) {
    nextTick(() => {
      const scrollbar = outputScrollbar.value;
      if (scrollbar) {
        scrollbar.setScrollTop(scrollbar.wrapRef.scrollHeight);
      }
    });
  }
});
</script>

<style scoped>
.task-output-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.output-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.output-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}
.output-card :deep(.el-card__header) {
  padding: 4px;
}
.output-card :deep(.el-card__footer) {
  padding: 4px;
}
.command-tag {
  max-width: 300px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.output-scrollbar {
  flex: 1;
  padding: 16px;
}

.output-content {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-all;
}

.output-footer {
  padding: 0px 0;
  /* border-top: 1px solid var(--el-border-color-light); */
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 输出内容样式 */
:deep(.output-error) {
  color: var(--el-color-danger);
  font-weight: 600;
}

:deep(.output-warning) {
  color: var(--el-color-warning);
  font-weight: 600;
}

:deep(.output-success) {
  color: var(--el-color-success);
  font-weight: 600;
}

:deep(.output-link) {
  color: var(--el-color-primary);
  text-decoration: underline;
  cursor: pointer;
}

:deep(.output-path) {
  color: var(--el-color-info);
  cursor: pointer;
}

:deep(.search-highlight) {
  background-color: var(--el-color-warning-light-7);
  color: var(--el-color-warning-dark-2);
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
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
  .command-tag {
    max-width: 200px;
  }
  
  .output-content {
    font-size: 13px;
  }
}
</style>