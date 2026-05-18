import { contextBridge, ipcRenderer } from 'electron'

const IPC = {
  TOOLTIP_SHOW: 'show',
  TOOLTIP_AI_CHUNK: 'ai-chunk',
  TOOLTIP_AI_DONE: 'ai-done',
  TOOLTIP_AI_ERROR: 'ai-error',
  TOOLTIP_ASK_AI: 'ask-ai',
} as const

const TooltipAPI = {
  onShow: (cb: (data: { text: string }) => void) => {
    ipcRenderer.on(IPC.TOOLTIP_SHOW, (_e, data) => cb(data))
  },
  onChunk: (cb: (chunk: string) => void) => {
    ipcRenderer.on(IPC.TOOLTIP_AI_CHUNK, (_e, chunk) => cb(chunk))
  },
  onDone: (cb: () => void) => {
    ipcRenderer.on(IPC.TOOLTIP_AI_DONE, () => cb())
  },
  onError: (cb: () => void) => {
    ipcRenderer.on(IPC.TOOLTIP_AI_ERROR, () => cb())
  },
  askAI: (text: string) => {
    ipcRenderer.send(IPC.TOOLTIP_ASK_AI, text)
  },
} as const

contextBridge.exposeInMainWorld('tooltip', TooltipAPI)

declare global {
  interface Window {
    tooltip: typeof TooltipAPI
  }
}
