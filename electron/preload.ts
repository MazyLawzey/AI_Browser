/// <reference lib="dom" />
import { contextBridge, ipcRenderer } from 'electron'

window.addEventListener('mouseup', () => {
  const selection = window.getSelection()?.toString().trim()

  if (selection) {
    const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect()
    ipcRenderer.send('text-selected', {
      text: selection,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  } else {
    ipcRenderer.send('text-deselected')
  }
})