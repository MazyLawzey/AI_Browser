import { contextBridge, ipcRenderer } from 'electron'
import { IpcEvents } from '../types'

/**
 * Tooltip window preload script
 * Exposes tooltip-specific IPC API
 */

const TooltipAPI = {
  onShow: (cb: (data: { text: string }) => void) => {
    ipcRenderer.on(IpcEvents.TOOLTIP_SHOW, (_e, data) => cb(data))
  },

  onChunk: (cb: (chunk: string) => void) => {
    ipcRenderer.on(IpcEvents.TOOLTIP_AI_CHUNK, (_e, chunk) => cb(chunk))
  },

  onDone: (cb: () => void) => {
    ipcRenderer.on(IpcEvents.TOOLTIP_AI_DONE, () => cb())
  },

  onError: (cb: () => void) => {
    ipcRenderer.on(IpcEvents.TOOLTIP_AI_ERROR, () => cb())
  },

  askAI: (text: string) => {
    ipcRenderer.send(IpcEvents.TOOLTIP_ASK_AI, text)
  },
} as const

contextBridge.exposeInMainWorld('tooltip', TooltipAPI)

declare global {
  interface Window {
    tooltip: typeof TooltipAPI
  }
}
