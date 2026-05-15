import { BrowserWindow, ipcMain, webContents } from 'electron'
import * as path from 'path'
import { logger } from '../utils/logger'
import { getConfig } from '../config'
import { IpcEvents, WindowPosition, WindowSize } from '../types'
import { MoodleAgent } from '../ai/moodle-agent'

/**
 * Manages main application window
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private tooltipWindow: BrowserWindow | null = null
  private agent: MoodleAgent
  private config = getConfig()

  constructor() {
    this.agent = new MoodleAgent()
  }

  createMainWindow(): BrowserWindow {
    logger.info('Creating main window')

    this.mainWindow = new BrowserWindow({
      width: this.config.ui.mainWindowWidth,
      height: this.config.ui.mainWindowHeight,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        webviewTag: true,
      },
    })

    const startURL = process.env.START_URL || `file://${path.join(__dirname, '../index.html')}`
    this.mainWindow.loadURL(startURL)

    this.setupTooltipHandlers()
    this.setupNavigationHandlers()
    this.setupAgentHandlers()

    return this.mainWindow
  }

  private createTooltipWindow(): BrowserWindow {
    logger.info('Creating tooltip window')

    const win = new BrowserWindow({
      width: this.config.ui.tooltipWidth,
      height: this.config.ui.tooltipHeight,
      frame: true,
      alwaysOnTop: true,
      resizable: true,
      webPreferences: {
        preload: path.join(__dirname, 'tooltip-preload.js'),
        contextIsolation: true,
      },
    })

    win.loadFile(path.join(__dirname, 'tooltip.html'))
    win.on('closed', () => {
      this.tooltipWindow = null
    })

    return win
  }

  private setupTooltipHandlers(): void {
    ipcMain.on(IpcEvents.TEXT_SELECTED, (_event, payload) => {
      this.handleTextSelected(payload)
    })

    ipcMain.on(IpcEvents.TEXT_DESELECTED, () => {
      this.handleTextDeselected()
    })

    ipcMain.on(IpcEvents.TOOLTIP_ASK_AI, async (_event, text: string) => {
      await this.handleAskAI(text)
    })
  }

  private setupNavigationHandlers(): void {
    ipcMain.on(IpcEvents.NAVIGATE_PAGE, (_event, direction: 'next' | 'prev') => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IpcEvents.PAGE_NAVIGATE, direction)
      }
    })
  }

  private setupAgentHandlers(): void {
    ipcMain.on(IpcEvents.AGENT_REGISTER_WEBVIEW, (_event, webviewId: number) => {
      const wc = webContents.fromId(webviewId)
      if (wc) {
        this.agent.setWebContents(wc)
        logger.info('Agent webview registered', { webviewId })
      }
    })

    ipcMain.on(IpcEvents.AGENT_START, async () => {
      logger.info('Agent start requested')
      this.agent.onStatus((status, message) => {
        this.mainWindow?.webContents.send(IpcEvents.AGENT_STATUS, { status, message })
      })
      await this.agent.start()
    })

    ipcMain.on(IpcEvents.AGENT_STOP, () => {
      logger.info('Agent stop requested')
      this.agent.stop()
    })

    ipcMain.handle(IpcEvents.AGENT_GET_STATUS, () => {
      return this.agent.getStatus()
    })
  }

  private handleTextSelected(payload: { text: string; x: number; y: number }): void {
    if (!this.tooltipWindow) {
      this.tooltipWindow = this.createTooltipWindow()
    }

    const position = this.calculateTooltipPosition(payload.x, payload.y)
    this.tooltipWindow.setPosition(position.x, position.y)

    this.tooltipWindow.webContents.send(IpcEvents.TOOLTIP_SHOW, { text: payload.text })
    this.tooltipWindow.showInactive()

    logger.debug('Tooltip shown', { text: payload.text.substring(0, 30) })
  }

  private handleTextDeselected(): void {
    this.tooltipWindow?.hide()
  }

  private async handleAskAI(text: string): Promise<void> {
    if (!this.tooltipWindow) return

    this.tooltipWindow.setSize(this.config.ui.tooltipWidth, 300)

    try {
      logger.debug('Processing AI request', { textLength: text.length })
      // AI response handling would go here
      // This is a placeholder - actual implementation would use aiService
    } catch (error) {
      logger.error('Error in AI request', error)
      this.tooltipWindow?.webContents.send(IpcEvents.TOOLTIP_AI_ERROR)
    }
  }

  private calculateTooltipPosition(x: number, y: number): WindowPosition {
    if (!this.mainWindow) return { x, y }

    const [winX, winY] = this.mainWindow.getPosition()
    const tooltipHeight = this.tooltipWindow?.getSize()[1] ?? this.config.ui.tooltipHeight

    return {
      x: Math.round(winX + x - this.config.ui.tooltipWidth / 2),
      y: Math.round(winY + y - tooltipHeight - 20),
    }
  }

  getAgent(): MoodleAgent {
    return this.agent
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }
}
