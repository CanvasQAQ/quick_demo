<!-- App.vue -->
<template>
  <div >
    <!-- 使用主题切换组件 -->
    <!-- <ThemeSwitch /> -->
    
    <div class="my-4 py-4">
      <el-card>
        <el-button type="primary" @click="showInstantDialog = true">
          打开无动画对话框
        </el-button>
        
        <el-button @click="showNormalDialog = true">
          打开普通对话框
        </el-button>
      </el-card>

      <!-- 内容展示区域 -->
      <el-card class="demo-card mt-4">
        <template #header>
          <div class="card-header">
            <span>功能演示</span>
          </div>
        </template>
        <div class="card-content">
          <el-row :gutter="20">
            <el-col :span="12">
              <div>
                <h3>表单元素</h3>
                <el-input v-model="demoInput" placeholder="输入框示例"></el-input>
                <el-select v-model="demoSelect" placeholder="选择器示例" style="width: 100%; margin-top: 10px;">
                  <el-option label="选项一" value="1"></el-option>
                  <el-option label="选项二" value="2"></el-option>
                </el-select>
                
                <el-checkbox-group v-model="demoCheckbox" style="margin-top: 10px;">
                  <el-checkbox label="复选框1"></el-checkbox>
                  <el-checkbox label="复选框2"></el-checkbox>
                </el-checkbox-group>
              </div>
            </el-col>
            <el-col :span="12">
              <div>
                <h3>操作按钮</h3>
                <el-button type="success" style="width: 100%; margin-top: 10px;margin-left: 12px;">成功按钮</el-button>
                <el-button type="warning" style="width: 100%; margin-top: 10px;">警告按钮</el-button>
                <el-button type="danger" style="width: 100%; margin-top: 10px;">危险按钮</el-button>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>
      
      <!-- 无动画Dialog组件 -->
      <InstantDialog 
        v-model="showInstantDialog" 
        title="无动画对话框"
        width="500px"
      >
        <div class="dialog-content">
          <h3>这是一个完全没有动画的对话框</h3>
          <p>点击后立即显示，没有任何过渡效果。</p>
          <el-input 
            v-model="inputText" 
            placeholder="测试输入框"
            style="margin-top: 15px;"
          ></el-input>
        </div>
        
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showInstantDialog = false">取消</el-button>
            <el-button type="primary" @click="showInstantDialog = false">确认</el-button>
          </span>
        </template>
      </InstantDialog>
      
      <!-- 普通Element Dialog -->
      <el-dialog
        v-model="showNormalDialog"
        title="普通对话框"
        width="500px"
      >
        <div class="dialog-content">
          <h3>这是普通的Element对话框</h3>
          <p>有默认的动画效果。</p>
        </div>
        
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showNormalDialog = false">取消</el-button>
            <el-button type="primary" @click="showNormalDialog = false">确认</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent } from 'vue'
import InstantDialog from '../components/InstantDialog.vue'
import ThemeSwitch from '../components/ThemeSwitch.vue'

export default defineComponent({
  name: 'App',
  components: {
    InstantDialog,
    ThemeSwitch
  },
  setup() {
    const showInstantDialog = ref<boolean>(false)
    const showNormalDialog = ref<boolean>(false)
    const inputText = ref<string>('')
    const demoInput = ref<string>('')
    const demoSelect = ref<string>('')
    const demoCheckbox = ref<string[]>([])

    return {
      showInstantDialog,
      showNormalDialog,
      inputText,
      demoInput,
      demoSelect,
      demoCheckbox
    }
  }
})
</script>

<style scoped>
.demo-card {
  margin-top: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: bold;
}

.card-content {
  padding: 15px;
}

.dialog-content {
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
