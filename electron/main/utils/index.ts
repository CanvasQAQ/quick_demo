// src/main/utils.ts
import { app } from 'electron'

export function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged
}

export function getAppVersion(): string {
  return app.getVersion()
}

export function getPlatform(): string {
  return process.platform
}
