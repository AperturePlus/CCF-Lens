/**
 * Vitest 测试环境设置
 * 提供 GM API 的 mock 实现
 */

// GM API 存储模拟
const gmStorage = new Map<string, unknown>()

// Mock GM_setValue
globalThis.GM_setValue = (key: string, value: unknown) => {
  gmStorage.set(key, value)
}

// Mock GM_getValue
globalThis.GM_getValue = <T>(key: string, defaultValue?: T): T => {
  if (gmStorage.has(key)) {
    return gmStorage.get(key) as T
  }
  return defaultValue as T
}

// Mock GM_deleteValue
globalThis.GM_deleteValue = (key: string) => {
  gmStorage.delete(key)
}

// Mock GM_listValues
globalThis.GM_listValues = (): string[] => {
  return Array.from(gmStorage.keys())
}

// Mock GM_xmlhttpRequest
globalThis.GM_xmlhttpRequest = (details: {
  method: string
  url: string
  onload?: (response: { responseText: string; status: number }) => void
  onerror?: (error: Error) => void
  ontimeout?: () => void
  timeout?: number
}) => {
  // 默认返回空响应，具体测试中可以覆盖
  setTimeout(() => {
    if (details.onload) {
      details.onload({
        responseText: '{}',
        status: 200,
      })
    }
  }, 0)
  return { abort: () => {} }
}

// Mock GM_addStyle
globalThis.GM_addStyle = (css: string) => {
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  return style
}

// Mock GM_registerMenuCommand
globalThis.GM_registerMenuCommand = (
  _name: string,
  _callback: () => void,
  _accessKey?: string
) => {
  // 菜单命令在测试环境中不执行任何操作
}

// 清理函数，在每个测试后调用
export function clearGMStorage() {
  gmStorage.clear()
}

// 导出存储以便测试检查
export { gmStorage }
