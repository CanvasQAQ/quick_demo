<template>
  <div class="terminal-container">
    <!-- 顶部连接控制栏 -->
    <div class="connection-header">
      <div class="connection-controls">
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
        
        <el-input 
          v-model="port" 
          placeholder="Port" 
          size="small"
          type="number"
          style="width: 100px"
          :disabled="isConnected"
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
          @click="clearOutput"
        >
          清屏
        </el-button>
      </div>
      
      <div class="status-indicator">
        <span class="status-dot" :class="statusClass"></span>
        <span class="status-text">
          {{ statusText }}
          <span v-if="sessionId" class="session-id">({{ sessionId }})</span>
        </span>
      </div>
    </div>

    <!-- 终端内容区域 -->
    <div v-if="isConnected" class="terminal-content">
      <!-- 终端输出区域 -->
      <div ref="outputContainer" class="output-panel">
        <div 
          v-for="(output, index) in outputHistory" 
          :key="index" 
          class="output-line"
          :class="{ 'command-line': output.type === 'command' }"
        >
          <span v-if="output.type === 'command'" class="prompt">$ </span>
          <span class="output-content">{{ output.output }}</span>
          <span v-if="output.type === 'command'" class="cursor">▋</span>
        </div>
        
        <!-- 当前命令输入行 -->
        <div v-if="isConnected" class="input-line">
          <span class="prompt">$ </span>
          <span class="command-input">{{ currentInput }}</span>
          <span class="cursor blink">▋</span>
        </div>
        
        <!-- 执行状态指示 -->
        <div v-if="isExecuting" class="execution-status">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>执行中...</span>
        </div>
      </div>
      
      <!-- 命令输入区域 -->
      <div class="input-container">
        <el-input 
          v-model="command" 
          placeholder="输入命令并回车执行..." 
          @keyup.enter="executeCommand"
          :disabled="!isConnected || isExecuting"
          clearable
        >
          <template #prepend>
            <span class="input-prompt">$</span>
          </template>
          <template #append>
            <el-button 
              @click="executeCommand" 
              :disabled="!isConnected || !command.trim() || isExecuting"
              :loading="isExecuting"
            >
              执行
            </el-button>
          </template>
        </el-input>
        
        <div class="quick-commands">
          <el-button 
            v-for="cmd in quickCommands" 
            :key="cmd"
            size="small"
            @click="executeQuickCommand(cmd)"
            :disabled="!isConnected || isExecuting"
          >
            {{ cmd }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 连接提示和错误信息 -->
    <div v-if="!isConnected" class="connection-prompt">
      <el-empty description="未连接到终端" :image-size="100">
        <p>请输入主机地址和端口号后点击连接</p>
      </el-empty>
    </div>
    
    <div v-if="connectionError" class="error-message">
      <el-alert 
        :title="connectionError" 
        type="error" 
        :closable="true"
        @close="clearError"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useTerminalStore } from '@/stores/terminalStore';
import { ElMessage } from 'element-plus';
import { Connection, Switch, Refresh, Loading } from '@element-plus/icons-vue';

const store = useTerminalStore();
const host = ref('localhost');
const port = ref(5000);
const command = ref('');
const outputContainer = ref<HTMLElement | null>(null);
const currentInput = ref('');
const isConnecting = ref(false);

// 常用命令快捷按钮
const quickCommands = ['ls', 'pwd', 'cd', 'clear', 'ps', 'top'];

const isConnected = computed(() => store.isConnected);
const isExecuting = computed(() => store.isLoading);
const status = computed(() => store.status);
const outputHistory = computed(() => store.outputHistory);
const connectionError = computed(() => store.connectionError);
const sessionId = computed(() => store.sessionId);

// 状态显示文本
const statusText = computed(() => {
  if (!isConnected.value) return '未连接';
  if (isExecuting.value) return '执行中...';
  return status.value?.status === 'executing' ? '执行中' : '已连接';
});

// 状态点样式
const statusClass = computed(() => ({
  'connected': isConnected.value && !isExecuting.value,
  'executing': isExecuting.value,
  'disconnected': !isConnected.value,
  'error': !!connectionError.value
}));

// 自动滚动到底部
watch(outputHistory, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { deep: true });

// 监听错误
watch(connectionError, (error) => {
  if (error) {
    ElMessage.error(error);
  }
});

const scrollToBottom = () => {
  if (outputContainer.value) {
    outputContainer.value.scrollTop = outputContainer.value.scrollHeight;
  }
};

const toggleConnection = async () => {
  if (store.isConnected) {
    store.disconnect();
  } else {
    isConnecting.value = true;
    try {
      await store.connect(host.value, parseInt(port.value));
      ElMessage.success('连接成功');
    } catch (error) {
      ElMessage.error('连接失败');
    } finally {
      isConnecting.value = false;
    }
  }
};

const executeCommand = () => {
  if (command.value.trim() && isConnected.value) {
    // 显示输入的命令
    // store.addToOutputHistory({
    //   type: 'command',
    //   content: command.value.trim()
    // });
    
    store.executeCommand(command.value.trim());
    command.value = '';
    currentInput.value = '';
  }
};

const executeQuickCommand = (cmd: string) => {
  command.value = cmd;
  executeCommand();
};

const clearOutput = () => {
  store.clearOutput();
  ElMessage.info('终端已清屏');
};

const clearError = () => {
  store.clearError();
};

// 键盘快捷键
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 'l') {
    event.preventDefault();
    clearOutput();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
  if (store.isConnected) {
    store.disconnect();
  }
});
</script>

<style scoped>
.terminal-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  /* background: #f5f7fa; */
  border-radius: 8px;
  overflow: hidden;
}

.connection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  /* background: white; */
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.connection-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.connected {
  background: #67c23a;
  box-shadow: 0 0 6px #67c23a;
}

.status-dot.executing {
  background: #e6a23c;
  box-shadow: 0 0 6px #e6a23c;
  animation: pulse 1.5s infinite;
}

.status-dot.disconnected {
  background: #909399;
}

.status-dot.error {
  background: #f56c6c;
  box-shadow: 0 0 6px #f56c6c;
}

.status-text {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.session-id {
  font-size: 12px;
  color: #909399;
}

.terminal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
}

.output-panel {
  flex: 1;
  background: #1e1e1e;
  border-radius: 6px;
  padding: 16px;
  overflow-y: auto;
  color: #d4d4d4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  position: relative;
}

.output-line {
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 4px;
}

.output-line.command-line {
  color: #569cd6;
  font-weight: 500;
}

.prompt {
  color: #4ec9b0;
  margin-right: 8px;
}

.output-content {
  color: inherit;
}

.cursor {
  color: #d4d4d4;
  animation: blink 1s infinite;
}

.input-line {
  color: #569cd6;
  font-weight: 500;
}

.command-input {
  color: #d4d4d4;
}

.execution-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e6a23c;
  margin-top: 8px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-prompt {
  color: #4ec9b0;
  font-weight: bold;
  padding: 0 8px;
}

.quick-commands {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-commands .el-button {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.connection-prompt {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  /* background: white; */
}

.error-message {
  margin: 0 20px 20px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

:deep(.el-input__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

:deep(.output-panel::-webkit-scrollbar) {
  width: 6px;
}

:deep(.output-panel::-webkit-scrollbar-track) {
  background: #2d2d30;
}

:deep(.output-panel::-webkit-scrollbar-thumb) {
  background: #3e3e42;
  border-radius: 3px;
}

:deep(.output-panel::-webkit-scrollbar-thumb:hover) {
  background: #4f4f4f;
}
</style>
