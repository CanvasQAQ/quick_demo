<template>
  <div class="home">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>欢迎使用</span>
        </div>
      </template>
      <div class="card-content">
        <el-alert
          title="项目已成功创建!"
          type="success"
          description="这是一个基于 Electron + Vue 3 + TypeScript + Vite + Element Plus 的桌面应用模板"
          show-icon
          :closable="false"
        />
        <el-divider />
        <el-button type="primary" @click="handleClick">
          <el-icon><Plus /></el-icon>
          开始使用
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const handleClick = () => {
  ElMessage.success('欢迎使用 Electron + Vue 3!')
}
</script>

<style scoped>
.home {
  padding: 20px;
}

.box-card {
  max-width: 600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-content {
  text-align: center;
}
</style>
