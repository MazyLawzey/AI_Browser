import { app, BrowserWindow } from 'electron'
import { createAgentWindow } from './electron/agent-window'
import * as dotenv from 'dotenv'

dotenv.config()

app.whenReady().then(() => {
  createAgentWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createAgentWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
