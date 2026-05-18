/// <reference lib="dom" />
import { contextBridge, ipcRenderer } from 'electron'

// Inline IPC channels — import from types не работает в sandbox
const IPC = {
  PAGE_NAVIGATE: 'page-navigate',
  AGENT_REGISTER_WEBVIEW: 'agent-register-webview',
  AGENT_START: 'agent-start',
  AGENT_STOP: 'agent-stop',
  AGENT_STATUS: 'agent-status',
  AGENT_GET_STATUS: 'agent-get-status',
  TEXT_SELECTED: 'text-selected',
  TEXT_DESELECTED: 'text-deselected',
  NAVIGATE_PAGE: 'navigate-page',
} as const

const ElectronAPI = {
  onPageNavigate: (callback: (direction: 'next' | 'prev') => void) => {
    ipcRenderer.on(IPC.PAGE_NAVIGATE, (_event, direction) => callback(direction))
  },
  agentRegisterWebview: (id: number) => {
    ipcRenderer.send(IPC.AGENT_REGISTER_WEBVIEW, id)
  },
  agentStart: () => {
    ipcRenderer.send(IPC.AGENT_START)
  },
  agentStop: () => {
    ipcRenderer.send(IPC.AGENT_STOP)
  },
  onAgentStatus: (callback: (data: { status: string; message: string }) => void) => {
    ipcRenderer.on(IPC.AGENT_STATUS, (_event, data) => callback(data))
  },
  agentGetStatus: (): Promise<string> => {
    return ipcRenderer.invoke(IPC.AGENT_GET_STATUS)
  },
} as const

contextBridge.exposeInMainWorld('electron', ElectronAPI)

console.log('[preload] preload script loaded')

window.addEventListener('mouseup', () => {
  const selection = window.getSelection()?.toString().trim()

  if (selection) {
    console.log('[preload] text selected:', selection.substring(0, 30))
    const range = window.getSelection()?.getRangeAt(0)
    if (range) {
      const rect = range.getBoundingClientRect()
      ipcRenderer.send(IPC.TEXT_SELECTED, {
        text: selection,
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
    }
  } else {
    ipcRenderer.send(IPC.TEXT_DESELECTED)
  }
})

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
        ipcRenderer.send(IPC.NAVIGATE_PAGE, 'prev')
      } else if (event.deltaY > 50) {
        ipcRenderer.send(IPC.NAVIGATE_PAGE, 'next')
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
