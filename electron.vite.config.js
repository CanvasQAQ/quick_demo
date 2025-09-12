// electron.vite.config.js
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: resolve(__dirname, 'dist-electron/main'),
      // 明确指定主进程入口文件
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: resolve(__dirname, 'dist-electron/preload'),
      // 明确指定预加载脚本入口文件
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname),
    plugins: [vue()], // 这里也需要添加 Vue 插件
    build: {
      outDir: resolve(__dirname, 'dist'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      },
      // 确保字体文件被复制到构建输出中
      assetsDir: 'assets'
    },
    base: './',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    // 确保字体文件被正确处理
    assetsInclude: ['**/*.ttf', '**/*.otf', '**/*.woff', '**/*.woff2']
  }
})
