import { logger } from '../utils/logger'
import { IEventBus } from '../core/interfaces'

export const AppEvents = {
  // Agent events
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_ERROR: 'agent:error',
  AGENT_STATUS_CHANGED: 'agent:status_changed',

  // Login events
  LOGIN_STARTED: 'login:started',
  LOGIN_SUCCESS: 'login:success',
  LOGIN_FAILED: 'login:failed',

  // Quiz events
  QUIZ_FOUND: 'quiz:found',
  QUIZ_STARTED: 'quiz:started',
  QUIZ_COMPLETED: 'quiz:completed',

  // Question events
  QUESTION_ANSWERED: 'question:answered',
  QUESTIONS_LOADED: 'questions:loaded',

  // Error events
  ERROR_OCCURRED: 'error:occurred',
} as const

type EventHandler = (data?: any) => void
type Unsubscriber = () => void

/**
 * Event bus for decoupled communication between components
 */
class EventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()

  subscribe(event: string, handler: EventHandler): Unsubscriber {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }

    this.handlers.get(event)!.add(handler)
    logger.debug(`Event subscription: ${event}`)

    // Return unsubscriber function
    return () => {
      const eventHandlers = this.handlers.get(event)
      if (eventHandlers) {
        eventHandlers.delete(handler)
      }
      logger.debug(`Event unsubscribed: ${event}`)
    }
  }

  publish(event: string, data?: any): void {
    const eventHandlers = this.handlers.get(event)
    if (!eventHandlers || eventHandlers.size === 0) {
      return
    }

    logger.debug(`Publishing event: ${event}`, data)

    eventHandlers.forEach((handler) => {
      try {
        handler(data)
      } catch (error) {
        logger.error(`Error in event handler for ${event}`, error)
      }
    })
  }

  unsubscribeAll(): void {
    this.handlers.clear()
    logger.info('All events unsubscribed')
  }
}

export const eventBus = new EventBus()
