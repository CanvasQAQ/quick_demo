<template>
  <div class="settings">
    <el-card header="API 设置">
    
    <el-form :model="form" @submit.prevent="saveSettings">
      <el-form-item label="API 地址:" prop="url">
        <el-input
          v-model="form.url"
          type="url"
          placeholder="http://localhost"
          :disabled="isLoading"
        />
      </el-form-item>
      
      <el-form-item label="端口号:" prop="port">
        <el-input-number
          v-model="form.port"
          :min="1"
          :max="65535"
          :disabled="isLoading"
          controls-position="right"
        />
      </el-form-item>
      
      <el-form-item>
        <el-button
          type="primary"
          :loading="isLoading"
          :disabled="!isFormValid"
          @click="saveSettings"
        >
          保存设置
        </el-button>
        
        <el-button
          :disabled="isLoading"
          @click="resetToDefault"
        >
          恢复默认
        </el-button>
      </el-form-item>
    
    </el-form>
    </el-card>

  <el-card header="当前配置" style="margin-top: 20px;">
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item label="API 地址">
        <el-tag type="info">{{ store.config.url || '未设置' }}</el-tag>
      </el-descriptions-item>
      
      <el-descriptions-item label="端口">
        <el-tag type="info">{{ store.config.port || '未设置' }}</el-tag>
      </el-descriptions-item>
      
      <el-descriptions-item label="完整地址">
        <el-tag 
          :type="store.apiBaseUrl ? 'success' : 'warning'" 
          style="word-break: break-all;"
        >
          {{ store.apiBaseUrl || '配置不完整' }}
        </el-tag>
        <el-button
            v-if="store.apiBaseUrl"
            size="small"
            @click="copyFullUrl"
            class="ml-4"
            title="复制完整地址"
          > <icon-copy/></el-button>
      </el-descriptions-item>
    </el-descriptions>
  </el-card>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useApiConfigStore } from '@/stores/apiConfigStore'
import { ApiConfig } from '@/types/api'
import { ElMessage } from 'element-plus'

const store = useApiConfigStore()
const successMessage = ref<string>('')

const form = reactive<ApiConfig>({
  url: '',
  port: 3000
})

const isLoading = computed(() => store.isLoading)
const error = computed(() => store.error)
const isFormValid = computed(() => form.url && form.port > 0 && form.port <= 65535)

onMounted(async () => {
  await store.loadApiConfig()
  Object.assign(form, store.config)
})

const saveSettings = async (): Promise<void> => {
  successMessage.value = ''
  
  try {
    await store.saveApiConfig(form)
    ElMessage.success('设置保存成功！') 
    
  } catch (err) {
    // 错误信息由 store 的 error 状态处理
  }
}

const resetToDefault = async (): Promise<void> => {
  successMessage.value = ''
  
  try {
    await store.resetToDefault()
    Object.assign(form, store.config)
    ElMessage.success('已恢复默认设置！')
  } catch (err) {
    // 错误信息由 store 的 error 状态处理
  }
}

const copyFullUrl = async () => {
  if (!store.apiBaseUrl) return
  
  try {
    await navigator.clipboard.writeText(store.apiBaseUrl)
    ElMessage.success('已复制到剪贴板')
  } catch (err) {
    // 降级方案：使用 document.execCommand
    const textArea = document.createElement('textarea')
    textArea.value = store.apiBaseUrl
    document.body.appendChild(textArea)
    textArea.select()
    
    try {
      document.execCommand('copy')
      ElMessage.success('已复制到剪贴板')
    } catch (fallbackErr) {
      ElMessage.error('复制失败，请手动复制')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}
</script>

<style scoped>
.settings {
  padding: 20px;
  max-width: 500px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-alert) {
  margin-bottom: 16px;
}
</style>
