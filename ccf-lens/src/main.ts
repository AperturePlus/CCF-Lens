/**
 * Main Entry Point - CCF Rank UserScript
 * 
 * Initializes the Vue application, registers site adapters, and sets up
 * global error handling for the userscript.
 * 
 * Requirements:
 * - 8.3: Log errors and continue processing other papers when DOM extraction fails
 * - 8.4: Provide debug mode with detailed console logging
 * - 8.5: Catch exceptions and show generic error message for unexpected errors
 */

import { createApp } from 'vue'
import App from './App.vue'
import { getSiteManager } from './adapters/site-manager'
import { createArxivAdapter } from './adapters/arxiv-adapter'
import { createDblpAdapter } from './adapters/dblp-adapter'
import { createIeeeAdapter } from './adapters/ieee-adapter'
import { createGoogleScholarAdapter } from './adapters/google-scholar-adapter'
import { getSettingsStore } from './stores/settings-store'

// Script identification for logging
const SCRIPT_NAME = '[CCF Rank]'

/**
 * Debug logging utility
 * Only logs when debug mode is enabled in settings
 */
function debugLog(...args: unknown[]): void {
  const settingsStore = getSettingsStore()
  if (settingsStore.settings.debugMode) {
    console.log(SCRIPT_NAME, ...args)
  }
}

/**
 * Error logging utility
 * Always logs errors regardless of debug mode
 */
function errorLog(...args: unknown[]): void {
  console.error(SCRIPT_NAME, ...args)
}

/**
 * Warning logging utility
 */
function warnLog(...args: unknown[]): void {
  console.warn(SCRIPT_NAME, ...args)
}

/**
 * Setup global error handlers
 * Requirement 8.5: Catch exceptions and show generic error message
 */
function setupGlobalErrorHandlers(): void {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    // Only handle errors from our script
    if (event.filename?.includes('labelpilot') || event.filename?.includes('ccf-rank')) {
      errorLog('Uncaught error:', event.error?.message || event.message)
      // Don't prevent default - let the page continue working
    }
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorLog('Unhandled promise rejection:', event.reason)
    // Don't prevent default - let the page continue working
  })

  debugLog('Global error handlers installed')
}

/**
 * Register all site adapters with the SiteManager
 * Uses factory functions for lazy instantiation
 */
function registerAdapters(): void {
  const siteManager = getSiteManager()
  
  // Register adapter factories for lazy instantiation
  // This avoids creating adapters for sites we're not on
  siteManager.registerAdapterFactory('arxiv', createArxivAdapter)
  siteManager.registerAdapterFactory('dblp', createDblpAdapter)
  siteManager.registerAdapterFactory('ieee', createIeeeAdapter)
  siteManager.registerAdapterFactory('google-scholar', createGoogleScholarAdapter)
  
  debugLog('Site adapters registered:', siteManager.getRegisteredSiteIds())
}

/**
 * Create and mount the Vue application
 */
function mountApp(): void {
  // Create a container for the Vue app
  const appContainer = document.createElement('div')
  appContainer.id = 'ccf-rank-app'
  appContainer.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 9997; pointer-events: none;'
  document.body.appendChild(appContainer)
  
  // Create and mount the Vue app
  const app = createApp(App)
  
  // Add global error handler for Vue
  app.config.errorHandler = (err, _instance, info) => {
    errorLog('Vue error:', err)
    errorLog('Info:', info)
  }
  
  // Add warning handler for development
  app.config.warnHandler = (msg, _instance, trace) => {
    warnLog('Vue warning:', msg)
    if (trace) {
      debugLog('Trace:', trace)
    }
  }
  
  app.mount(appContainer)
  debugLog('Vue app mounted')
}

/**
 * Add custom styles for the userscript
 */
function addCustomStyles(): void {
  // Use GM_addStyle if available, otherwise inject style tag
  const styles = `
    /* CCF Rank Badge Container */
    .ccf-rank-badge-container {
      display: inline-block;
      vertical-align: middle;
      margin-left: 4px;
    }
    
    /* Ensure badges don't break layout */
    .ccf-rank-badge-container * {
      box-sizing: border-box;
    }
    
    /* Animation for loading state */
    @keyframes ccf-rank-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `
  
  if (typeof GM_addStyle !== 'undefined') {
    GM_addStyle(styles)
  } else {
    const styleElement = document.createElement('style')
    styleElement.textContent = styles
    document.head.appendChild(styleElement)
  }
  
  debugLog('Custom styles added')
}

/**
 * Register menu commands for quick access
 */
function registerMenuCommands(): void {
  if (typeof GM_registerMenuCommand !== 'undefined') {
    // Toggle debug mode
    GM_registerMenuCommand('Toggle Debug Mode', () => {
      const settingsStore = getSettingsStore()
      const currentDebug = settingsStore.settings.debugMode
      settingsStore.update('debugMode', !currentDebug)
      console.log(SCRIPT_NAME, `Debug mode ${!currentDebug ? 'enabled' : 'disabled'}`)
    })
    
    // Clear cache
    GM_registerMenuCommand('Clear Cache', () => {
      // Clear all cached values
      if (typeof GM_listValues !== 'undefined' && typeof GM_deleteValue !== 'undefined') {
        const keys = GM_listValues()
        let cacheCount = 0
        for (const key of keys) {
          // CacheManager stores keys as: ccf_rank_cache_${logicalKey}
          // DBLP logical keys are prefixed with "dblp_"
          if (key.startsWith('ccf_rank_cache_dblp_') || key.startsWith('dblp_cache_')) {
            GM_deleteValue(key)
            cacheCount++
          }
        }
        console.log(SCRIPT_NAME, `Cleared ${cacheCount} cached entries`)
      }
    })
    
    debugLog('Menu commands registered')
  }
}

/**
 * Check if the current site is enabled in settings
 */
async function checkSiteEnabled(): Promise<boolean> {
  const settingsStore = getSettingsStore()
  await settingsStore.load()
  
  const siteManager = getSiteManager()
  const adapter = siteManager.detectCurrentSite()
  
  if (!adapter) {
    debugLog('No matching adapter for current site')
    return false
  }
  
  const siteId = adapter.siteId as keyof typeof settingsStore.settings.enabledSites
  const isEnabled = settingsStore.settings.enabledSites[siteId] ?? true
  
  if (!isEnabled) {
    debugLog(`Site ${siteId} is disabled in settings`)
    return false
  }
  
  return true
}

/**
 * Main initialization function
 */
async function initialize(): Promise<void> {
  try {
    debugLog('Initializing CCF Rank UserScript...')
    
    // Setup error handlers first
    setupGlobalErrorHandlers()
    
    // Register adapters
    registerAdapters()
    
    // Check if current site is enabled
    const siteEnabled = await checkSiteEnabled()
    if (!siteEnabled) {
      debugLog('Script disabled for current site, exiting')
      return
    }
    
    // Add custom styles
    addCustomStyles()
    
    // Register menu commands
    registerMenuCommands()
    
    // Mount the Vue app
    mountApp()
    
    debugLog('CCF Rank UserScript initialized successfully')
  } catch (error) {
    errorLog('Failed to initialize:', error)
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  // DOM is already ready
  initialize()
}
