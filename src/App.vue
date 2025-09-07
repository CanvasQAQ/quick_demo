<template>
  <el-config-provider :locale="locale" :size="config.size" :z-index="config.zIndex">
    <div class="app-container" :class="{ 'dark': isDark }">
      <!-- 顶部导航栏 -->
      <el-header class="app-header"  >
        <div class="header-left">
          <el-icon :size="24"><icon-puzzle /></el-icon>
          <span class="app-title">quick-demo</span>
        </div>
        
        <div class="titlebar-controls">
          <ThemeSwitch />
            <el-button 
              class="titlebar-button" 
              @click="minimizeWindow"
              link
            >
              <el-icon><Minus /></el-icon>
            </el-button>
            <el-button 
              class="titlebar-button" 
              @click="maximizeWindow"
              link
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
            <el-button 
              class="titlebar-button close" 
              @click="closeWindow"
              link
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
      </el-header>

      <el-container class="main-container">
        <!-- 主侧边栏 -->
        <el-aside 
          v-show="1" 
          width="64px"
        >

            <el-menu
              :default-active="activeMenu"
              class="sidebar-menu"
              :collapse = true
              router
            >
              <el-menu-item class="menuitem_icon" index="1">
                <el-icon :size="24"><icon-cross-ring-two /></el-icon>
                <template #title>Home</template>
              </el-menu-item>
              <el-menu-item class="menuitem_icon" index="2">
                <el-icon :size="24"><icon-system /></el-icon>
                <template #title>Base Component</template>
              </el-menu-item>
              
              <el-menu-item class="menuitem_icon" index="3">
                <el-icon :size="24"><icon-pineapple /></el-icon>
                <template #title>Pinia</template>
              </el-menu-item>
              <el-menu-item class="menuitem_icon" index="4">
                <el-icon :size="24"><icon-setting /></el-icon>
                <template #title>Setting</template>
              </el-menu-item>
              <el-menu-item class="menuitem_icon" index="5">
                <el-icon :size="24"><icon-dislike /></el-icon>
                <template #title>Fast API</template>
                </el-menu-item>
              <el-menu-item class="menuitem_icon" index="6">
                <el-icon :size="24"><icon-like /></el-icon>
                <template #title>SSH Tunnel</template>
              </el-menu-item>
              <!-- <el-menu-item class="menuitem_icon" index="7">
                <el-icon :size="24"><icon-api /></el-icon>
                <template #title>API Test</template>
              </el-menu-item> -->
            </el-menu>
        </el-aside>
        <el-aside 
          v-show="showRightSidebar" 
          width="140px"
        >
          <el-menu
            :default-active="activeRightMenu"
            class="sidebar-menu"
          >
            <el-menu-item index="1">
              <template #title>test1</template>
            </el-menu-item>
            <el-menu-item index="2">
              <template #title>test2</template>
            </el-menu-item>
            <el-menu-item index="3">
              <template #title>test3</template>
            </el-menu-item>
            <el-menu-item index="4">
              <template #title>test4</template>
            </el-menu-item>
            <el-menu-item index="5">
              <template #title>test5</template>
            </el-menu-item>
          </el-menu>
        </el-aside>
        <!-- 主内容区域 -->
        <el-main class="app-main">
          
          <router-view v-slot="{ Component }">
            <keep-alive > <component :is="Component" /></keep-alive>
          </router-view>
        </el-main>

        <!-- 右侧边栏 -->
        
      </el-container>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useDark } from '@vueuse/core'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import ThemeSwitch from './components/ThemeSwitch2.vue'
// console.log(window)

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
  }
}
const isElectron = ref(false)
onMounted(() => {
  // console.log('=== Electron Debug Info ===')
  // console.log('window.electronAPI:', window.electronAPI)
  // console.log('typeof window:', typeof window)
  // console.log('window object keys:', Object.keys(window))
  
  // if (window.electronAPI) {
  //   console.log('Electron API methods:', Object.keys(window.electronAPI))
  // }
  isElectron.value = typeof window !== 'undefined' && !!window.electronAPI
  // console.log('Is Electron:', isElectron.value)
})


// 窗口控制函数
const minimizeWindow = () => {
  if (isElectron.value) {
    window.electronAPI?.minimize()
  }
}

const maximizeWindow = () => {
  if (isElectron.value) {
    window.electronAPI?.maximize()
  }
}

const closeWindow = () => {
  if (isElectron.value) {
    window.electronAPI?.close()
  }
}

// 主题相关
const isDark = useDark()
// const toggleDark = useToggle(isDark)

// 国际化配置
const locale = zhCn
const config = reactive({
  size: 'default' as const,
  zIndex: 3000
})

// 侧边栏控制
const showRightSidebar = ref(false)


// 菜单激活状态
const activeMenu = ref('1')
const activeRightMenu = ref('1')



</script>

<style lang="scss">
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
body {
  margin: 0;
  padding: 0;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 0px !important;
  padding-left: 20px !important;
  background-color: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-light);
  max-height: 40px;
  margin: 0;
  -webkit-app-region: drag;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .app-title {
    font-size: 16px;
    font-weight: 500;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    -webkit-app-region: no-drag;
  }
}

.main-container {
  flex: 1;
  overflow: hidden;
}

.sidebar {
  background-color: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  position: relative;
  height: 100%;
  
  .sidebar-content {
    flex: 1;
    overflow: auto;
    margin: 0;
  }
}

.app-main {
  padding: 0;
  background-color: var(--el-bg-color);
}

.sidebar-menu {
  border-right: 1px var(--el-border-color-lig);
  height: 100%;
  .el-menu-item {
    height: 36px;
    line-height: 36px;
  }
  .menuitem_icon {
  min-height: 64px;
  line-height: 64px;
  }

}

// 暗色主题适配


.titlebar-controls {
  -webkit-app-region: no-drag; /* 按钮区域不拖拽 */
}

.titlebar-button {
  background: none;
  border: none;
  color: white;
  width: 40px;
  min-height: 40px;
  cursor: pointer;
  padding: 0 !important;
  margin: 0 !important;
}

.titlebar-button:hover {
  background-color: var(--el-self-hover) !important;
}

.titlebar-button.close:hover {
  background-color: #aa2732 !important;
}



// 菜单项选中时左侧显示竖线
.el-menu-item {
  position: relative;
  
  // 选中状态的竖线
  &.is-active {
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background-color: var(--el-color-primary);
      border-radius: 0 2px 2px 0;
    }
  }
  
  // 悬停状态的竖线（可选）
  &:hover:not(.is-active) {
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background-color: var(--el-color-primary-light-3);
      border-radius: 0 2px 2px 0;
    }
  }
}

// 子菜单项同样适用
.el-sub-menu {
  .el-menu-item {
    position: relative;
    
    &.is-active {
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background-color: var(--el-color-primary);
        border-radius: 0 2px 2px 0;
      }
    }
  }
}

// 确保文字不会被竖线遮挡
.el-menu-item,
.el-sub-menu__title {
  padding-left: 20px !important;
}

// 如果是嵌套的子菜单，增加左侧间距
.el-menu--inline {
  .el-menu-item {
    padding-left: 40px !important;
  }
}

</style>
