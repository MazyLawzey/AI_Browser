import { BrowserWindow, ipcMain, webContents } from 'electron'
import * as path from 'path'
import { generateResponseStream } from '../ai/ai'
import { MoodleAgent } from '../ai/agent'

let mainWin: BrowserWindow | null = null
let tooltipWin: BrowserWindow | null = null
const moodleAgent = new MoodleAgent()

export const createWindow = (): void => {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      webviewTag: true,
    }
  })

  const startURL = process.env.START_URL?.trim()

  if (!startURL) {
    mainWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;background:#f5f5f5">
      <div style="text-align:center;max-width:500px;padding:40px">
        <h1 style="color:#e53935;font-size:28px;margin-bottom:16px">START_URL не указан</h1>
        <p style="color:#666;font-size:15px;line-height:1.6">Откройте <code style="background:#eee;padding:2px 6px;border-radius:4px">.env</code> и укажите сайт:</p>
        <pre style="background:#263238;color:#b2ccd6;padding:16px;border-radius:8px;text-align:left;font-size:13px;margin-top:12px">START_URL=https://example.com</pre>
      </div></body></html>
    `)}`)
    return
  }

  mainWin.loadURL(startURL)
  
  setupTooltip()
  setupNavigation()
  setupAgent()
}

const createTooltipWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: 340,
    height: 100,
    frame: true,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'tooltip-preload.js'),
      contextIsolation: true,
    }
  })

  win.loadFile(path.join(__dirname, 'tooltip.html'))
  win.on('closed', () => { tooltipWin = null })
  return win
}

const setupTooltip = (): void => {
    ipcMain.on('text-selected', (_event, { text, x, y }) => {
    if (!tooltipWin) tooltipWin = createTooltipWindow()

    const [winX, winY] = mainWin!.getPosition()
    const tooltipHeight = tooltipWin.getSize()[1]

    tooltipWin.setPosition(
        Math.round(winX + x - 170),
        Math.round(winY + y - tooltipHeight - 20),
    )

    tooltipWin.webContents.send('show', { text })
    tooltipWin.showInactive()
    })

  ipcMain.on('text-deselected', () => tooltipWin?.hide())

  ipcMain.on('ask-ai', async (_event, text: string) => {
    if (!tooltipWin) return

    tooltipWin.setSize(340, 300)

    try {
      for await (const chunk of generateResponseStream(text)) {
        if (!tooltipWin) break
        tooltipWin.webContents.send('ai-chunk', chunk)
      }
      tooltipWin?.webContents.send('ai-done')
    } catch (e) {
      tooltipWin?.webContents.send('ai-error')
    }
  })
}

const setupNavigation = (): void => {
  ipcMain.on('navigate-page', (_event, direction: 'next' | 'prev') => {
    if (!mainWin) return
    
    // Send navigation event to renderer process
    mainWin.webContents.send('page-navigate', direction)
  })
}

const setupAgent = (): void => {
  ipcMain.on('agent-register-webview', (_event, webviewId: number) => {
    const wc = webContents.fromId(webviewId)
    if (wc) moodleAgent.setWebContents(wc)
  })

  ipcMain.on('agent-start', () => {
    moodleAgent.onStatus((status, message) => {
      mainWin?.webContents.send('agent-status', { status, message })
    })
    moodleAgent.start()
  })

  ipcMain.on('agent-stop', () => {
    moodleAgent.stop()
  })

  ipcMain.handle('agent-get-status', () => {
    return moodleAgent.getStatus()
  })
}