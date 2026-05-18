import { contextBridge, ipcRenderer } from 'electron'

const IPC = {
  AGENT_REGISTER_WEBVIEW: 'agent-register-webview',
  AGENT_START: 'agent-start',
  AGENT_STOP: 'agent-stop',
  AGENT_STATUS: 'agent-status',
  AGENT_GET_STATUS: 'agent-get-status',
} as const

const AgentAPI = {
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

contextBridge.exposeInMainWorld('agent', AgentAPI)

declare global {
  interface Window {
    agent: typeof AgentAPI
  }
}
