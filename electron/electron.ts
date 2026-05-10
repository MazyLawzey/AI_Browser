import { BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { generateResponseStream } from '../ai/ai'

let mainWin: BrowserWindow | null = null
let tooltipWin: BrowserWindow | null = null

export const createWindow = (): void => {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  })

  const startURL = process.env.START_URL || `file://${path.join(__dirname, '../index.html')}`
  mainWin.loadURL(startURL)
  
  setupTooltip()
  setupNavigation()
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