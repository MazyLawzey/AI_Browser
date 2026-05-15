import { WebContents } from 'electron'

// Agent status types
export type AgentStatus = 'idle' | 'running' | 'stopped' | 'error'

// Callback types
export type StatusCallback = (status: AgentStatus, message: string) => void

// Question types from Moodle
export type QuestionType = 'multichoice' | 'truefalse' | 'shortanswer' | 'match' | 'unknown'

export interface Question {
  id: string
  text: string
  type: QuestionType
}

// IPC Events
export namespace IpcEvents {
  // Tooltip events
  export const TEXT_SELECTED = 'text-selected'
  export const TEXT_DESELECTED = 'text-deselected'
  export const TOOLTIP_SHOW = 'show'
  export const TOOLTIP_AI_CHUNK = 'ai-chunk'
  export const TOOLTIP_AI_DONE = 'ai-done'
  export const TOOLTIP_AI_ERROR = 'ai-error'
  export const TOOLTIP_ASK_AI = 'ask-ai'

  // Navigation events
  export const NAVIGATE_PAGE = 'navigate-page'
  export const PAGE_NAVIGATE = 'page-navigate'

  // Agent events
  export const AGENT_REGISTER_WEBVIEW = 'agent-register-webview'
  export const AGENT_START = 'agent-start'
  export const AGENT_STOP = 'agent-stop'
  export const AGENT_STATUS = 'agent-status'
  export const AGENT_GET_STATUS = 'agent-get-status'
}

export interface TextSelectionPayload {
  text: string
  x: number
  y: number
}

export interface AgentStatusPayload {
  status: AgentStatus
  message: string
}

export interface WindowPosition {
  x: number
  y: number
}

export interface WindowSize {
  width: number
  height: number
}

// Agent webview interface
export interface AgentWebView {
  setWebContents(wc: WebContents): void
  getStatus(): AgentStatus
  start(): Promise<void>
  stop(): void
  onStatus(cb: StatusCallback): void
}
