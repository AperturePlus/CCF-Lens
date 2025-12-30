/**
 * Greasemonkey/Tampermonkey API 类型声明
 */

declare function GM_setValue(key: string, value: unknown): void

declare function GM_getValue<T>(key: string, defaultValue?: T): T

declare function GM_deleteValue(key: string): void

declare function GM_listValues(): string[]

interface GMXMLHttpRequestDetails {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'
  url: string
  headers?: Record<string, string>
  data?: string
  timeout?: number
  onload?: (response: GMXMLHttpRequestResponse) => void
  onerror?: (error: Error) => void
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
