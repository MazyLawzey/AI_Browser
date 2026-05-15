import { app, BrowserWindow } from 'electron'
import { logger } from './utils/logger'
import { getConfig } from './config'
import { IpcEvents } from './types'
import * as path from 'path'
import { ipcMain } from 'electron'

logger.info('Starting main process')

const config = getConfig()  // No validation needed for main app

let mainWindow: BrowserWindow | null = null
let tooltipWindow: BrowserWindow | null = null

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: config.ui.mainWindowWidth,
    height: config.ui.mainWindowHeight,
    webPreferences: {
      preload: path.join(__dirname, 'electron/preload.js'),
      contextIsolation: true,
      webviewTag: true,
    },
  })

  const startURL = process.env.START_URL || `file://${path.join(__dirname, 'index.html')}`
  mainWindow.loadURL(startURL)

  setupIPC()
}

const createTooltipWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: config.ui.tooltipWidth,
    height: config.ui.tooltipHeight,
    frame: true,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'electron/tooltip-preload.js'),
      contextIsolation: true,
    },
  })

  win.loadFile(path.join(__dirname, 'electron/tooltip.html'))
  win.on('closed', () => {
    tooltipWindow = null
  })
  return win
}

const setupIPC = (): void => {
  // Tooltip events
  ipcMain.on(IpcEvents.TEXT_SELECTED, (_event, { text, x, y }) => {
    if (!tooltipWindow) tooltipWindow = createTooltipWindow()

    const [winX, winY] = mainWindow!.getPosition()
    const tooltipHeight = tooltipWindow.getSize()[1]

    tooltipWindow.setPosition(
      Math.round(winX + x - config.ui.tooltipWidth / 2),
      Math.round(winY + y - tooltipHeight - 20)
    )

    tooltipWindow.webContents.send(IpcEvents.TOOLTIP_SHOW, { text })
    tooltipWindow.showInactive()
  })

  ipcMain.on(IpcEvents.TEXT_DESELECTED, () => {
    tooltipWindow?.hide()
  })

  ipcMain.on(IpcEvents.TOOLTIP_ASK_AI, async (_event, text: string) => {
    if (!tooltipWindow) return
    tooltipWindow.setSize(config.ui.tooltipWidth, 300)
    // AI handling would go here
  })

  // Navigation events
  ipcMain.on(IpcEvents.NAVIGATE_PAGE, (_event, direction: 'next' | 'prev') => {
    if (mainWindow) {
      mainWindow.webContents.send(IpcEvents.PAGE_NAVIGATE, direction)
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
