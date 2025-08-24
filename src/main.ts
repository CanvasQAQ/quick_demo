// src/renderer/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'


// if you just want to import css
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/element-theme.scss'

import {install} from '@icon-park/vue-next/es/all';
import '@icon-park/vue-next/styles/index.css';
import { useApiConfigStore } from './stores/apiConfigStore'


const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
install(app);



app.use(createPinia())
app.use(router)
app.use(ElementPlus)
router.push('/')

// app.mount('#app')

const apiConfigStore = useApiConfigStore()
apiConfigStore.loadApiConfig().then(() => {
  app.mount('#app')
})