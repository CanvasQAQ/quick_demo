// build/vite.electron.ts
import type { Plugin } from 'vite'
import { spawn } from 'child_process'
import fs from 'fs'

export function electron(): Plugin {
  return {
    name: 'vite-plugin-electron',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const addressInfo = server.httpServer?.address()
        if (typeof addressInfo === 'object' && addressInfo) {
          const { port } = addressInfo
          process.env.VITE_DEV_SERVER_URL = `http://localhost:${port}`
          
          // 启动Electron
          spawn('npm', ['run', 'dev:electron'], {
            stdio: 'inherit',
            shell: true
          })
        }
      })
    }
  }
}
