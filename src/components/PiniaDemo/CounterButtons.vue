<!-- src/renderer/components/CounterButtons.vue -->
<template>
  <div class="counter-buttons">
    <el-button @click="increment"> <icon-add  class = "mr-4"/> 增加 </el-button>
    <el-button @click="decrement"> <icon-reduce class = "mr-4"/>减少 </el-button>
    <el-button @click="toggleTheme"> <icon-switch-themes class = "mr-4"/>切换主题 </el-button>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../../stores'

const store = useAppStore()
const { increment, decrement, toggleTheme } = store
</script>

<style scoped>
.counter-buttons button {
  margin: 5px;
  padding: 8px 16px;
  font-size: 16px;
}
</style>
