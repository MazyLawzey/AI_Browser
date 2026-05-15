import { app, BrowserWindow } from 'electron'
import { logger } from '../utils/logger'
import { WindowManager } from './window-manager'

/**
 * Handles application lifecycle events
 */
export class AppHandler {
  private windowManager: WindowManager

  constructor() {
    this.windowManager = new WindowManager()
  }

  initialize(): void {
    logger.info('Initializing application')

    app.whenReady().then(() => {
      this.onReady()
    })

    app.on('activate', () => {
      this.onActivate()
    })

    app.on('window-all-closed', () => {
      this.onAllWindowsClosed()
    })
  }

  private onReady(): void {
    logger.info('App ready')
    this.windowManager.createMainWindow()
  }

  private onActivate(): void {
    logger.info('App activated')
    if (BrowserWindow.getAllWindows().length === 0) {
      this.windowManager.createMainWindow()
    }
  }

  private onAllWindowsClosed(): void {
    logger.info('All windows closed')
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }
}
