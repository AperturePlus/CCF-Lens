/**
 * Settings Store Module
 * 
 * Provides reactive settings management using Vue3 reactive system.
 * Persists settings using GM_setValue/GM_getValue.
 * 
 * Requirements: 5.5 - Settings should be immediately applied and persisted
 * Requirements: 5.6 - Use GM_setValue/GM_getValue for storage
 */

import { reactive, readonly, type DeepReadonly } from 'vue'

/**
 * Settings for which CCF ranks to display
 */
export interface RankDisplaySettings {
  A: boolean
  B: boolean
  C: boolean
  unknown: boolean
}

/**
 * Settings for which sites are enabled
 */
export interface SiteEnableSettings {
  arxiv: boolean
  dblp: boolean
  ieee: boolean
}

/**
 * Badge display position options
 */
export type BadgePosition = 'after-title' | 'after-authors' | 'inline'

/**
 * Complete settings interface
 */
export interface Settings {
  /** Which CCF ranks to display */
  showRanks: RankDisplaySettings
  /** Which sites are enabled */
  enabledSites: SiteEnableSettings
  /** Badge display position */
  badgePosition: BadgePosition
  /** Debug mode for console logging */
  debugMode: boolean
  /** Whether stats panel is expanded by default */
  statsExpanded: boolean
}

/**
 * Stored settings structure with version for migration
 */
export interface StoredSettings {
  version: number
  settings: Settings
  lastModified: number
}

/**
 * Current settings version for migration support
 */
export const SETTINGS_VERSION = 1

/**
 * Storage key for settings
 */
export const SETTINGS_STORAGE_KEY = 'ccf_rank_settings'

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  showRanks: {
    A: true,
    B: true,
    C: true,
    unknown: true,
  },
  enabledSites: {
    arxiv: true,
    dblp: true,
    ieee: true,
  },
  badgePosition: 'after-title',
  debugMode: false,
  statsExpanded: false,
}


/**
 * Deep clone a settings object
 */
function cloneSettings(settings: Settings): Settings {
  return {
    showRanks: { ...settings.showRanks },
    enabledSites: { ...settings.enabledSites },
    badgePosition: settings.badgePosition,
    debugMode: settings.debugMode,
    statsExpanded: settings.statsExpanded,
  }
}

/**
 * Validate and migrate settings from storage
 * Returns default settings if validation fails
 */
function validateAndMigrateSettings(stored: unknown): Settings {
  if (!stored || typeof stored !== 'object') {
    return cloneSettings(DEFAULT_SETTINGS)
  }

  const storedObj = stored as Partial<StoredSettings>

  // Check version and migrate if needed
  if (typeof storedObj.version !== 'number' || storedObj.version > SETTINGS_VERSION) {
    return cloneSettings(DEFAULT_SETTINGS)
  }

  const settings = storedObj.settings
  if (!settings || typeof settings !== 'object') {
    return cloneSettings(DEFAULT_SETTINGS)
  }

  // Validate and merge with defaults
  return {
    showRanks: {
      A: typeof settings.showRanks?.A === 'boolean' ? settings.showRanks.A : DEFAULT_SETTINGS.showRanks.A,
      B: typeof settings.showRanks?.B === 'boolean' ? settings.showRanks.B : DEFAULT_SETTINGS.showRanks.B,
      C: typeof settings.showRanks?.C === 'boolean' ? settings.showRanks.C : DEFAULT_SETTINGS.showRanks.C,
      unknown: typeof settings.showRanks?.unknown === 'boolean' ? settings.showRanks.unknown : DEFAULT_SETTINGS.showRanks.unknown,
    },
    enabledSites: {
      arxiv: typeof settings.enabledSites?.arxiv === 'boolean' ? settings.enabledSites.arxiv : DEFAULT_SETTINGS.enabledSites.arxiv,
      dblp: typeof settings.enabledSites?.dblp === 'boolean' ? settings.enabledSites.dblp : DEFAULT_SETTINGS.enabledSites.dblp,
      ieee: typeof settings.enabledSites?.ieee === 'boolean' ? settings.enabledSites.ieee : DEFAULT_SETTINGS.enabledSites.ieee,
    },
    badgePosition: isValidBadgePosition(settings.badgePosition) ? settings.badgePosition : DEFAULT_SETTINGS.badgePosition,
    debugMode: typeof settings.debugMode === 'boolean' ? settings.debugMode : DEFAULT_SETTINGS.debugMode,
    statsExpanded: typeof settings.statsExpanded === 'boolean' ? settings.statsExpanded : DEFAULT_SETTINGS.statsExpanded,
  }
}

/**
 * Type guard for badge position
 */
function isValidBadgePosition(value: unknown): value is BadgePosition {
  return value === 'after-title' || value === 'after-authors' || value === 'inline'
}

/**
 * SettingsStore class for managing user settings
 * Uses Vue3 reactive for reactivity and GM API for persistence
 */
export class SettingsStore {
  private _settings: Settings
  private _loaded: boolean = false

  constructor() {
    // Initialize with default settings (reactive)
    this._settings = reactive(cloneSettings(DEFAULT_SETTINGS))
  }

  /**
   * Get readonly access to current settings
   */
  get settings(): DeepReadonly<Settings> {
    return readonly(this._settings)
  }

  /**
   * Check if settings have been loaded from storage
   */
  get isLoaded(): boolean {
    return this._loaded
  }

  /**
   * Load settings from GM storage
   * Merges with defaults for any missing values
   */
  async load(): Promise<void> {
    try {
      const stored = GM_getValue<StoredSettings | null>(SETTINGS_STORAGE_KEY, null)
      const validated = validateAndMigrateSettings(stored)
      
      // Update reactive settings
      this.applySettings(validated)
      this._loaded = true
    } catch (error) {
      console.warn('[SettingsStore] Error loading settings:', error)
      // Keep default settings on error
      this._loaded = true
    }
  }

  /**
   * Save current settings to GM storage
   */
  async save(): Promise<void> {
    try {
      const storedSettings: StoredSettings = {
        version: SETTINGS_VERSION,
        settings: cloneSettings(this._settings),
        lastModified: Date.now(),
      }
      GM_setValue(SETTINGS_STORAGE_KEY, storedSettings)
    } catch (error) {
      console.error('[SettingsStore] Error saving settings:', error)
      throw error
    }
  }

  /**
   * Reset settings to defaults and save
   */
  reset(): void {
    this.applySettings(cloneSettings(DEFAULT_SETTINGS))
    // Save reset settings
    this.save().catch(error => {
      console.error('[SettingsStore] Error saving reset settings:', error)
    })
  }

  /**
   * Update a specific setting and auto-save
   * 
   * @param key - The setting key to update
   * @param value - The new value
   */
  update<K extends keyof Settings>(key: K, value: Settings[K]): void {
    if (key === 'showRanks' && typeof value === 'object') {
      Object.assign(this._settings.showRanks, value)
    } else if (key === 'enabledSites' && typeof value === 'object') {
      Object.assign(this._settings.enabledSites, value)
    } else {
      (this._settings as Settings)[key] = value
    }
    
    // Auto-save on update (Requirements 5.5)
    this.save().catch(error => {
      console.error('[SettingsStore] Error auto-saving settings:', error)
    })
  }

  /**
   * Update multiple settings at once with a single save operation
   * This is more efficient than calling update() multiple times
   * 
   * @param updates - Partial settings object with values to update
   */
  batchUpdate(updates: Partial<Settings>): void {
    if (updates.showRanks) {
      Object.assign(this._settings.showRanks, updates.showRanks)
    }
    if (updates.enabledSites) {
      Object.assign(this._settings.enabledSites, updates.enabledSites)
    }
    if (updates.badgePosition !== undefined) {
      this._settings.badgePosition = updates.badgePosition
    }
    if (updates.debugMode !== undefined) {
      this._settings.debugMode = updates.debugMode
    }
    if (updates.statsExpanded !== undefined) {
      this._settings.statsExpanded = updates.statsExpanded
    }
    
    // Single save operation for all updates
    this.save().catch(error => {
      console.error('[SettingsStore] Error auto-saving settings:', error)
    })
  }

  /**
   * Update a rank display setting
   */
  setRankDisplay(rank: keyof RankDisplaySettings, enabled: boolean): void {
    this._settings.showRanks[rank] = enabled
    this.save().catch(error => {
      console.error('[SettingsStore] Error saving rank display setting:', error)
    })
  }

  /**
   * Update a site enable setting
   */
  setSiteEnabled(site: keyof SiteEnableSettings, enabled: boolean): void {
    this._settings.enabledSites[site] = enabled
    this.save().catch(error => {
      console.error('[SettingsStore] Error saving site enable setting:', error)
    })
  }

  /**
   * Apply settings to the reactive state
   */
  private applySettings(settings: Settings): void {
    Object.assign(this._settings.showRanks, settings.showRanks)
    Object.assign(this._settings.enabledSites, settings.enabledSites)
    this._settings.badgePosition = settings.badgePosition
    this._settings.debugMode = settings.debugMode
    this._settings.statsExpanded = settings.statsExpanded
  }

  /**
   * Get a plain object copy of current settings (for testing/debugging)
   */
  toJSON(): Settings {
    return cloneSettings(this._settings)
  }
}

// Singleton instance
let settingsInstance: SettingsStore | null = null

/**
 * Get the singleton SettingsStore instance
 */
export function getSettingsStore(): SettingsStore {
  if (!settingsInstance) {
    settingsInstance = new SettingsStore()
  }
  return settingsInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSettingsStore(): void {
  settingsInstance = null
}

export default getSettingsStore
