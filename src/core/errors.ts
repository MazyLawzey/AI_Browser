/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super('CONFIGURATION_ERROR', message, 400)
    this.name = 'ConfigurationError'
  }
}

export class WebViewError extends AppError {
  constructor(message: string) {
    super('WEBVIEW_ERROR', message, 500)
    this.name = 'WebViewError'
  }
}

export class MoodleError extends AppError {
  constructor(message: string) {
    super('MOODLE_ERROR', message, 500)
    this.name = 'MoodleError'
  }
}

export class AIServiceError extends AppError {
  constructor(message: string) {
    super('AI_SERVICE_ERROR', message, 500)
    this.name = 'AIServiceError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('AUTHENTICATION_ERROR', message, 401)
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400)
    this.name = 'ValidationError'
  }
}
