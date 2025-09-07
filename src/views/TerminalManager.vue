<template>
  <div class="terminal-manager">
    <h2>Shell Terminal Manager</h2>
    <Terminal />
  </div>
</template>

<script setup lang="ts">
import Terminal from '../components/Terminal/Terminal.vue';
</script>

<style scoped>
.terminal-manager {
  padding: 20px;
}
</style>
