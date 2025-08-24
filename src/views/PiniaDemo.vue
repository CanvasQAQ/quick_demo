<!-- src/renderer/App.vue -->
<template>
  <div class="mb-4" >
    <h1 class="text-lg">🍍 Pinia 跨组件共享示例</h1>
    <div class="flex w-full gap-4">
    <el-card class="demo-card" header="展示组件1"><CounterDisplay /> </el-card>
    <el-card class="demo-card" header="展示组件2"><CounterDisplay /> </el-card>
    </div>
     <el-card class="w-full mt-4" header="控制组件"><CounterButtons /> </el-card>
  </div>
</template>

<script setup lang="ts">
import CounterDisplay from '../components/PiniaDemo/CounterDisplay.vue'
import CounterButtons from '../components/PiniaDemo/CounterButtons.vue'
</script>

<style scoped>
#app {
  font-family: Arial, sans-serif;
  text-align: center;
  padding: 20px;
  
}
.demo-card {
  margin-top: 20px;
  width: 50%;
  flex: 1 1 0% !important;
}
/* :deep(.demo-card .el-card__body) {
    flex:1;
} */
</style>
