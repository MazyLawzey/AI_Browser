import ollama, { Ollama } from 'ollama'
import { getConfig } from '../config'
import { logger } from '../utils/logger'
import { IAIService } from '../core/interfaces'
import { AIServiceError } from '../core/errors'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * AI Service for interacting with Ollama
 * Provides both streaming and non-streaming responses
 */
export class AIService implements IAIService {
  private model: string
  private ollama: Ollama

  private readonly systemPrompt = `Ты помощник. Отвечай коротко и по делу — только ответ, без вступлений, объяснений и лишних слов. Только вариант ответа, больше ничего. Если ты сомневаешься, просто скажи "не знаю".`

  constructor() {
    try {
      const config = getConfig(false, true)
      this.model = config.ollama.model
      this.ollama = new Ollama({ host: config.ollama.host })
      logger.debug('AIService initialized', { model: this.model, host: config.ollama.host })
    } catch (error) {
      logger.error('Failed to initialize AIService', error)
      throw new AIServiceError(`Failed to initialize AI service: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generate a response stream from the AI model
   * Yields chunks as they arrive from Ollama
   */
  async *generateResponseStream(prompt: string): AsyncGenerator<string> {
    try {
      logger.debug('Generating AI response stream', { model: this.model, promptLength: prompt.length })

      const stream = await this.ollama.chat({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt },
        ],
        stream: true,
      })

      for await (const chunk of stream) {
        const text = chunk.message.content
        if (text) yield text
      }

      logger.debug('AI response stream completed')
    } catch (error) {
      logger.error('Error generating AI response stream', error)
      throw new AIServiceError(`Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generate a complete response (non-streaming)
   * Collects all chunks and returns the complete response
   */
  async generateResponse(prompt: string): Promise<string> {
    let response = ''
    try {
      for await (const chunk of this.generateResponseStream(prompt)) {
        response += chunk
      }
      const trimmedResponse = response.trim()
      logger.debug('AI response generated', { length: trimmedResponse.length })
      return trimmedResponse
    } catch (error) {
      logger.error('Error generating complete response', error)
      throw error
    }
  }
}
