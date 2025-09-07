<template>
  <div class="api-tester">
    <!-- URL输入区域 -->
    <div v-if="showInput" class="input-section">
      <el-input
        v-model="inputUrl"
        placeholder="请输入API URL"
        :disabled="inputDisabled"
        size="small"
        @keyup.enter="testCustomApi"
      >
        <template #append>
          <el-button
            :loading="testing"
            :disabled="testing || !inputUrl"
            @click="testCustomApi"
            size="small"
          >
            测试
          </el-button>
        </template>
      </el-input>
    </div>

    <!-- 预设按钮区域 -->
    <div v-if="presetButtons && presetButtons.length" class="preset-buttons">
      <el-tooltip
        v-for="(button, index) in presetButtons"
        :key="index"
        :content="getFullUrl(button.endpoint)"
        placement="top"
      >
        <el-button
          :loading="testing && currentTestingEndpoint === button.endpoint"
          :disabled="testing"
          @click="testPresetApi(button.endpoint)"
          size="small"
          type="primary"
          plain
        >
          {{ button.label }}
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

interface ApiTestResult {
  success: boolean
  message: string
  statusCode?: number
  responseTime: number
}

interface PresetButton {
  label: string
  endpoint: string
}

interface Props {
  showInput?: boolean
  inputDisabled?: boolean
  presetButtons?: PresetButton[]
  baseUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  showInput: true,
  inputDisabled: false,
  presetButtons: () => [],
  baseUrl: ''
})




const emit = defineEmits<{
  (e: 'test-start', url: string): void
  (e: 'test-complete', result: ApiTestResult): void
  (e: 'test-error', error: Error): void
}>()

const inputUrl = ref('')
const testing = ref(false)
const currentTestingEndpoint = ref('')

const getFullUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http')) {
    return endpoint
  }
  return props.baseUrl ? `${props.baseUrl}${endpoint}` : endpoint
}

const testCustomApi = async () => {
  if (!inputUrl.value) {
    ElMessage.warning('请输入测试URL')
    return
  }
  await executeTest(inputUrl.value)
}

const testPresetApi = async (endpoint: string) => {
  const fullUrl = getFullUrl(endpoint)
  currentTestingEndpoint.value = endpoint
  await executeTest(fullUrl)
  currentTestingEndpoint.value = ''
}

const executeTest = async (url: string) => {
  testing.value = true
  emit('test-start', url)
  
  try {
    // 调用你的API测试方法
    const result: ApiTestResult = await (window as any).electronAPI?.testApi(url)
    
    // 根据返回的ApiTestResult判断显示消息
    if (result.success) {
      ElMessage.success(`测试成功: ${result.message} (${result.responseTime}ms)`)
    } else {
      ElMessage.error(`测试失败: ${result.message} (${result.responseTime}ms)`)
    }
    
    emit('test-complete', result)
  } catch (error) {
    console.error('测试API失败:', error)
    // 处理意外错误（非ApiTestResult类型的错误）
    const errorResult: ApiTestResult = {
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
      responseTime: 0
    }
    ElMessage.error(`测试异常: ${errorResult.message}`)
    emit('test-error', error as Error)
    emit('test-complete', errorResult)
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.api-tester {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-section {
  width: 100%;
}

.preset-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
