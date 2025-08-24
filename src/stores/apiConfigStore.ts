import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ApiConfig } from '@/types/api'

// 默认配置
const defaultApiConfig: ApiConfig = {
  url: 'http://localhost',
  port: 3000
}

export const useApiConfigStore = defineStore('apiConfig', () => {
  const config = ref<ApiConfig>({ ...defaultApiConfig })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性：完整的 API 基础 URL
  const apiBaseUrl = computed(() => {
    return `${config.value.url}:${config.value.port}`
  })

  // 从 Electron store 加载配置
  const loadApiConfig = async (): Promise<void> => {
    isLoading.value = true
    error.value = null
    
    try {
      const savedConfig = await window.electronAPI?.loadApiConfig()
      if (savedConfig) {
        config.value = { ...defaultApiConfig, ...savedConfig }
      }
    } catch (err) {
      error.value = `加载配置失败: ${err instanceof Error ? err.message : String(err)}`
      console.error('Failed to load API config:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 保存配置到 Electron store
  const saveApiConfig = async (newConfig: Partial<ApiConfig>): Promise<void> => {
    isLoading.value = true
    error.value = null
    
    try {
      const updatedConfig = { ...config.value, ...newConfig }
      await window.electronAPI?.saveApiConfig(updatedConfig)
      config.value = updatedConfig
    } catch (err) {
      error.value = `保存配置失败: ${err instanceof Error ? err.message : String(err)}`
      console.error('Failed to save API config:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 重置为默认配置
  const resetToDefault = async (): Promise<void> => {
    await saveApiConfig(defaultApiConfig)
  }

  return {
    config,
    apiBaseUrl,
    isLoading,
    error,
    loadApiConfig,
    saveApiConfig,
    resetToDefault
  }
})
