/**
 * Greasemonkey/Tampermonkey API 类型声明
 */

declare function GM_setValue(key: string, value: unknown): void

declare function GM_getValue<T>(key: string, defaultValue?: T): T

declare function GM_deleteValue(key: string): void

declare function GM_listValues(): string[]

/**
 * GM_xmlhttpRequest 错误响应对象
 * Tampermonkey 的 onerror 回调接收的是响应对象，而不是 Error 对象
 */
interface GMXMLHttpRequestErrorResponse {
  /** 错误信息 */
  error?: string
  /** 响应状态码（如果有） */
  status?: number
  /** 响应状态文本（如果有） */
  statusText?: string
  /** 最终请求的 URL */
  finalUrl?: string
  /** 响应头（如果有） */
  responseHeaders?: string
  /** 响应文本（如果有） */
  responseText?: string
}

interface GMXMLHttpRequestDetails {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'
  url: string
  headers?: Record<string, string>
  data?: string
  timeout?: number
  onload?: (response: GMXMLHttpRequestResponse) => void
  onerror?: (response: GMXMLHttpRequestErrorResponse) => void
  ontimeout?: () => void
}

interface GMXMLHttpRequestResponse {
  responseText: string
  status: number
  statusText?: string
  responseHeaders?: string
  finalUrl?: string
}

interface GMXMLHttpRequestControl {
  abort: () => void
}

declare function GM_xmlhttpRequest(
  details: GMXMLHttpRequestDetails
): GMXMLHttpRequestControl

declare function GM_addStyle(css: string): HTMLStyleElement

declare function GM_registerMenuCommand(
  name: string,
  callback: () => void,
  accessKey?: string
): void
