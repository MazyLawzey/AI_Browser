/**
 * Agent window renderer script
 * Handles agent UI and controls
 */

let statusElement = null
let startBtn = null
let stopBtn = null
let webview = null

document.addEventListener('DOMContentLoaded', () => {
  statusElement = document.getElementById('status')
  startBtn = document.getElementById('startBtn')
  stopBtn = document.getElementById('stopBtn')
  webview = document.getElementById('moodleWebview')

  if (!statusElement || !startBtn || !stopBtn || !webview) {
    console.error('Required DOM elements not found')
    return
  }

  // Register webview when ready
  webview.addEventListener('dom-ready', () => {
    window.agent.agentRegisterWebview(webview.getWebContents().id)
  })

  // Setup button handlers
  startBtn.addEventListener('click', () => {
    startBtn.disabled = true
    stopBtn.disabled = false
    window.agent.agentStart()
  })

  stopBtn.addEventListener('click', () => {
    startBtn.disabled = false
    stopBtn.disabled = true
    window.agent.agentStop()
  })

  // Listen for agent status updates
  window.agent.onAgentStatus(({ status, message }) => {
    updateStatus(status, message)

    // Update button states based on status
    if (status === 'running') {
      startBtn.disabled = true
      stopBtn.disabled = false
    } else {
      startBtn.disabled = false
      stopBtn.disabled = true
    }
  })

  // Initial status query
  window.agent.agentGetStatus().then((status) => {
    updateStatus(status, 'Ready')
  })
})

function updateStatus(status, message) {
  if (!statusElement) return

  const statusText = statusElement.querySelector('.status-text')
  if (statusText) {
    statusText.textContent = message
  }

  // Update visual indicator
  statusElement.className = `status ${status}`
}
