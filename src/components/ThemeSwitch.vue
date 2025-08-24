<template>
  <el-tooltip :content="isDark ? '切换到亮色主题' : '切换到暗黑主题'">
    <el-button 
      :icon="isDark ? 'Sunny' : 'Moon'" 
      circle 
      @click="toggleTheme"
      class="theme-switch"
    />
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDark = ref(false)

// 初始化主题
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark')
    isDark.value = true
  }
})

// 切换主题
const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}
</script>

<style scoped>
.theme-switch {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}
</style>
