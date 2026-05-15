const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  agentRegisterWebview: (id) => {
    ipcRenderer.send('agent-register-webview', id)
  },
  agentStart: () => {
    ipcRenderer.send('agent-start')
  },
  agentStop: () => {
    ipcRenderer.send('agent-stop')
  },
  onAgentStatus: (callback) => {
    ipcRenderer.on('agent-status', (_event, data) => callback(data))
  },
})
