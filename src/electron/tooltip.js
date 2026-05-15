/**
 * Tooltip renderer script
 * Handles UI interactions for the tooltip window
 */

let currentText = ''

const preview = document.getElementById('preview')
const askBtn = document.getElementById('askBtn')
const result = document.getElementById('result')

if (!preview || !askBtn || !result) {
  console.error('Required DOM elements not found')
}

window.tooltip.onShow(({ text }) => {
  currentText = text
  if (preview) preview.textContent = text
  result.style.display = 'none'
  result.textContent = ''
  askBtn.disabled = false
  askBtn.textContent = '✨ ask AI'
})

askBtn.onclick = () => {
  if (!currentText) return
  askBtn.disabled = true
  askBtn.textContent = '⏳ Thinking...'
  result.style.display = 'block'
  result.innerHTML = '<span class="cursor"></span>'
  window.tooltip.askAI(currentText)
}

window.tooltip.onChunk((chunk) => {
  const cursor = result.querySelector('.cursor')
  if (cursor) cursor.remove()
  result.insertAdjacentText('beforeend', chunk)
  result.insertAdjacentHTML('beforeend', '<span class="cursor"></span>')
  result.scrollTop = result.scrollHeight
})

window.tooltip.onDone(() => {
  const cursor = result.querySelector('.cursor')
  if (cursor) cursor.remove()
  askBtn.disabled = false
  askBtn.textContent = '✨ ask AI'
})

window.tooltip.onError(() => {
  result.textContent = '❌ Error getting AI response.'
  askBtn.disabled = false
  askBtn.textContent = '✨ ask AI'
})
