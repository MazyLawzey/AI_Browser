import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { logger } from './utils/logger'
import { getConfig } from './config'
import { MoodleAgent } from './ai/moodle-agent'
import { IpcEvents } from './types'
import { ipcMain, webContents } from 'electron'

logger.info('Starting agent process')

const config = getConfig(false, false)  // Validate nothing at startup
let agent: MoodleAgent | null = null

const getAgent = (): MoodleAgent => {
  if (!agent) {
    agent = new MoodleAgent()  // Create on demand
  }
  return agent
}

const createAgentWindow = (): BrowserWindow => {
  logger.info('Creating agent window')

  const win = new BrowserWindow({
    width: config.ui.mainWindowWidth,
    height: config.ui.mainWindowHeight,
    title: 'AI Agent — Moodle',
    webPreferences: {
      preload: path.join(__dirname, 'electron/agent-preload.js'),
      contextIsolation: true,
      webviewTag: true,
    },
  })

  win.loadFile(path.join(__dirname, 'electron/agent.html'))

  // Wire agent IPC
  ipcMain.on(IpcEvents.AGENT_REGISTER_WEBVIEW, (_event, webviewId: number) => {
    const wc = webContents.fromId(webviewId)
    if (wc) {
      getAgent().setWebContents(wc)
      logger.info('Agent webview registered')
    }
  })

  ipcMain.on(IpcEvents.AGENT_START, async () => {
    logger.info('Starting agent')
    const agentInstance = getAgent()
    agentInstance.onStatus((status, message) => {
      win.webContents.send(IpcEvents.AGENT_STATUS, { status, message })
    })
    await agentInstance.start()
  })

  ipcMain.on(IpcEvents.AGENT_STOP, () => {
    logger.info('Stopping agent')
    getAgent().stop()
  })

  win.on('closed', () => {
    if (agent) agent.stop()
  })

  return win
}

app.whenReady().then(() => {
  createAgentWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createAgentWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
