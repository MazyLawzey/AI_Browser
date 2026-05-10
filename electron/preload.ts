/// <reference lib="dom" />
import { contextBridge, ipcRenderer } from 'electron'

// Expose IPC to window for tab navigation
contextBridge.exposeInMainWorld('electron', {
  onPageNavigate: (callback: (direction: 'next' | 'prev') => void) => {
    ipcRenderer.on('page-navigate', (_event, direction) => callback(direction))
  },
})

// Text selection handling
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

// Touchpad and mouse wheel navigation
let lastWheelTime = 0
const WHEEL_DEBOUNCE_MS = 300

window.addEventListener('wheel', (event: WheelEvent) => {
  const now = Date.now()
  if (now - lastWheelTime < WHEEL_DEBOUNCE_MS) return
  lastWheelTime = now

  // Check if scrolling with modifier key (Cmd on macOS, Ctrl on Windows/Linux)
  const isModifierPressed = event.metaKey || event.ctrlKey

  if (isModifierPressed) {
    event.preventDefault()
    
    // Negative deltaY = scroll up (go to previous page)
    // Positive deltaY = scroll down (go to next page)
    if (event.deltaY < -50) {
      ipcRenderer.send('navigate-page', 'prev')
    } else if (event.deltaY > 50) {
      ipcRenderer.send('navigate-page', 'next')
    }
  }
}, { passive: false })

// macOS trackpad gesture support (swipe left/right)
// @ts-ignore - webkit event
window.addEventListener('gesturechange', (event: any) => {
  const now = Date.now()
  if (now - lastWheelTime < WHEEL_DEBOUNCE_MS) return
  lastWheelTime = now

  // Negative scale = pinch in (not used here)
  // Positive scale = pinch out (not used here)
  // We use rotation for swipe: negative = swipe left, positive = swipe right
  if (Math.abs(event.rotation) > 10) {
    if (event.rotation < 0) {
      ipcRenderer.send('navigate-page', 'next')
    } else {
      ipcRenderer.send('navigate-page', 'prev')
    }
  }
}, { passive: false })