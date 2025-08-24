<!-- CustomDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :show-close="showClose"
    :custom-class="'custom-dialog'"
    :modal-class="'custom-mask'"
    :before-close="beforeClose"
    destroy-on-close
  >
    <slot></slot>
    
    <template #footer v-if="$slots.footer">
      <slot name="footer"></slot>
    </template>
  </el-dialog>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'CustomDialog',
  props: {
    modelValue: Boolean,
    title: {
      type: String,
      default: '对话框'
    },
    width: {
      type: String,
      default: '500px'
    },
    showClose: {
      type: Boolean,
      default: true
    },
    closeOnClickModal: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const visible = ref(props.modelValue)

    watch(() => props.modelValue, (newVal) => {
      visible.value = newVal
    })

    watch(visible, (newVal) => {
      emit('update:modelValue', newVal)
    })

    const beforeClose = (done) => {
      done()
    }

    return {
      visible,
      beforeClose
    }
  }
}
</script>

<style scoped>
/* 移除Element Plus默认动画 */
:deep(.el-dialog) {
  transition: none;
}

:deep(.el-overlay) {
  transition: none;
}
</style>

<style>
/* 全局自定义动画 */
.custom-dialog {
  transition: all 0.4s cubic-bezier(0.36, 0.66, 0.04, 1) !important;
}

.custom-mask {
  transition: opacity 0.4s ease !important;
}

/* 进入前状态 */
.custom-dialog-enter-from,
.custom-dialog-leave-to {
  opacity: 0;
  transform: translateY(-50px) scale(0.9) !important;
}

/* 进入后状态 */
.custom-dialog-enter-to,
.custom-dialog-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1) !important;
}

/* 遮罩层动画 */
.custom-mask-enter-from,
.custom-mask-leave-to {
  opacity: 0 !important;
}

.custom-mask-enter-to,
.custom-mask-leave-from {
  opacity: 0.5 !important;
}
</style>
