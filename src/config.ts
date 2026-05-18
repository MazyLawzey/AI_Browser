import * as dotenv from 'dotenv'

dotenv.config()

export interface AppConfig {
  moodle: {
    url: string
    username: string
    password: string
  }
  ollama: {
    host: string
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

let cachedConfig: AppConfig | null = null

const buildConfig = (): AppConfig => {
  return {
    moodle: {
      url: process.env.MOODLE_URL || '',
      username: process.env.MOODLE_USERNAME || '',
      password: process.env.MOODLE_PASSWORD || '',
    },
    ollama: {
      host: process.env.OLLAMA_HOST || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || '',
      agentModel: process.env.AGENT_MODEL || process.env.OLLAMA_MODEL || '',
    },
    ui: {
      tooltipWidth: 340,
      tooltipHeight: 100,
      mainWindowWidth: 1280,
      mainWindowHeight: 800,
    },
  }
}

const validateMoodleConfig = (config: AppConfig): void => {
  const moodle = config.moodle

  if (!moodle?.url || !moodle?.username || !moodle?.password) {
    throw new Error('Missing MOODLE credentials in environment variables')
  }
}

const validateOllamaConfig = (config: AppConfig): void => {
  const ollama = config.ollama

  if (!ollama?.model) {
    throw new Error('Missing OLLAMA_MODEL in environment variables')
  }
}

/**
 * Get application config (cached)
 * @param validateMoodle - whether to validate Moodle credentials (default: false)
 * @param validateOllama - whether to validate Ollama config (default: false)
 */
export const getConfig = (validateMoodle = false, validateOllama = false): AppConfig => {
  if (!cachedConfig) {
    cachedConfig = buildConfig()
  }

  if (validateMoodle) {
    validateMoodleConfig(cachedConfig)
  }

  if (validateOllama) {
    validateOllamaConfig(cachedConfig)
  }

  return cachedConfig
}
