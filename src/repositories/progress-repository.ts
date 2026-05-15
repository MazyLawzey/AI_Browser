import { IProgressRepository } from '../core/interfaces'
import { logger } from '../utils/logger'

/**
 * Repository for tracking quiz progress
 */
export class ProgressRepository implements IProgressRepository {
  private totalQuestions: number = 0
  private answeredCount: number = 0

  getTotalQuestions(): number {
    return this.totalQuestions
  }

  getAnsweredCount(): number {
    return this.answeredCount
  }

  getProgress(): number {
    if (this.totalQuestions === 0) return 0
    return Math.round((this.answeredCount / this.totalQuestions) * 100)
  }

  incrementAnswered(): void {
    if (this.answeredCount < this.totalQuestions) {
      this.answeredCount++
      logger.debug('Question answered', {
        answered: this.answeredCount,
        total: this.totalQuestions,
        progress: this.getProgress(),
      })
    }
  }

  setTotal(total: number): void {
    this.totalQuestions = total
    this.answeredCount = 0
    logger.info('Progress repository initialized', { total })
  }

  reset(): void {
    this.totalQuestions = 0
    this.answeredCount = 0
    logger.debug('Progress repository reset')
  }
}
