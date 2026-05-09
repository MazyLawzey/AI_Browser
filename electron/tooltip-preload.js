const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tooltip', {
  onShow: (cb) =>
    ipcRenderer.on('show', (_e, data) => cb(data)),

  onChunk: (cb) =>
    ipcRenderer.on('ai-chunk', (_e, chunk) => cb(chunk)),

  onDone: (cb) =>
    ipcRenderer.on('ai-done', () => cb()),

  onError: (cb) =>
    ipcRenderer.on('ai-error', () => cb()),

  askAI: (text) =>
    ipcRenderer.send('ask-ai', text),
})