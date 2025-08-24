<!-- InstantDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :show-close="showClose"
    :close-on-click-modal="closeOnClickModal"
    :destroy-on-close="destroyOnClose"
    custom-class="instant-dialog"
    modal-class="instant-mask"
  >
    <slot></slot>
    
    <template #footer v-if="$slots.footer">
      <slot name="footer"></slot>
    </template>
  </el-dialog>
</template>

<script lang="ts">
import { ref, watch } from 'vue'

export default {
  name: 'InstantDialog',
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
    },
    destroyOnClose: {
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

    return {
      visible
    }
  }
}
</script>

<style scoped>
/* 使用scoped确保样式只影响当前组件 */
</style>


<style>
/* 只针对自定义对话框的样式 */
.instant-dialog,
.instant-dialog * {
  animation: none !important;
  transition: none !important;
  animation-duration: 0s !important;
  transition-duration: 2s !important;
  animation-delay: 0s !important;
  transition-delay: 0s !important;
}

.instant-mask {
  animation: none !important;
  transition: none !important;
  animation-duration: 0s !important;
  transition-duration: 0s !important;
}

/* 更具体的选择器，只影响自定义对话框 */
.el-dialog.instant-dialog,
.el-overlay .instant-mask {
  animation: none !important;
  transition: none !important;
}

/* 确保对话框内容也没有动画 */
.instant-dialog .el-dialog__header,
.instant-dialog .el-dialog__body,
.instant-dialog .el-dialog__footer {
  animation: none !important;
  transition: none !important;
}
</style>