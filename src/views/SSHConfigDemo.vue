<template>
  <div class="ssh-tunnel-manager">
    <!-- 顶部状态栏 -->
    <el-alert
      :title="connectionStatus"
      :type="connectionStatusType"
      :closable="false"
      class="status-alert"
    />

    <!-- 主配置区域 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>SSH隧道配置</span>
          <el-button
            type="primary"
            :loading="isConnecting"
            @click="handleConnection"
          >
            {{ isConnected ? '断开连接' : '建立连接' }}
          </el-button>
        </div>
      </template>

      <!-- 连接模式选择 -->
      <el-form-item label="连接模式">
        <el-radio-group v-model="connectionMode">
          <el-radio label="direct">直接端口转发</el-radio>
          <el-radio label="jump">通过跳板机转发</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 目标服务器配置 -->
      <el-form :model="configForm" label-width="120px" :rules="formRules" ref="configFormRef">
        <el-divider>目标服务器配置</el-divider>
        
        <el-form-item label="目标主机" prop="targetHost">
          <el-input
            v-model="configForm.targetHost"
            placeholder="请输入目标服务器地址"
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

      <!-- 跳板机配置（仅在跳板机模式下显示） -->
      <div v-if="connectionMode === 'jump'">
        <el-divider>跳板机配置</el-divider>
        
        <div class="jump-hosts-section">
          <div v-for="(host, index) in jumpHosts" :key="index" class="jump-host-item">
            <el-card>
              <template #header>
                <div class="host-header">
                  <span>跳板机 {{ index + 1 }}</span>
                  <el-button
                    type="danger"
                    size="small"
                    @click="removeJumpHost(index)"
                    :disabled="isConnecting || isConnected"
                  >
                    删除
                  </el-button>
                </div>
              </template>

              <el-form :model="host" label-width="100px">
                <el-form-item label="主机地址" required>
                  <el-input
                    v-model="host.hostname"
                    placeholder="hostname或IP地址"
                    clearable
                    :disabled="isConnecting || isConnected"
                  />
                </el-form-item>

                <el-form-item label="端口" required>
                  <el-input-number
                    v-model="host.port"
                    :min="1"
                    :max="65535"
                    controls-position="right"
                    :disabled="isConnecting || isConnected"
                  />
                </el-form-item>

                <el-form-item label="用户名" required>
                  <el-input
                    v-model="host.username"
                    placeholder="SSH用户名"
                    clearable
                    :disabled="isConnecting || isConnected"
                  />
                </el-form-item>

                <el-form-item label="认证方式">
                  <el-radio-group v-model="host.authMethod" :disabled="isConnecting || isConnected">
                    <el-radio label="password">密码</el-radio>
                    <el-radio label="privateKey">私钥</el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item v-if="host.authMethod === 'password'" label="密码">
                  <el-input
                    v-model="host.password"
                    type="password"
                    placeholder="SSH密码"
                    show-password
                    clearable
                    :disabled="isConnecting || isConnected"
                  />
                </el-form-item>

                <el-form-item v-if="host.authMethod === 'privateKey'" label="私钥路径">
                  <el-input
                    v-model="host.privateKeyPath"
                    placeholder="私钥文件路径"
                    clearable
                    :disabled="isConnecting || isConnected"
                  >
                    <template #append>
                      <el-button @click="browsePrivateKey(index)" :disabled="isConnecting || isConnected">浏览</el-button>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item v-if="host.authMethod === 'privateKey'" label="私钥密码">
                  <el-input
                    v-model="host.passphrase"
                    type="password"
                    placeholder="私钥密码（可选）"
                    show-password
                    clearable
                    :disabled="isConnecting || isConnected"
                  />
                </el-form-item>
              </el-form>
            </el-card>
          </div>

          <el-button
            type="success"
            @click="addJumpHost"
            :disabled="isConnecting || isConnected"
            class="add-host-btn"
          >
            <el-icon><Plus /></el-icon>
            添加跳板机
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 连接信息显示 -->
    <el-card v-if="isConnected" class="info-card">
      <template #header>
        <span>连接信息</span>
      </template>
      
      <div class="connection-info">
        <p><strong>连接模式:</strong> {{ connectionMode === 'direct' ? '直接端口转发' : '跳板机转发' }}</p>
        <p><strong>本地访问地址:</strong> http://localhost:{{ configForm.localPort }}</p>
        <p><strong>目标服务器:</strong> {{ configForm.targetHost }}:{{ configForm.targetPort }}</p>
        <p v-if="connectionMode === 'jump'"><strong>跳板机数量:</strong> {{ jumpHosts.length }} 台</p>
        <p><strong>连接时间:</strong> {{ connectionTime }}</p>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

// 响应式数据
const configFormRef = ref()
const isConnecting = ref(false)
const isConnected = ref(false)
const connectionTime = ref('')
const logs = ref([])
const connectionMode = ref('direct') // 'direct' 或 'jump'

// 表单配置
const configForm = reactive({
  targetHost: '',
  targetPort: 5000,
  localPort: 8080
})

// 跳板机列表
const jumpHosts = reactive([])

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
    const modeText = connectionMode.value === 'direct' ? '直接端口转发' : '跳板机转发'
    return `连接已建立 (${modeText}) - 可通过本地端口访问远程服务`
  }
  return '未连接 - 请配置并建立连接'
})

const connectionStatusType = computed(() => {
  if (isConnecting.value) return 'info'
  if (isConnected.value) return 'success'
  return 'warning'
})

// 监听连接模式变化
watch(connectionMode, (newMode) => {
  if (newMode === 'direct') {
    addLog('info', '切换到直接端口转发模式')
  } else {
    addLog('info', '切换到跳板机转发模式')
    // 确保至少有一个跳板机
    if (jumpHosts.length === 0) {
      addJumpHost()
    }
  }
})

// 方法定义
const addJumpHost = () => {
  jumpHosts.push({
    hostname: '',
    port: 22,
    username: '',
    authMethod: 'password',
    password: '',
    privateKeyPath: '',
    passphrase: ''
  })
  addLog('info', '添加了新的跳板机配置')
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

const browsePrivateKey = (index) => {
  addLog('info', `为跳板机 ${index + 1} 选择私钥文件`)
  ElMessage.info('私钥选择功能需要在Electron环境中使用')
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
    
    // 跳板机模式需要验证跳板机配置
    if (connectionMode.value === 'jump') {
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
    let result
    
    // 创建可序列化的配置对象
    const serializableConfig = {
      targetHost: configForm.targetHost,
      targetPort: configForm.targetPort,
      localPort: configForm.localPort
    }

    if (connectionMode.value === 'direct') {
      addLog('info', '使用直接端口转发模式')
      result = await window.electronAPI.directPortForward(serializableConfig)
    } else {
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
      
      result = await window.electronAPI.establishSSHTunnel(serializableJumpHosts, serializableConfig)
    }
    
    if (result.success) {
      isConnected.value = true
      connectionTime.value = new Date().toLocaleString()
      const modeText = connectionMode.value === 'direct' ? '直接端口转发' : '跳板机转发'
      addLog('success', `${modeText}连接建立成功`)
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
  addLog('info', '当前模式: 直接端口转发')
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

.status-alert {
  margin-bottom: 20px;
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

.jump-host-item {
  margin-bottom: 16px;
}

.host-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.connection-info p {
  margin: 8px 0;
  line-height: 1.6;
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
</style>
