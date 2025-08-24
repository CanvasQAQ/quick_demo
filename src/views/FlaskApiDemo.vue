<template>
  <div class="api-tester-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <h2>Flask API 测试工具</h2>
        </div>
      </template>

      <!-- 服务器状态显示 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <div class="status-header">
                <span>服务器状态</span>
                <el-tag 
                  :type="serverStatus.isRunning ? 'success' : 'danger'" 
                  size="small"
                >
                  {{ serverStatus.isRunning ? '运行中' : '已停止' }}
                </el-tag>
              </div>
            </template>
            
            <div class="status-info">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="运行状态">
                  <el-tag :type="serverStatus.isRunning ? 'success' : 'danger'">
                    {{ serverStatus.isRunning ? '运行中' : '已停止' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="端口">
                  {{ serverStatus.port || '未设置' }}
                </el-descriptions-item>
                <el-descriptions-item label="进程ID">
                  {{ serverStatus.pid || '未设置' }}
                </el-descriptions-item>
                <el-descriptions-item label="最后错误" v-if="serverStatus.lastError">
                  <el-tag type="danger">{{ serverStatus.lastError }}</el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="action-buttons">
              <el-button 
                type="primary" 
                :loading="startingServer" 
                @click="startServer"
                :disabled="serverStatus.isRunning"
              >
                {{ startingServer ? '启动中...' : '启动服务器' }}
              </el-button>
              
              <el-button 
                type="warning" 
                :loading="restartingServer" 
                @click="restartServer"
                :disabled="!serverStatus.isRunning"
              >
                {{ restartingServer ? '重启中...' : '重启服务器' }}
              </el-button>
              
              <el-button 
                type="danger" 
                @click="stopServer"
                :disabled="!serverStatus.isRunning"
              >
                停止服务器
              </el-button>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <div class="test-header">
                <span>API 测试</span>
              </div>
            </template>

            <el-form :model="testForm" label-width="120px">
              <el-form-item label="测试URL">
                <el-input 
                  v-model="testForm.url" 
                  placeholder="输入要测试的API地址"
                  :disabled="!serverStatus.isRunning"
                >
                  <template #append>
                    <el-button 
                      @click="testCustomApi" 
                      :loading="testingCustom"
                      :disabled="!serverStatus.isRunning"
                    >
                      测试
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item>
                <el-button 
                  type="success" 
                  @click="testAllEndpoints" 
                  :loading="testingAll"
                  :disabled="!serverStatus.isRunning"
                >
                  测试所有端点
                </el-button>
                
                <el-button 
                  type="info" 
                  @click="testHealthCheck"
                  :disabled="!serverStatus.isRunning"
                >
                  健康检查
                </el-button>
              </el-form-item>
            </el-form>

            <div class="quick-test-buttons">
              <el-button 
                v-for="endpoint in predefinedEndpoints" 
                :key="endpoint.url"
                size="small"
                @click="testPredefinedEndpoint(endpoint)"
                :disabled="!serverStatus.isRunning"
              >
                {{ endpoint.name }}
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 测试结果 -->
      <el-card shadow="hover" class="results-card">
        <template #header>
          <div class="results-header">
            <span>测试结果</span>
            <el-button 
              type="text" 
              @click="clearResults"
              :disabled="testResults.length === 0"
            >
              清空结果
            </el-button>
          </div>
        </template>

        <el-table 
          :data="testResults" 
          stripe 
          style="width: 100%"
          v-loading="testingAll || testingCustom"
          empty-text="暂无测试结果"
        >
          <el-table-column prop="timestamp" label="时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="url" label="URL" min-width="200" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag 
                :type="row.success ? 'success' : 'danger'" 
                size="small"
              >
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="statusCode" label="状态码" width="100" />
          <el-table-column prop="responseTime" label="响应时间" width="100">
            <template #default="{ row }">
              {{ row.responseTime ? `${row.responseTime}ms` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="message" label="消息" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button 
                type="text" 
                size="small"
                @click="retest(row.url)"
                :disabled="!serverStatus.isRunning"
              >
                重试
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 统计信息 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-statistic title="总测试次数" :value="testResults.length" />
        </el-col>
        <el-col :span="6">
          <el-statistic 
            title="成功率" 
            :value="successRate" 
            suffix="%" 
            :value-style="successRate >= 80 ? { color: '#67C23A' } : { color: '#F56C6C' }"
          />
        </el-col>
        <el-col :span="6">
          <el-statistic title="平均响应时间" :value="avgResponseTime" suffix="ms" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="当前端口" :value="serverStatus.port || 0" />
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface TestResult {
  timestamp: number
  url: string
  success: boolean
  message: string
  statusCode?: number
  responseTime?: number
}

interface ServerStatus {
  isRunning: boolean
  port?: number
  pid?: number
  lastError?: string
}

interface PredefinedEndpoint {
  name: string
  url: string
}

const serverStatus = ref<ServerStatus>({
  isRunning: false,
  port: undefined,
  pid: undefined,
  lastError: undefined
})

const testForm = ref({
  url: 'http://127.0.0.1:5000/health'
})

const testResults = ref<TestResult[]>([])
const startingServer = ref(false)
const restartingServer = ref(false)
const testingAll = ref(false)
const testingCustom = ref(false)

const predefinedEndpoints = ref<PredefinedEndpoint[]>([
  { name: '健康检查', url: '/health' },
  { name: '首页', url: '/' },
  { name: 'API数据', url: '/api/data' }
])

// 计算属性
const successRate = computed(() => {
  if (testResults.value.length === 0) return 0
  const successCount = testResults.value.filter(r => r.success).length
  return Math.round((successCount / testResults.value.length) * 100)
})

const avgResponseTime = computed(() => {
  const validTimes = testResults.value
    .filter(r => r.responseTime && r.success)
    .map(r => r.responseTime!) as number[]
  
  if (validTimes.length === 0) return 0
  return Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
})

// 生命周期
onMounted(() => {
  loadServerStatus()
  loadTestResults()
})

// 方法
const loadServerStatus = async () => {
  try {
    const status = await window.electronAPI?.getFlaskServerStatus()
    serverStatus.value = status
  } catch (error) {
    console.error('获取服务器状态失败:', error)
    ElMessage.error('获取服务器状态失败')
  }
}

const loadTestResults = () => {
  const saved = localStorage.getItem('api-test-results')
  if (saved) {
    testResults.value = JSON.parse(saved)
  }
}

const saveTestResults = () => {
  localStorage.setItem('api-test-results', JSON.stringify(testResults.value))
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

const startServer = async () => {
  startingServer.value = true
  try {
    const result = await window.electronAPI?.startFlaskServer()
    serverStatus.value = result
    
    if (result.isRunning) {
      ElMessage.success('服务器启动成功')
    } else {
      ElMessage.error(`启动失败: ${result.lastError}`)
    }
  } catch (error) {
    console.error('启动服务器失败:', error)
    ElMessage.error('启动服务器失败')
  } finally {
    startingServer.value = false
  }
}

const restartServer = async () => {
  restartingServer.value = true
  try {
    const result = await window.electronAPI?.restartFlaskServer()
    serverStatus.value = result
    
    if (result.isRunning) {
      ElMessage.success('服务器重启成功')
    } else {
      ElMessage.error(`重启失败: ${result.lastError}`)
    }
  } catch (error) {
    console.error('重启服务器失败:', error)
    ElMessage.error('重启服务器失败')
  } finally {
    restartingServer.value = false
  }
}

const stopServer = async () => {
  try {
    await ElMessageBox.confirm('确定要停止服务器吗？', '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await window.electronAPI?.stopFlaskServer()
    serverStatus.value = { isRunning: false }
    ElMessage.success('服务器已停止')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('停止服务器失败:', error)
      ElMessage.error('停止服务器失败')
    }
  }
}

const testCustomApi = async () => {
  if (!testForm.value.url) {
    ElMessage.warning('请输入测试URL')
    return
  }

  testingCustom.value = true
  try {
    const result = await window.electronAPI?.testApi(testForm.value.url)
    addTestResult(testForm.value.url, result)
  } catch (error) {
    console.error('测试API失败:', error)
    ElMessage.error('测试API失败')
  } finally {
    testingCustom.value = false
  }
}

const testAllEndpoints = async () => {
  if (!serverStatus.value.port) {
    ElMessage.warning('服务器未启动')
    return
  }

  testingAll.value = true
  try {
    const baseUrl = `http://127.0.0.1:${serverStatus.value.port}`
    
    for (const endpoint of predefinedEndpoints.value) {
      const url = baseUrl + endpoint.url
      const result = await window?.electronAPI.testApi(url)
      addTestResult(url, result)
      // 添加短暂延迟避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    ElMessage.success('所有端点测试完成')
  } catch (error) {
    console.error('测试所有端点失败:', error)
    ElMessage.error('测试所有端点失败')
  } finally {
    testingAll.value = false
  }
}

const testHealthCheck = async () => {
  if (!serverStatus.value.port) {
    ElMessage.warning('服务器未启动')
    return
  }

  const url = `http://127.0.0.1:${serverStatus.value.port}/health`
  testForm.value.url = url
  await testCustomApi()
}

const testPredefinedEndpoint = async (endpoint: PredefinedEndpoint) => {
  if (!serverStatus.value.port) {
    ElMessage.warning('服务器未启动')
    return
  }

  const url = `http://127.0.0.1:${serverStatus.value.port}${endpoint.url}`
  testForm.value.url = url
  await testCustomApi()
}

const addTestResult = (url: string, result: any) => {
  const testResult: TestResult = {
    timestamp: Date.now(),
    url,
    success: result.success,
    message: result.message,
    statusCode: result.statusCode,
    responseTime: result.responseTime
  }
  
  testResults.value.unshift(testResult)
  // 只保留最近的50条记录
  if (testResults.value.length > 50) {
    testResults.value = testResults.value.slice(0, 50)
  }
  
  saveTestResults()
}

const retest = async (url: string) => {
  testForm.value.url = url
  await testCustomApi()
}

const clearResults = () => {
  testResults.value = []
  localStorage.removeItem('api-test-results')
  ElMessage.success('已清空测试结果')
}
</script>

<style scoped>
.api-tester-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.box-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-header, .test-header, .results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-info {
  margin-bottom: 15px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-test-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 15px;
}

.results-card {
  margin-top: 20px;
}

.stats-row {
  margin-top: 20px;
}

:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: bold;
}
</style>
