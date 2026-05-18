const preview = document.getElementById('preview')
const askBtn = document.getElementById('askBtn')
const resultDiv = document.getElementById('result')

let currentText = ''

window.tooltip.onShow(({ text }) => {
  currentText = text
  preview.textContent = text.length > 50 ? text.slice(0, 50) + '…' : text
  askBtn.disabled = false
  resultDiv.style.display = 'none'
  resultDiv.textContent = ''
})

window.tooltip.onChunk((chunk) => {
  resultDiv.style.display = 'block'
  resultDiv.textContent += chunk
})

window.tooltip.onDone(() => {
  askBtn.disabled = false
})

window.tooltip.onError(() => {
  resultDiv.style.display = 'block'
  resultDiv.innerHTML = '<span style="color: #f38ba8;">❌ Ошибка подключения к Ollama</span><br><span style="font-size: 11px; color: #a6adc8; margin-top: 4px; display: block;">Убедитесь что:<br>1. Ollama запущена (ollama serve)<br>2. Модель загружена (ollama pull gemma2)<br>3. OLLAMA_HOST и OLLAMA_MODEL указаны в .env</span>'
  askBtn.disabled = false
})

askBtn.addEventListener('click', () => {
  if (!currentText) return
  askBtn.disabled = true
  resultDiv.style.display = 'block'
  resultDiv.textContent = ''
  window.tooltip.askAI(currentText)
})
