import { contextBridge, ipcRenderer } from 'electron'
import { IpcEvents } from '../types'

/**
 * Agent window preload script
 * Exposes agent-specific IPC API
 */

const AgentAPI = {
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

contextBridge.exposeInMainWorld('agent', AgentAPI)

declare global {
  interface Window {
    agent: typeof AgentAPI
  }
}
