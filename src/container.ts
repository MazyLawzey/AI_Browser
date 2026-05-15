import { IServiceFactory, IWebViewExecutor, ILogger } from './core/interfaces'
import { logger } from './utils/logger'
import { LoginHandler } from './handlers/login-handler'
import { QuizHandler } from './handlers/quiz-handler'
import { ProgressRepository } from './repositories/progress-repository'
import { AIService } from './ai/ai-service'
import { getConfig } from './config'

/**
 * Service factory for creating handlers and repositories
 * Implements dependency injection pattern
 */
class ServiceFactory implements IServiceFactory {
  private logger: ILogger = logger

  createLoginHandler(executor: IWebViewExecutor) {
    const config = getConfig(true, false)
    return new LoginHandler(
      executor,
      this.logger,
      config.moodle.url,
      config.moodle.username,
      config.moodle.password
    )
  }

  createQuizHandler(executor: IWebViewExecutor, aiService: any) {
    return new QuizHandler(executor, aiService, this.logger)
  }

  createProgressRepository() {
    return new ProgressRepository()
  }

  createAIService() {
    return new AIService()
  }
}

export const serviceFactory = new ServiceFactory()
