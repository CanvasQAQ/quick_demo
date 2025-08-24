<!-- components/ThemeSwitch.vue -->
<template>
  <el-tooltip :content="isDark ? '切换到亮色主题' : '切换到暗黑主题'">
  <el-switch
    v-model="isDark"
    inline-prompt
    :active-icon="Moon"
    :inactive-icon="Sunny"
    @change="toggleDark"
  />
  </el-tooltip>
</template>

<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import { Moon, Sunny } from '@element-plus/icons-vue'

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>
