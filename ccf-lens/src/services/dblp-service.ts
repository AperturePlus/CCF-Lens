/**
 * DBLP Service Module
 * 
 * Provides functionality to query DBLP API for paper venue information.
 * Integrates with CacheManager for caching results.
 * 
 * Requirements:
 * - 2.2: Query DBLP when arXiv comments don't have venue info
 * - 6.1: Cache DBLP query results to avoid repeated requests
 * - 6.5: Set reasonable timeout (10 seconds)
 * - 8.1: Show friendly error message on DBLP request failure
 * - 8.2: Show timeout status and allow retry
 */

import { CacheManager, getCacheManager } from '../core/cache-manager'

/**
 * Result of a DBLP query
 */
export interface DblpResult {
  /** Whether a matching paper was found */
  found: boolean
  /** The venue name (journal/conference) */
  venue: string | null
  /** Publication year */
  year: string | null
  /** DBLP URL for the paper */
  dblpUrl: string | null
  /** Error message if query failed */
  error?: string
  /** Whether the query timed out */
  timedOut?: boolean
}

/**
 * DBLP API response structure (simplified)
 */
interface DblpApiResponse {
  result: {
    hits: {
      '@total': string
      hit?: DblpHit[] | DblpHit
    }
  }
}

interface DblpHit {
  info: {
    title: string
    venue?: string
    year?: string
    url?: string
    type?: string
  }
}

/**
 * Default timeout for DBLP requests: 10 seconds
 */
export const DBLP_TIMEOUT = 10 * 1000

/**
 * DBLP API base URL
 */
const DBLP_API_BASE = 'https://dblp.org/search/publ/api'

/**
 * Cache key prefix for DBLP queries
 */
const DBLP_CACHE_PREFIX = 'dblp_'

/**
 * Generate a cache key from a paper title
 */
function generateCacheKey(title: string): string {
  // Normalize the title for consistent caching
  const normalized = title.toLowerCase().trim().replace(/\s+/g, '_')
  return `${DBLP_CACHE_PREFIX}${normalized}`
}

/**
 * Normalize a title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim()
}

/**
 * Calculate similarity between two titles (simple word overlap)
 */
function titleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(normalizeTitle(title1).split(' '))
  const words2 = new Set(normalizeTitle(title2).split(' '))
  
  let intersection = 0
  for (const word of words1) {
    if (words2.has(word)) {
      intersection++
    }
  }
  
  const union = words1.size + words2.size - intersection
  return union > 0 ? intersection / union : 0
}

/**
 * DblpService class for querying DBLP API
 */
export class DblpService {
  private cacheManager: CacheManager
  private timeout: number

  constructor(cacheManager?: CacheManager, timeout: number = DBLP_TIMEOUT) {
    this.cacheManager = cacheManager ?? getCacheManager()
    this.timeout = timeout
  }

  /**
   * Query DBLP by paper title
   * 
   * @param title - The paper title to search for
   * @returns Promise resolving to DblpResult
   */
  async queryByTitle(title: string): Promise<DblpResult> {
    if (!title || title.trim().length === 0) {
      return {
        found: false,
        venue: null,
        year: null,
        dblpUrl: null,
        error: 'Empty title provided',
      }
    }

    const cacheKey = generateCacheKey(title)
    
    // Check cache first
    const cached = this.cacheManager.get<DblpResult>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Query DBLP API
    try {
      const { promise } = this.fetchFromDblp(title)
      const result = await promise
      
      // Cache the result (even if not found, to avoid repeated queries)
      this.cacheManager.set(cacheKey, result)
      
      return result
    } catch (error) {
      const errorResult: DblpResult = {
        found: false,
        venue: null,
        year: null,
        dblpUrl: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timedOut: error instanceof Error && error.message.includes('timeout'),
      }
      
      // Don't cache errors - allow retry
      return errorResult
    }
  }

  /**
   * Fetch paper info from DBLP API using GM_xmlhttpRequest
   * Returns both the promise and an abort function for cancellation
   */
  private fetchFromDblp(title: string): { promise: Promise<DblpResult>; abort: () => void } {
    let abortFn: (() => void) | null = null
    
    const promise = new Promise<DblpResult>((resolve, reject) => {
      const encodedTitle = encodeURIComponent(title)
      const url = `${DBLP_API_BASE}?q=${encodedTitle}&format=json&h=5`

      const requestControl = GM_xmlhttpRequest({
        method: 'GET',
        url,
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
        },
        onload: (response) => {
          try {
            if (response.status !== 200) {
              reject(new Error(`DBLP API returned status ${response.status}`))
              return
            }

            const data: DblpApiResponse = JSON.parse(response.responseText)
            const result = this.parseResponse(data, title)
            resolve(result)
          } catch (parseError) {
            reject(new Error('Failed to parse DBLP response'))
          }
        },
        onerror: (error) => {
          reject(new Error(`Network error: ${error?.message || 'Unknown'}`))
        },
        ontimeout: () => {
          reject(new Error('Request timeout'))
        },
      })

      // Store abort function for cancellation support
      abortFn = () => {
        if (requestControl && typeof requestControl.abort === 'function') {
          requestControl.abort()
        }
      }
    })
    
    return {
      promise,
      abort: () => abortFn?.(),
    }
  }

  /**
   * Parse DBLP API response and find the best matching paper
   */
  private parseResponse(data: DblpApiResponse, searchTitle: string): DblpResult {
    const rawHits = data.result?.hits?.hit
    const hits = Array.isArray(rawHits) ? rawHits : rawHits ? [rawHits] : []

    if (hits.length === 0) {
      return {
        found: false,
        venue: null,
        year: null,
        dblpUrl: null,
      }
    }

    // Find the best matching hit based on title similarity
    let bestMatch: DblpHit | null = null
    let bestSimilarity = 0

    for (const hit of hits) {
      if (hit.info?.title) {
        const similarity = titleSimilarity(searchTitle, hit.info.title)
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity
          bestMatch = hit
        }
      }
    }

    // Require at least 50% similarity for a match
    if (!bestMatch || bestSimilarity < 0.5) {
      return {
        found: false,
        venue: null,
        year: null,
        dblpUrl: null,
      }
    }

    const info = bestMatch.info
    return {
      found: true,
      venue: info.venue || null,
      year: info.year || null,
      dblpUrl: info.url || null,
    }
  }

  /**
   * Query multiple titles in batch with rate limiting
   * 
   * @param titles - Array of paper titles to search
   * @param delayMs - Delay between requests in milliseconds (default: 200ms)
   * @returns Map of title to DblpResult
   */
  async queryBatch(
    titles: string[],
    delayMs: number = 200
  ): Promise<Map<string, DblpResult>> {
    const results = new Map<string, DblpResult>()

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i]
      const result = await this.queryByTitle(title)
      results.set(title, result)

      // Add delay between requests to avoid rate limiting
      if (i < titles.length - 1) {
        await this.delay(delayMs)
      }
    }

    return results
  }

  /**
   * Helper function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clear all DBLP-related cache entries
   */
  clearCache(): void {
    this.cacheManager.clear()
  }
}

// Singleton instance
let serviceInstance: DblpService | null = null

/**
 * Get the singleton DblpService instance
 */
export function getDblpService(): DblpService {
  if (!serviceInstance) {
    serviceInstance = new DblpService()
  }
  return serviceInstance
}

export default getDblpService
