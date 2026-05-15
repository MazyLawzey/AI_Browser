import { BrowserWindow, ipcMain, webContents } from 'electron'
import * as path from 'path'
import { MoodleAgent } from '../ai/agent'

const agent = new MoodleAgent()

export const createAgentWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'AI Agent — Moodle',
    webPreferences: {
      preload: path.join(__dirname, 'agent-preload.js'),
      contextIsolation: true,
      webviewTag: true,
    },
  })

  win.loadFile(path.join(__dirname, 'agent.html'))

  // Wire agent IPC
  ipcMain.on('agent-register-webview', (_event, webviewId: number) => {
    const wc = webContents.fromId(webviewId)
    if (wc) {
      agent.setWebContents(wc)
    }
  })

  ipcMain.on('agent-start', () => {
    agent.onStatus((status, message) => {
      win.webContents.send('agent-status', { status, message })
    })
    agent.start()
  })

  ipcMain.on('agent-stop', () => {
    agent.stop()
  })

  win.on('closed', () => {
    agent.stop()
  })

  return win
}
