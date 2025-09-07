// src/renderer/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SwitchDemo from '../views/SwitchDemo.vue'
import PiniaDemo from '../views/PiniaDemo.vue'
import SettingDemo from '../views/SettingDemo.vue'
import FlaskApiDemo from '../views/FlaskApiDemo.vue'
import SSHConfigDemo from '../views/SSHConfigDemo.vue'
import ApiTestDemo from '../views/ApiTestDemo.vue'

const routes = [
  {
    path: '/',
    redirect: '/1',
  },
  {
    path: '/1',
    name: 'Home',
    component: Home
  },
    {
    path: '/2',
    name: 'SwitchDemo',
    component: SwitchDemo
  },
   {
    path: '/3',
    name: 'PiniaDemo',
    component: PiniaDemo
  },
  {
    path: '/4',
    name: 'SettingDemo',
    component: SettingDemo
  },
    {
    path: '/5',
    name: 'FlaskApiDemo',
    component: FlaskApiDemo
  },
      {
    path: '/6',
    name: 'SSHConfigDemo',
    component: SSHConfigDemo
  },
  //     {
  //   path: '/7',
  //   name: 'APITestDemo',
  //   component: ApiTestDemo
  // }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
