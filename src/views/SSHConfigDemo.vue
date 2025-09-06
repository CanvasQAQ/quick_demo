<template>
  <div class="ssh-tunnel-manager">
    <!-- 顶部状态栏 -->
    <div class="top-bar">
      <el-alert
        :title="connectionStatus"
        :type="connectionStatusType"
        :closable="false"
        class="status-alert"
      />
      <div class="top-buttons">
        <el-button 
          type="primary" 
          @click="handleSaveConfig"
          :disabled="isConnecting || isConnected"
        >
          保存配置
        </el-button>
        <el-button 
          type="success" 
          @click="handleLoadConfig"
          :disabled="isConnecting || isConnected"
        >
          加载配置
        </el-button>
        <el-button
          type="primary"
          :loading="isConnecting"
          @click="handleConnection"
        >
          {{ isConnected ? '断开连接' : '建立连接' }}
        </el-button>
      </div>
    </div>

    <!-- 主配置区域 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>SSH隧道配置</span>
        </div>
      </template>

      <!-- 目标服务器配置 -->
      <el-form :model="configForm" label-width="120px" :rules="formRules" ref="configFormRef">
        <el-divider>目标服务器配置</el-divider>
        
        <el-form-item label="目标主机" prop="targetHost">
          <el-input
            v-model="configForm.targetHost"
            placeholder="localhost"
            clearable
          />
        </el-form-item>

        <el-form-item label="目标端口" prop="targetPort">
          <el-input-number
            v-model="configForm.targetPort"
            :min="1"
            :max="65535"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="本地端口" prop="localPort">
          <el-input-number
            v-model="configForm.localPort"
            :min="1024"
            :max="65535"
            controls-position="right"
          />
          <span class="port-hint">(1024-65535)</span>
        </el-form-item>
      </el-form>

      <!-- 跳板机配置 -->
      <el-divider>跳板机配置</el-divider>
      
      <div class="jump-hosts-section">
        <!-- 跳板机列表展示 -->
        <el-table :data="jumpHosts" class="jump-hosts-table" v-if="jumpHosts.length > 0">
          <el-table-column label="序号" type="index" width="60" align="center" />
          <el-table-column label="主机地址" prop="hostname" min-width="120" align="center" />
          <el-table-column label="端口" prop="port" width="80"  align="center"/>
          <el-table-column label="用户名" prop="username" min-width="100" align="center"/>
          <el-table-column label="认证方式" width="100" align="center">
            <template #default="{ row }">
              {{ row.authMethod === 'password' ? '密码' : '私钥' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ $index }">
              <div class="flex">
              <el-button
                size="small"
                @click="editJumpHost($index)"
                :disabled="isConnecting || isConnected"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="removeJumpHost($index)"
                :disabled="isConnecting || isConnected"
              >
                删除
              </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-button
          type="success"
          @click="showJumpHostForm"
          :disabled="isConnecting || isConnected"
          class="add-host-btn"
        >
          <el-icon><Plus /></el-icon>
          {{ jumpHosts.length === 0 ? '添加跳板机' : '添加更多跳板机' }}
        </el-button>
      </div>
    </el-card>

    <!-- 连接信息显示 -->
    <el-card v-if="isConnected" class="info-card">
      <template #header>
        <span>连接信息</span>
      </template>
      
<div class="connection-info">
            <div class="info-row">
                <span class="info-label">本地访问地址:</span>
                <div class="info-content">
                    <a :href="localAccessUrl" target="_blank" class="access-link">
                        {{ localAccessUrl }}
                    </a>
                    <el-button 
                        size="mini" 
                        @click="copyToClipboard(localAccessUrl)"
                        class="copy-btn"
                    >
                        <el-icon><document-copy /></el-icon>
                    </el-button>
                </div>
            </div>
            
            <div class="info-row">
                <span class="info-label">路径:</span>
                <div class="info-content connection-path">
                    <el-tag type="success">local</el-tag> → 
                    <span v-for="(host, index) in jumpHosts" :key="index"><el-tag type="success">
                        {{ host.hostname }}:{{ host.port }} </el-tag>→ 
                    </span>
                    <el-tag type="success">{{ configForm.targetHost }}:{{ configForm.targetPort }}</el-tag>
                </div>
            </div>
            
            <div class="info-row">
                <span class="info-label">跳板机数量:</span>
                <div class="info-content">
                    {{ jumpHosts.length }} 台
                </div>
            </div>
            
            <div class="info-row">
                <span class="info-label">连接时间:</span>
                <div class="info-content">
                    {{ connectionTime }}
                </div>
            </div>
        </div>
    </el-card>

    <!-- 日志面板 -->
    <el-card class="log-card">
      <template #header>
        <div class="log-header">
          <span>操作日志</span>
          <el-button size="small" @click="clearLogs">清空日志</el-button>
        </div>
      </template>
      
      <div class="log-content">
        <div v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
          <span class="log-time">[{{ log.time }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </el-card>

    <!-- 跳板机表单弹窗 -->
    <el-dialog
      :title="isEditing ? '编辑跳板机' : '添加跳板机'"
      v-model="showJumpHostDialog"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="currentJumpHost" label-width="100px" ref="jumpHostFormRef">
        <el-form-item label="主机地址" prop="hostname" required>
          <el-input
            v-model="currentJumpHost.hostname"
            placeholder="hostname或IP地址"
            clearable
          />
        </el-form-item>

        <el-form-item label="端口" prop="port" required>
          <el-input-number
            v-model="currentJumpHost.port"
            :min="1"
            :max="65535"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="用户名" prop="username" required>
          <el-input
            v-model="currentJumpHost.username"
            placeholder="SSH用户名"
            clearable
          />
        </el-form-item>

        <el-form-item label="认证方式">
          <el-radio-group v-model="currentJumpHost.authMethod">
            <el-radio label="password">密码</el-radio>
            <el-radio label="privateKey">私钥</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="currentJumpHost.authMethod === 'password'" label="密码" prop="password" required>
          <el-input
            v-model="currentJumpHost.password"
            type="password"
            placeholder="SSH密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item v-if="currentJumpHost.authMethod === 'privateKey'" label="私钥路径" prop="privateKeyPath" required>
          <el-input
            v-model="currentJumpHost.privateKeyPath"
            placeholder="私钥文件路径"
            clearable
          >
            <template #append>
              <el-button @click="browsePrivateKey">浏览</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="currentJumpHost.authMethod === 'privateKey'" label="私钥密码">
          <el-input
            v-model="currentJumpHost.passphrase"
            type="password"
            placeholder="私钥密码（可选）"
            show-password
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showJumpHostDialog = false">取消</el-button>
          <el-button type="primary" @click="saveJumpHost">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DocumentCopy } from '@element-plus/icons-vue'

// 响应式数据
const configFormRef = ref()
const jumpHostFormRef = ref()
const isConnecting = ref(false)
const isConnected = ref(false)
const connectionTime = ref('')
const logs = ref([])
const showJumpHostDialog = ref(false)
const isEditing = ref(false)
const editingIndex = ref(-1)

// 表单配置
const configForm = reactive({
  targetHost: 'localhost',
  targetPort: 5000,
  localPort: 8080
})

// 跳板机列表
const jumpHosts = reactive([])

// 当前编辑的跳板机
const currentJumpHost = reactive({
  hostname: '',
  port: 22,
  username: '',
  authMethod: 'password',
  password: '',
  privateKeyPath: '',
  passphrase: ''
})

// 表单验证规则
const formRules = {
  targetHost: [
    { required: true, message: '请输入目标主机地址', trigger: 'blur' }
  ],
  targetPort: [
    { required: true, message: '请输入目标端口', trigger: 'blur' }
  ],
  localPort: [
    { required: true, message: '请输入本地端口', trigger: 'blur' }
  ]
}

// 计算属性
const connectionStatus = computed(() => {
  if (isConnecting.value) return '正在建立连接...'
  if (isConnected.value) {
    return '连接已建立 - 可通过本地端口访问远程服务'
  }
  return '未连接 - 请配置并建立连接'
})

const connectionStatusType = computed(() => {
  if (isConnecting.value) return 'info'
  if (isConnected.value) return 'success'
  return 'warning'
})

const localAccessUrl = computed(() => {
  return `http://localhost:${configForm.localPort}`
})

// 方法定义
const showJumpHostForm = (index = -1) => {
  isEditing.value = index >= 0
  editingIndex.value = index
  
  // 重置表单或填充编辑数据
  Object.assign(currentJumpHost, index >= 0 
    ? {...jumpHosts[index]} 
    : {
        hostname: '',
        port: 22,
        username: '',
        authMethod: 'password',
        password: '',
        privateKeyPath: '',
        passphrase: ''
      }
  )
  
  showJumpHostDialog.value = true
  nextTick(() => {
    if (jumpHostFormRef.value) {
      jumpHostFormRef.value.clearValidate()
    }
  })
}

const editJumpHost = (index) => {
  showJumpHostForm(index)
}

const saveJumpHost = async () => {
  try {
    // 简单验证
    if (!currentJumpHost.hostname || !currentJumpHost.port || !currentJumpHost.username) {
      ElMessage.warning('请填写必填字段')
      return
    }
    
    if (currentJumpHost.authMethod === 'password' && !currentJumpHost.password) {
      ElMessage.warning('请输入密码')
      return
    }
    
    if (currentJumpHost.authMethod === 'privateKey' && !currentJumpHost.privateKeyPath) {
      ElMessage.warning('请选择私钥文件')
      return
    }

    if (isEditing.value) {
      // 更新现有跳板机
      Object.assign(jumpHosts[editingIndex.value], {...currentJumpHost})
      addLog('info', '更新了跳板机配置')
    } else {
      // 添加新跳板机
      jumpHosts.push({...currentJumpHost})
      addLog('info', '添加了新的跳板机配置')
    }
    
    showJumpHostDialog.value = false
  } catch (error) {
    console.error('保存跳板机配置失败:', error)
  }
}

const removeJumpHost = (index) => {
  if (jumpHosts.length <= 1) {
    ElMessage.warning('至少需要保留一个跳板机')
    return
  }
  
  ElMessageBox.confirm('确定要删除这个跳板机配置吗？', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    jumpHosts.splice(index, 1)
    addLog('info', '删除了跳板机配置')
  })
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
    addLog('success', '已复制本地访问地址')
  } catch (err) {
    console.error('复制失败:', err)
    ElMessage.error('复制失败')
    addLog('error', '复制本地访问地址失败')
  }
}

// 保存配置按钮点击事件
const handleSaveConfig = async () => {
  try {
    // 构建可序列化的配置数据
    const serializableConfig = {
      targetHost: configForm.targetHost,
      targetPort: configForm.targetPort,
      localPort: configForm.localPort
    };

    // 创建可序列化的跳板机数组
    const serializableJumpHosts = jumpHosts.map(host => ({
      hostname: host.hostname,
      port: host.port,
      username: host.username,
      authMethod: host.authMethod,
      password: host.password,
      privateKeyPath: host.privateKeyPath,
      passphrase: host.passphrase
    }));

    // 完整的配置对象
    const fullConfig = {
      config: serializableConfig,
      jumpHosts: serializableJumpHosts,
      timestamp: new Date().toISOString(),
      version: '1.0' // 可选的版本标识
    };
    console.log(fullConfig)

    const result = await window.electronAPI.saveConfig(fullConfig);
    
    if (result.success) {
      ElMessage.success('配置保存成功');
      addLog('success', '配置已成功保存');
    } else {
      ElMessage.error(`保存失败: ${result.error}`);
      addLog('error', `保存配置失败: ${result.error}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ElMessage.error(`保存配置时出错: ${errorMessage}`);
    addLog('error', `保存配置时出错: ${errorMessage}`);
  }
};


// 加载配置按钮点击事件
const handleLoadConfig = async () => {
  try {
    const result = await window.electronAPI.loadConfig();
    console.log(result)
    if (result.success && result.data) {
      const loadedConfig = result.data;
      
      // 还原主配置到表单
      if (loadedConfig.config) {
        configForm.targetHost = loadedConfig.config.targetHost || '';
        configForm.targetPort = loadedConfig.config.targetPort || '';
        configForm.localPort = loadedConfig.config.localPort || '';
      }
      
      // 还原跳板机数组
      if (loadedConfig.jumpHosts && Array.isArray(loadedConfig.jumpHosts)) {
        // 清空现有跳板机数组
        jumpHosts.splice(0, jumpHosts.length);
        
        // 添加加载的跳板机配置
        loadedConfig.jumpHosts.forEach(hostConfig => {
          jumpHosts.push({
            hostname: hostConfig.hostname || '',
            port: hostConfig.port || 22,
            username: hostConfig.username || '',
            authMethod: hostConfig.authMethod || 'password',
            password: hostConfig.password || '',
            privateKeyPath: hostConfig.privateKeyPath || '',
            passphrase: hostConfig.passphrase || '',
            // 如果有其他字段需要初始化，可以在这里添加
            id: Date.now() + Math.random() // 生成唯一ID（如果需要）
          });
        });
      }
      
      ElMessage.success('配置加载成功');
      addLog('success', '配置已成功加载');
      
      // 可选：触发界面更新
      // forceUpdate(); 或者相关的状态更新方法
      
    } else {
      ElMessage.error(`加载失败: ${result.error}`);
      addLog('error', `加载配置失败: ${result.error}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ElMessage.error(`加载配置时出错: ${errorMessage}`);
    addLog('error', `加载配置时出错: ${errorMessage}`);
  }
};


const browsePrivateKey = async () => {
  addLog('info', '选择私钥文件')
  
  try {
    // 构建对话框选项 - 只需要指定过滤器和标题
    const dialogOptions = {
      title: '选择SSH私钥文件',
      filters: [
        { name: 'SSH私钥文件', extensions: ['pem', 'key', 'ppk', '*'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    }
    
    // 调用现有的 show-open-dialog API
    const result = await window.electronAPI.showOpenDialog(dialogOptions)
    
    if (result.success && result.data && !result.data.canceled && result.data.filePaths.length > 0) {
      const filePath = result.data.filePaths[0]
      currentJumpHost.privateKeyPath = filePath
      addLog('success', `已选择私钥文件: ${filePath}`)
      ElMessage.success('私钥文件选择成功')
    } else if (result.data && result.data.canceled) {
      addLog('info', '用户取消了文件选择')
    } else {
      throw new Error(result.error || '文件选择失败')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    addLog('error', `选择私钥文件失败: ${errorMessage}`)
    ElMessage.error('选择私钥文件失败，请手动输入路径')
  }
}


const handleConnection = async () => {
  if (isConnected.value) {
    disconnect()
    return
  }

  if (!await validateForm()) {
    return
  }

  await connect()
}

const validateForm = async () => {
  try {
    await configFormRef.value.validate()
    
    // 验证跳板机配置
    if (jumpHosts.length === 0) {
      ElMessage.warning('请至少添加一个跳板机')
      return false
    }
    
    for (const host of jumpHosts) {
      if (!host.hostname || !host.port || !host.username) {
        ElMessage.warning('请完善所有跳板机配置')
        return false
      }
      
      if (host.authMethod === 'password' && !host.password) {
        ElMessage.warning('请输入密码')
        return false
      }
      
      if (host.authMethod === 'privateKey' && !host.privateKeyPath) {
        ElMessage.warning('请选择私钥文件')
        return false
      }
    }

    return true
  } catch (error) {
    ElMessage.warning('请完善配置信息')
    return false
  }
}

const connect = async () => {
  isConnecting.value = true
  addLog('info', '开始建立连接...')

  try {
    // 创建可序列化的配置对象
    const serializableConfig = {
      targetHost: configForm.targetHost,
      targetPort: configForm.targetPort,
      localPort: configForm.localPort
    }

    addLog('info', '使用跳板机转发模式')
    
    // 创建可序列化的跳板机数组
    const serializableJumpHosts = jumpHosts.map(host => ({
      hostname: host.hostname,
      port: host.port,
      username: host.username,
      authMethod: host.authMethod,
      password: host.password,
      privateKeyPath: host.privateKeyPath,
      passphrase: host.passphrase
    }))
    
    const result = await window.electronAPI.establishSSHTunnel(serializableJumpHosts, serializableConfig)
    
    if (result.success) {
      isConnected.value = true
      connectionTime.value = new Date().toLocaleString()
      addLog('success', '跳板机转发连接建立成功')
      ElMessage.success('连接建立成功')
    } else {
      throw new Error(result.error || '未知连接错误')
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    addLog('error', `连接失败: ${errorMessage}`)
    
    if (errorMessage.toLowerCase().includes('timeout')) {
      ElMessage.error('连接超时，请检查网络或主机地址')
    } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('password')) {
      ElMessage.error('认证失败，请检查用户名和密码')
    } else if (errorMessage.toLowerCase().includes('refused')) {
      ElMessage.error('连接被拒绝，请检查端口号和防火墙设置')
    } else {
      ElMessage.error(`连接失败: ${errorMessage}`)
    }
    
  } finally {
    isConnecting.value = false
  }
}

const disconnect = () => {
  window.electronAPI.cleanupConnections()
  isConnected.value = false
  addLog('info', '已断开连接')
  ElMessage.info('连接已断开')
}

const addLog = (type, message) => {
  logs.value.unshift({
    type,
    message,
    time: new Date().toLocaleTimeString()
  })
  
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

const clearLogs = () => {
  logs.value = []
  addLog('info', '已清空日志')
}

// 生命周期钩子
onMounted(() => {
  addLog('info', 'SSH隧道管理器已初始化')
  // 默认添加一个跳板机 - 使用新的方式
  jumpHosts.push({
    hostname: '',
    port: 22,
    username: '',
    authMethod: 'password',
    password: '',
    privateKeyPath: '',
    passphrase: ''
  })
  addLog('info', '已添加默认跳板机配置')
})

onUnmounted(() => {
  if (isConnected.value) {
    disconnect()
  }
})
</script>

<style scoped>
.ssh-tunnel-manager {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 15px;
}

.top-bar .status-alert {
  flex: 1;
  margin-bottom: 0;
}

.top-buttons {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jump-hosts-section {
  margin-top: 20px;
}

.jump-hosts-table {
  margin-bottom: 16px;
  width: 100%;
}
.jump-hosts-table .el-table__cell {
  text-align: center;
}
.add-host-btn {
  width: 100%;
  margin-top: 10px;
}

.port-hint {
  margin-left: 10px;
  color: #666;
  font-size: 12px;
}

.info-card, .log-card {
  margin-bottom: 20px;
}

.connection-info {
    font-family: Arial, sans-serif;
    /* max-width: px; */
    margin: 20px;
    padding: 15px;
    border-radius: 4px;
    /* display: grid; */
    grid-template-columns: auto 1fr;
    gap: 10px 5px;
    align-items: center;
}

.info-row {
    display: flex;
    margin-bottom: 12px;
    align-items: flex-start;
}

.info-label {
    flex: 0 0 120px;
    font-weight: bold;
    text-align: left;
    padding-right: 10px;
    padding-top: 2px;
}

.info-content {
    flex: 1;
}
.connection-info p {
  /* margin: 8px 0; */
  /* line-height: 1.6; */
  display: contents;
  /* align-items: center; */
}

.access-link {
  color: #409EFF;
  text-decoration: none;
  margin-right: 12px;
}

.access-link:hover {
  text-decoration: underline;
}

.copy-btn {
  margin-left: 8px;
  padding: 4px 8px;
}

.connection-path {
  /* font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; */
  /* padding: 4px 8px; */
  border-radius: 4px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-content {
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.log-item {
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.log-item.info {
  color: #606266;
}

.log-item.success {
  color: #67c23a;
}

.log-item.error {
  color: #f56c6c;
}

.log-item.warning {
  color: #e6a23c;
}
.log-time {
  color: #909399;
  margin-right: 8px;
}

.log-message {
  word-break: break-all;
}

/* 表格样式优化 */
.jump-hosts-table :deep(.el-table__cell) {
  padding: 8px 0;
}

.jump-hosts-table :deep(.el-button) {
  margin: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .top-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .connection-info p {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .copy-btn {
    margin-left: 0;
    margin-top: 4px;
  }
}
</style>
