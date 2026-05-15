import { WebContents } from 'electron'
import { IWebViewExecutor, ILoginHandler, IQuizHandler, IAIService, ILogger, IProgressRepository, IAgent } from '../core/interfaces'
import { AgentStatus, StatusCallback } from '../types'
import { WebViewExecutor } from '../utils/webview-executor'
import { logger } from '../utils/logger'
import { getConfig } from '../config'
import { eventBus, AppEvents } from '../events/event-bus'
import { LoginHandler } from '../handlers/login-handler'
import { QuizHandler } from '../handlers/quiz-handler'
import { ProgressRepository } from '../repositories/progress-repository'
import { AIService } from './ai-service'
import { MoodleError, ConfigurationError } from '../core/errors'

/**
 * Main Moodle Agent Orchestrator
 * Coordinates all agent operations with clean dependency injection
 */
export class MoodleAgent implements IAgent {
  // State
  private config: any = null
  private executor: IWebViewExecutor | null = null
  private status: AgentStatus = 'idle'
  private statusCallback: StatusCallback | null = null
  private abortController: AbortController | null = null

  // Services (dependency injected)
  private aiService: IAIService | null = null
  private progressRepo: IProgressRepository | null = null
  private loginHandler: ILoginHandler | null = null
  private quizHandler: IQuizHandler | null = null

  // Internal logger
  private logger: ILogger = logger

  // Event subscriptions for cleanup
  private eventSubscriptions: Array<() => void> = []

  constructor() {
    this.setupEventListeners()
  }

  /**
   * Setup event listeners for lifecycle events
   */
  private setupEventListeners(): void {
    const unsubscribeError = eventBus.subscribe(AppEvents.ERROR_OCCURRED, (data) => {
      this.logger.error('Event bus error', data)
      this.updateStatus('error', `Error: ${data?.context || 'Unknown'}`)
    })

    this.eventSubscriptions.push(unsubscribeError)
  }

  /**
   * Inject WebContents and initialize services
   */
  setWebContents(wc: WebContents): void {
    try {
      this.executor = new WebViewExecutor(wc)

      // Initialize services
      this.aiService = new AIService()
      this.progressRepo = new ProgressRepository()
      this.loginHandler = new LoginHandler(
        this.executor,
        this.logger,
        getConfig().moodle.url,
        getConfig().moodle.username,
        getConfig().moodle.password
      )
      this.quizHandler = new QuizHandler(this.executor, this.aiService, this.logger)

      this.logger.info('Agent services initialized')
    } catch (error) {
      this.logger.error('Error initializing agent services', error)
      throw error
    }
  }

  /**
   * Register status change callback
   */
  onStatus(cb: StatusCallback): void {
    this.statusCallback = cb
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.status
  }

  /**
   * Start the agent workflow
   */
  async start(): Promise<void> {
    // Guard against concurrent runs
    if (this.status === 'running') {
      this.logger.warn('Agent already running')
      return
    }

    // Validate configuration
    try {
      this.validateConfiguration()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.updateStatus('error', `Configuration error: ${errorMsg}`)
      this.logger.error('Configuration validation failed', error)
      return
    }

    // Abort controller for cancellation
    this.abortController = new AbortController()
    this.updateStatus('running', 'Запуск агента...')

    eventBus.publish(AppEvents.AGENT_STARTED)

    try {
      await this.runWorkflow()
      this.updateStatus('idle', 'Готово')
      eventBus.publish(AppEvents.AGENT_STOPPED)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.updateStatus('error', `Ошибка: ${message}`)
      this.logger.error('Agent workflow error', error)
      eventBus.publish(AppEvents.AGENT_ERROR, { error: message })
    }
  }

  /**
   * Stop the agent
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.updateStatus('stopped', 'Остановлено пользователем')
    this.logger.info('Agent stopped by user')
    eventBus.publish(AppEvents.AGENT_STOPPED)
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.eventSubscriptions.forEach((unsubscribe) => unsubscribe())
    this.eventSubscriptions = []
    this.abortController = null
    this.logger.info('Agent disposed')
  }

  /**
   * Validate agent setup
   */
  private validateConfiguration(): void {
    if (!this.config) {
      this.config = getConfig(true, false)
    }

    if (!this.executor || !this.loginHandler || !this.quizHandler || !this.progressRepo || !this.aiService) {
      throw new ConfigurationError('Agent services not properly initialized. Call setWebContents() first.')
    }
  }

  /**
   * Main agent workflow
   */
  private async runWorkflow(): Promise<void> {
    // Guard checks
    if (!this.abortController || !this.config || !this.loginHandler || !this.quizHandler || !this.progressRepo) {
      throw new MoodleError('Agent not properly initialized')
    }

    // Step 1: Login
    this.updateStatus('running', 'Загрузка страницы входа...')
    await this.checkAbort()
    await this.loginHandler.login(this.config.moodle.url)

    // Step 2: Navigate to quiz
    this.updateStatus('running', 'Поиск тестов...')
    await this.checkAbort()
    await this.quizHandler.navigateToQuiz(this.config.moodle.url)

    // Step 3: Start quiz attempt
    this.updateStatus('running', 'Начинаем попытку...')
    await this.checkAbort()
    await this.quizHandler.startAttempt()

    // Step 4: Load questions
    this.updateStatus('running', 'Загружаем вопросы...')
    await this.checkAbort()
    const questions = await this.quizHandler.getQuestions()
    this.progressRepo.setTotal(questions.length)

    // Step 5: Answer all questions
    for (const question of questions) {
      await this.checkAbort()

      const progress = this.progressRepo.getProgress()
      this.updateStatus('running', `Отвечаю на вопрос: ${question.text.substring(0, 50)}... (${progress}%)`)

      await this.quizHandler.answerQuestion(question)
      this.progressRepo.incrementAnswered()
    }

    // Step 6: Submit quiz
    this.updateStatus('running', 'Отправка ответов...')
    await this.checkAbort()
    await this.quizHandler.submitQuiz()

    this.logger.info('Quiz completed successfully')
  }

  /**
   * Check if abort was requested
   */
  private async checkAbort(): Promise<void> {
    if (this.abortController?.signal.aborted) {
      throw new Error('Agent workflow aborted')
    }
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(status: AgentStatus, message: string): void {
    this.status = status
    this.statusCallback?.(status, message)
    this.logger.debug('Agent status updated', { status, message })
    eventBus.publish(AppEvents.AGENT_STATUS_CHANGED, { status, message })
  }
}
