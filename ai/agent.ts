import { WebContents } from 'electron'
import { generateResponseStream } from './ai'

const MOODLE_URL = process.env.MOODLE_URL || ''
const MOODLE_USERNAME = process.env.MOODLE_USERNAME || ''
const MOODLE_PASSWORD = process.env.MOODLE_PASSWORD || ''
const AGENT_MODEL = process.env.AGENT_MODEL || process.env.OLLAMA_MODEL || ''

type AgentStatus = 'idle' | 'running' | 'stopped' | 'error'
type AgentCallback = (status: AgentStatus, message: string) => void

export class MoodleAgent {
  private wc: WebContents | null = null
  private status: AgentStatus = 'idle'
  private onStatusChange: AgentCallback | null = null
  private abortController: AbortController | null = null

  constructor() {}

  setWebContents(wc: WebContents) {
    this.wc = wc
  }

  onStatus(cb: AgentCallback) {
    this.onStatusChange = cb
  }

  private async waitForPage(maxWait = 15000): Promise<boolean> {
    const wc = this.wc
    if (!wc) return false

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), maxWait)
      const check = setInterval(() => {
        try {
          if (!wc.isLoading()) {
            clearTimeout(timeout)
            clearInterval(check)
            resolve(true)
          }
        } catch {
          clearTimeout(timeout)
          clearInterval(check)
          resolve(false)
        }
      }, 500)
    })
  }

  private async exec<T>(code: string): Promise<T | null> {
    const wc = this.wc
    if (!wc) return null
    try {
      return await wc.executeJavaScript(`(function() { ${code} })()`)
    } catch {
      return null
    }
  }

  private updateStatus(status: AgentStatus, message: string) {
    this.status = status
    this.onStatusChange?.(status, message)
  }

  async start() {
    if (this.status === 'running') return
    this.abortController = new AbortController()
    this.updateStatus('running', 'Запуск агента...')

    try {
      await this.login()
      if (this.abortController.signal.aborted) return

      await this.navigateToQuizzes()
      if (this.abortController.signal.aborted) return

      await this.solveQuiz()
      if (this.abortController.signal.aborted) return

      this.updateStatus('idle', 'Готово')
    } catch (e: any) {
      this.updateStatus('error', `Ошибка: ${e.message}`)
    }
  }

  stop() {
    this.abortController?.abort()
    this.updateStatus('stopped', 'Остановлено пользователем')
  }

  getStatus(): AgentStatus {
    return this.status
  }

  private async login() {
    const wc = this.wc
    if (!wc) throw new Error('Webview не найден')

    this.updateStatus('running', 'Загрузка страницы входа...')
    wc.loadURL(`${MOODLE_URL}/login/index.php`)
    await this.waitForPage()

    // Check if we need to login
    const hasLoginForm = await this.exec<boolean>(
      `return document.querySelector('input[name="username"]') !== null`
    )

    if (!hasLoginForm) {
      // Already logged in
      this.updateStatus('running', 'Уже авторизован')
      return
    }

    this.updateStatus('running', 'Авторизация...')
    await this.exec(`
      document.querySelector('input[name="username"]').value = ${JSON.stringify(MOODLE_USERNAME)};
      document.querySelector('input[name="password"]').value = ${JSON.stringify(MOODLE_PASSWORD)};
      document.querySelector('button[type="submit"], input[type="submit"]')?.click();
    `)

    await this.waitForPage()
    this.updateStatus('running', 'Авторизация выполнена')
  }

  private async navigateToQuizzes() {
    const wc = this.wc
    if (!wc) throw new Error('Webview не найден')

    this.updateStatus('running', 'Поиск тестов...')

    // Try to find quiz links on current page (dashboard/course page)
    const quizFound = await this.exec<boolean>(`
      const links = document.querySelectorAll('a[href*="quiz"], a[href*="mod/quiz"]');
      if (links.length > 0) {
        links[0].click();
        return true;
      }
      return false;
    `)

    if (!quizFound) {
      // Navigate to dashboard
      wc.loadURL(`${MOODLE_URL}/my/`)
      await this.waitForPage()

      // Try to find a course link
      await this.exec(`
        const courseLink = document.querySelector('a[href*="course/view"]');
        if (courseLink) courseLink.click();
      `)
      await this.waitForPage()

      // Look for quiz in the course
      await this.exec(`
        const quizLink = document.querySelector('a[href*="mod/quiz"]');
        if (quizLink) quizLink.click();
      `)
      await this.waitForPage()
    }

    this.updateStatus('running', 'Тест найден')
  }

  private async solveQuiz() {
    const wc = this.wc
    if (!wc) throw new Error('Webview не найден')

    // Check if there's an "Attempt quiz" button
    const hasAttemptBtn = await this.exec<boolean>(`
      const btn = document.querySelector('input[type="submit"][value*="Attempt"], a[href*="attempt.php"]');
      return btn !== null;
    `)

    if (hasAttemptBtn) {
      this.updateStatus('running', 'Начинаем попытку...')
      await this.exec(`
        const btn = document.querySelector('input[type="submit"][value*="Attempt"], a[href*="attempt.php"]');
        if (btn) btn.click();
      `)
      await this.waitForPage()
    }

    // Check if we're on the quiz page (has questions)
    const hasQuestions = await this.exec<boolean>(`
      return document.querySelector('.que, .qtext, div[id*="question"]') !== null;
    `)

    if (!hasQuestions) {
      this.updateStatus('error', 'Не найдены вопросы на странице')
      return
    }

    // Answer questions
    this.updateStatus('running', 'Решаем тест...')

    // Get all questions
    const questions = await this.exec<Array<{ id: string; text: string; type: string }>>(`
      const questions = [];
      document.querySelectorAll('.que').forEach((q, i) => {
        const text = q.querySelector('.qtext')?.textContent?.trim() || 'No text';
        const id = q.id || 'q-' + i;
        let type = 'unknown';
        if (q.classList.contains('multichoice')) type = 'multichoice';
        else if (q.classList.contains('truefalse')) type = 'truefalse';
        else if (q.classList.contains('shortanswer')) type = 'shortanswer';
        else if (q.classList.contains('match')) type = 'match';
        questions.push({ id, text, type });
      });
      return questions;
    `)

    if (!questions || questions.length === 0) {
      this.updateStatus('error', 'Не удалось прочитать вопросы')
      return
    }

    for (const q of questions) {
      if (this.abortController?.signal.aborted) return
      await this.answerQuestion(q)
    }

    // Submit the quiz
    this.updateStatus('running', 'Отправка ответов...')
    await this.exec(`
      const submitBtn = document.querySelector('input[type="submit"][value*="Submit"], button[type="submit"][class*="submit"]');
      if (submitBtn) {
        submitBtn.click();
      } else {
        // Try finish attempt button
        const finishBtn = document.querySelector('input[type="submit"][value*="Finish"], a[href*="closeattempt"]');
        if (finishBtn) finishBtn.click();
      }
    `)

    await this.waitForPage()

    // Confirm submission
    await this.exec(`
      const confirmBtn = document.querySelector('input[type="submit"][value*="Submit"], button[class*="submit"]');
      if (confirmBtn) confirmBtn.click();
    `)

    this.updateStatus('running', 'Тест завершён!')
  }

  private async answerQuestion(q: { id: string; text: string; type: string }) {
    this.updateStatus('running', `Отвечаю на вопрос: ${q.text.substring(0, 50)}...`)

    const prompt = `Вопрос типа "${q.type}" из теста Moodle: "${q.text}". Дай только ответ, без объяснений.`

    let answer = ''
    try {
      for await (const chunk of generateResponseStream(prompt)) {
        answer += chunk
      }
    } catch {
      answer = 'не знаю'
    }

    // Fill the answer in the appropriate input
    const escapedAnswer = JSON.stringify(answer.trim())

    switch (q.type) {
      case 'multichoice':
        await this.exec(`
          const questionEl = document.getElementById(${JSON.stringify(q.id)});
          if (!questionEl) return;
          const options = questionEl.querySelectorAll('input[type="radio"], input[type="checkbox"]');
          const labels = questionEl.querySelectorAll('label');
          let bestIdx = -1;
          labels.forEach((l, i) => {
            const txt = l.textContent?.toLowerCase() || '';
            const ans = ${escapedAnswer}.toLowerCase();
            if (txt.includes(ans) || ans.includes(txt)) bestIdx = i;
          });
          if (bestIdx >= 0 && options[bestIdx]) options[bestIdx].click();
        `)
        break

      case 'truefalse':
        await this.exec(`
          const questionEl = document.getElementById(${JSON.stringify(q.id)});
          if (!questionEl) return;
          const radios = questionEl.querySelectorAll('input[type="radio"]');
          const val = ${escapedAnswer}.toLowerCase();
          if (val.includes('true') || val.includes('верно') || val.includes('прав')) {
            radios[0]?.click();
          } else {
            radios[1]?.click();
          }
        `)
        break

      case 'shortanswer':
      default:
        await this.exec(`
          const questionEl = document.getElementById(${JSON.stringify(q.id)});
          if (!questionEl) return;
          const input = questionEl.querySelector('input[type="text"], textarea');
          if (input) {
            input.value = ${escapedAnswer};
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `)
        break
    }
  }
}
