<template>
  <div>
    <h3>示例1：完整输入模式</h3>
    <ApiTester 
      :show-input="true"
      :input-disabled="false"
      @test-start="handleTestStart"
      @test-complete="handleTestComplete"
      @test-error="handleTestError"
    />

    <h3>示例2：预设按钮模式</h3>
    <ApiTester 
      :show-input="false"
      :base-url="baseUrl"
      :preset-buttons="presetButtons"
      @test-complete="handleTestComplete"
    />

    <h3>示例3：混合模式</h3>
    <ApiTester 
      :show-input="true"
      :input-disabled="false"
      :base-url="baseUrl"
      :preset-buttons="presetButtons"
      @test-complete="handleTestComplete"
    />
  </div>
</template>

<script setup lang="ts">
import ApiTester from '@/components/ApiTester.vue'
import { ref } from 'vue'

const baseUrl = ref('http://localhost:5000')

const presetButtons = ref([
  { label: '测试用户API', endpoint: '/api/users' },
  { label: '测试订单API', endpoint: '/api/orders' },
  { label: '测试商品API', endpoint: '/api/products' },
  { label: '外部API', endpoint: 'https://jsonplaceholder.typicode.com/posts' }
])

const handleTestStart = (url: string) => {
  console.log('测试开始:', url)
}

const handleTestComplete = (result: any) => {
  console.log('测试结果:', result)
}

const handleTestError = (error: Error) => {
  console.error('测试错误:', error)
}
</script>
