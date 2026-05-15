/// <reference lib="dom" />
import { contextBridge, ipcRenderer } from 'electron'
import { IpcEvents } from '../types'

/**
 * Preload script for main window
 * Exposes secure IPC API to renderer process
 */

const ElectronAPI = {
  // Navigation
  onPageNavigate: (callback: (direction: 'next' | 'prev') => void) => {
    ipcRenderer.on(IpcEvents.PAGE_NAVIGATE, (_event, direction) => callback(direction))
  },

  // Agent methods
  agentRegisterWebview: (id: number) => {
    ipcRenderer.send(IpcEvents.AGENT_REGISTER_WEBVIEW, id)
  },
  agentStart: () => {
    ipcRenderer.send(IpcEvents.AGENT_START)
  },
  agentStop: () => {
    ipcRenderer.send(IpcEvents.AGENT_STOP)
  },
  onAgentStatus: (callback: (data: { status: string; message: string }) => void) => {
    ipcRenderer.on(IpcEvents.AGENT_STATUS, (_event, data) => callback(data))
  },
  agentGetStatus: (): Promise<string> => {
    return ipcRenderer.invoke(IpcEvents.AGENT_GET_STATUS)
  },
} as const

contextBridge.exposeInMainWorld('electron', ElectronAPI)

/**
 * Text selection handling
 * Detects when user selects text and notifies main process
 */
window.addEventListener('mouseup', () => {
  const selection = window.getSelection()?.toString().trim()

  if (selection) {
    const range = window.getSelection()?.getRangeAt(0)
    if (range) {
      const rect = range.getBoundingClientRect()
      ipcRenderer.send(IpcEvents.TEXT_SELECTED, {
        text: selection,
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
    }
  } else {
    ipcRenderer.send(IpcEvents.TEXT_DESELECTED)
  }
})

/**
 * Navigation with mouse wheel
 * Cmd+Scroll (macOS) or Ctrl+Scroll (Windows/Linux) to navigate
 */
let lastWheelTime = 0
const WHEEL_DEBOUNCE_MS = 300

window.addEventListener(
  'wheel',
  (event: WheelEvent) => {
    const now = Date.now()
    if (now - lastWheelTime < WHEEL_DEBOUNCE_MS) return
    lastWheelTime = now

    const isModifierPressed = event.metaKey || event.ctrlKey

    if (isModifierPressed) {
      event.preventDefault()

      if (event.deltaY < -50) {
        ipcRenderer.send(IpcEvents.NAVIGATE_PAGE, 'prev')
      } else if (event.deltaY > 50) {
        ipcRenderer.send(IpcEvents.NAVIGATE_PAGE, 'next')
      }
    }
  },
  { passive: false }
)

declare global {
  interface Window {
    electron: typeof ElectronAPI
  }
}
