import { app, BrowserWindow } from 'electron'
import { logger } from './utils/logger'
import { getConfig } from './config'
import { IpcEvents } from './types'
import * as path from 'path'
import { ipcMain } from 'electron'
import { AIService } from './ai/ai-service'

logger.info('Starting main process')

const config = getConfig()  // No validation needed for main app
let aiService: AIService | null = null

try {
  aiService = new AIService()
} catch (e) {
  logger.error('AI Service failed to init', e)
}

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

  const startURL = process.env.START_URL?.trim()

  if (!startURL) {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;background:#f5f5f5">
      <div style="text-align:center;max-width:500px;padding:40px">
        <h1 style="color:#e53935;font-size:28px;margin-bottom:16px">START_URL не указан</h1>
        <p style="color:#666;font-size:15px;line-height:1.6">Откройте <code style="background:#eee;padding:2px 6px;border-radius:4px">.env</code> и укажите сайт:</p>
        <pre style="background:#263238;color:#b2ccd6;padding:16px;border-radius:8px;text-align:left;font-size:13px;margin-top:12px">START_URL=https://example.com</pre>
      </div></body></html>
    `)}`)
  } else {
    mainWindow.loadURL(startURL)
  }

  mainWindow.webContents.openDevTools()
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

    if (!aiService) {
      logger.error('AI Service not initialized - check Ollama connection and OLLAMA_MODEL env var')
      tooltipWindow?.webContents.send(IpcEvents.TOOLTIP_AI_ERROR)
      return
    }

    try {
      for await (const chunk of aiService.generateResponseStream(text)) {
        if (!tooltipWindow) break
        tooltipWindow.webContents.send(IpcEvents.TOOLTIP_AI_CHUNK, chunk)
      }
      tooltipWindow?.webContents.send(IpcEvents.TOOLTIP_AI_DONE)
    } catch (e) {
      logger.error('Error in AI response', e)
      tooltipWindow?.webContents.send(IpcEvents.TOOLTIP_AI_ERROR)
    }
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
