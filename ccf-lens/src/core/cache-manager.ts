/**
 * Cache Manager Module
 * 
 * Provides caching functionality using GM_setValue/GM_getValue for persistent storage.
 * Implements TTL (Time-To-Live) expiration mechanism.
 * 
 * Requirements: 6.1 - Cache DBLP query results to avoid repeated requests
 */

/**
 * Cache entry structure with metadata
 */
export interface CacheEntry<T> {
  /** The cached value */
  value: T
  /** Timestamp when the entry was created (ms since epoch) */
  timestamp: number
  /** Time-to-live in milliseconds */
  ttl: number
}

/**
 * Default TTL: 7 days in milliseconds
 */
export const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000

/**
 * Cache key prefix to avoid conflicts with other scripts
 */
const CACHE_PREFIX = 'ccf_rank_cache_'

/**
 * CacheManager class for managing cached data with TTL expiration
 */
export class CacheManager {
  private memoryCache: Map<string, CacheEntry<unknown>>
  private defaultTtl: number

  constructor(defaultTtl: number = DEFAULT_TTL) {
    this.memoryCache = new Map()
    this.defaultTtl = defaultTtl
  }

  /**
   * Get the full storage key with prefix
   */
  private getStorageKey(key: string): string {
    return `${CACHE_PREFIX}${key}`
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    const now = Date.now()
    return now - entry.timestamp > entry.ttl
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   * 
   * @param key - The cache key
   * @returns The cached value or null
   */
  get<T>(key: string): T | null {
    // First check memory cache
    const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined
    if (memoryEntry) {
      if (this.isExpired(memoryEntry)) {
        this.delete(key)
        return null
      }
      return memoryEntry.value
    }

    // Then check persistent storage
    try {
      const storageKey = this.getStorageKey(key)
      const stored = GM_getValue<CacheEntry<T> | null>(storageKey, null)
      
      if (!stored) {
        return null
      }

      if (this.isExpired(stored)) {
        this.delete(key)
        return null
      }

      // Populate memory cache for faster subsequent access
      this.memoryCache.set(key, stored)
      return stored.value
    } catch (error) {
      console.warn('[CacheManager] Error reading from storage:', error)
      return null
    }
  }

  /**
   * Set a value in cache with optional TTL
   * 
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time-to-live in milliseconds (optional, uses default if not provided)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    }

    // Update memory cache
    this.memoryCache.set(key, entry)

    // Persist to storage
    try {
      const storageKey = this.getStorageKey(key)
      GM_setValue(storageKey, entry)
    } catch (error) {
      console.warn('[CacheManager] Error writing to storage:', error)
    }
  }

  /**
   * Delete a value from cache
   * 
   * @param key - The cache key to delete
   */
  delete(key: string): void {
    // Remove from memory cache
    this.memoryCache.delete(key)

    // Remove from persistent storage
    try {
      const storageKey = this.getStorageKey(key)
      GM_deleteValue(storageKey)
    } catch (error) {
      console.warn('[CacheManager] Error deleting from storage:', error)
    }
  }

  /**
   * Check if a key exists in cache and is not expired
   * 
   * @param key - The cache key
   * @returns true if the key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Clear all cache entries (both memory and persistent)
   */
  clear(): void {
    // Clear memory cache
    this.memoryCache.clear()

    // Clear persistent storage
    try {
      const allKeys = GM_listValues()
      for (const storageKey of allKeys) {
        if (storageKey.startsWith(CACHE_PREFIX)) {
          GM_deleteValue(storageKey)
        }
      }
    } catch (error) {
      console.warn('[CacheManager] Error clearing storage:', error)
    }
  }

  /**
   * Get the number of entries in memory cache
   * Note: This doesn't include entries only in persistent storage
   */
  get size(): number {
    return this.memoryCache.size
  }

  /**
   * Clean up expired entries from both memory and persistent storage
   */
  cleanup(): void {
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key)
      }
    }

    // Clean persistent storage
    try {
      const allKeys = GM_listValues()
      for (const storageKey of allKeys) {
        if (storageKey.startsWith(CACHE_PREFIX)) {
          const entry = GM_getValue<CacheEntry<unknown> | null>(storageKey, null)
          if (entry && this.isExpired(entry)) {
            GM_deleteValue(storageKey)
          }
        }
      }
    } catch (error) {
      console.warn('[CacheManager] Error during cleanup:', error)
    }
  }
}

// Singleton instance
let cacheInstance: CacheManager | null = null

/**
 * Get the singleton CacheManager instance
 */
export function getCacheManager(): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager()
  }
  return cacheInstance
}

export default getCacheManager
