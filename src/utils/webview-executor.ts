import { WebContents } from 'electron'
import { logger } from './logger'

/**
 * Utility class for executing JavaScript in webview
 * Provides type-safe execution with error handling
 */
export class WebViewExecutor {
  constructor(private webContents: WebContents | null) {}

  /**
   * Execute JavaScript code in the webview
   * @param code The JavaScript code to execute (wrapped in IIFE automatically)
   * @returns The result of the execution
   */
  async exec<T>(code: string): Promise<T | null> {
    if (!this.webContents) {
      logger.warn('WebContents not available for execution')
      return null
    }

    try {
      return await this.webContents.executeJavaScript(`(function() { ${code} })()`)
    } catch (error) {
      logger.error('Error executing JavaScript in webview', error)
      return null
    }
  }

  /**
   * Wait for the page to finish loading
   * @param maxWait Maximum time to wait in milliseconds
   * @returns true if page loaded successfully
   */
  async waitForPageLoad(maxWait = 15000): Promise<boolean> {
    if (!this.webContents) {
      logger.warn('WebContents not available for page load check')
      return false
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), maxWait)
      const checkInterval = setInterval(() => {
        try {
          if (!this.webContents?.isLoading()) {
            clearTimeout(timeout)
            clearInterval(checkInterval)
            resolve(true)
          }
        } catch {
          clearTimeout(timeout)
          clearInterval(checkInterval)
          resolve(false)
        }
      }, 500)
    })
  }

  /**
   * Click an element by selector
   */
  async click(selector: string): Promise<void> {
    await this.exec(`
      const element = document.querySelector(${JSON.stringify(selector)});
      if (element) element.click();
    `)
  }

  /**
   * Set input value
   */
  async setInputValue(selector: string, value: string): Promise<void> {
    await this.exec(`
      const input = document.querySelector(${JSON.stringify(selector)});
      if (input) {
        input.value = ${JSON.stringify(value)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `)
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string | null> {
    return this.exec(`
      const element = document.querySelector(${JSON.stringify(selector)});
      return element?.textContent?.trim() || null;
    `)
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    const exists = await this.exec<boolean>(`
      return document.querySelector(${JSON.stringify(selector)}) !== null;
    `)
    return exists ?? false
  }

  updateWebContents(wc: WebContents | null): void {
    this.webContents = wc
  }
}
