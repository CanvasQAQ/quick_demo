<!-- src/renderer/components/CounterDisplay.vue -->
<template>
  <div class="counter-display" :class="theme">
    <h3>📈 当前计数：{{ count }}</h3>
    <p>🔢 双倍计数：{{ doubleCount }}</p>
    <p>🎨 当前主题：{{ theme }}</p>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores'

const store = useAppStore()
const { count, doubleCount, theme } = storeToRefs(store)
</script>

<style scoped>
.counter-display {
  padding: 20px;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 400px;
  transition: all 0.3s ease;
}

/* Light Theme */
.counter-display.light {
  background-color: #ffffff;
  color: #333333;
  border: 1px solid #ddd;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* Dark Theme */
.counter-display.dark {
  background-color: #2c2c2c;
  color: #f0f0f0;
  border: 1px solid #555;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
</style>
