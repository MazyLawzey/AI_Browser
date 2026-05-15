import { IWebViewExecutor, ILoginHandler, ILogger } from '../core/interfaces'
import { MoodleSelectors, MoodlePaths } from '../utils/selectors'
import { AuthenticationError } from '../core/errors'
import { eventBus, AppEvents } from '../events/event-bus'

/**
 * Handles Moodle login logic
 */
export class LoginHandler implements ILoginHandler {
  constructor(
    private executor: IWebViewExecutor,
    private logger: ILogger,
    private moodleUrl: string,
    private username: string,
    private password: string
  ) {}

  async isLoggedIn(): Promise<boolean> {
    return (await this.executor.elementExists(MoodleSelectors.login.usernameInput)) === false
  }

  async login(baseUrl: string): Promise<void> {
    this.logger.info('Starting Moodle login')
    eventBus.publish(AppEvents.LOGIN_STARTED)

    try {
      const loginUrl = `${baseUrl}${MoodlePaths.login}`
      this.logger.debug('Loading login page', { url: loginUrl })

      await this.executor.waitForPageLoad()

      const hasLoginForm = await this.executor.elementExists(MoodleSelectors.login.usernameInput)

      if (!hasLoginForm) {
        this.logger.info('User already logged in')
        eventBus.publish(AppEvents.LOGIN_SUCCESS)
        return
      }

      this.logger.info('Performing login')

      await this.executor.setInputValue(MoodleSelectors.login.usernameInput, this.username)
      await this.executor.setInputValue(MoodleSelectors.login.passwordInput, this.password)
      await this.executor.click(MoodleSelectors.login.submitButton)
      await this.executor.waitForPageLoad()

      const loginFailed = await this.executor.elementExists(MoodleSelectors.login.usernameInput)
      if (loginFailed) {
        throw new AuthenticationError('Login failed - credentials rejected')
      }

      this.logger.info('Login successful')
      eventBus.publish(AppEvents.LOGIN_SUCCESS)
    } catch (error) {
      this.logger.error('Login error', error)
      eventBus.publish(AppEvents.LOGIN_FAILED, { error })
      throw error
    }
  }
}
