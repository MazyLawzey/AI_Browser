import { WebContents } from 'electron'
import { AgentStatus, StatusCallback } from '../types'

/**
 * Service interfaces for dependency injection
 */

export interface ILogger {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, error?: Error | unknown): void
}

export interface IConfig {
  moodle: {
    url: string
    username: string
    password: string
  }
  ollama: {
    model: string
    agentModel: string
  }
  ui: {
    tooltipWidth: number
    tooltipHeight: number
    mainWindowWidth: number
    mainWindowHeight: number
  }
}

export interface IWebViewExecutor {
  exec<T>(code: string): Promise<T | null>
  waitForPageLoad(maxWait?: number): Promise<boolean>
  click(selector: string): Promise<void>
  setInputValue(selector: string, value: string): Promise<void>
  getText(selector: string): Promise<string | null>
  elementExists(selector: string): Promise<boolean>
}

export interface IAIService {
  generateResponseStream(prompt: string): AsyncGenerator<string>
  generateResponse(prompt: string): Promise<string>
}

export interface IProgressRepository {
  getTotalQuestions(): number
  getAnsweredCount(): number
  getProgress(): number
  incrementAnswered(): void
  setTotal(total: number): void
  reset(): void
}

export interface ILoginHandler {
  login(baseUrl: string): Promise<void>
  isLoggedIn(): Promise<boolean>
}

export interface IQuizHandler {
  navigateToQuiz(baseUrl: string): Promise<void>
  startAttempt(): Promise<void>
  getQuestions(): Promise<any[]>
  answerQuestion(question: any): Promise<void>
  submitQuiz(): Promise<void>
}

export interface IEventBus {
  subscribe(event: string, handler: (data?: any) => void): () => void
  publish(event: string, data?: any): void
  unsubscribeAll(): void
}

export interface IAgent {
  setWebContents(wc: WebContents): void
  onStatus(cb: StatusCallback): void
  getStatus(): AgentStatus
  start(): Promise<void>
  stop(): void
  dispose(): void
}

export interface IServiceFactory {
  createLoginHandler(executor: IWebViewExecutor): ILoginHandler
  createQuizHandler(executor: IWebViewExecutor, aiService: IAIService): IQuizHandler
  createProgressRepository(): IProgressRepository
}
